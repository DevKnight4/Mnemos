import os
import json
import tempfile
from fastapi import FastAPI, UploadFile, File, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from dotenv import load_dotenv

from rag.loaders.document_loader import DocumentLoader
from rag.chunking.text_splitter import TextChunker
from rag.embeddings.embedder import Embedder
from rag.vectorstore.chroma_store import ChromaVectorStore
from rag.retrieval.qa_chain import QAPipeline

# Load environment variables
load_dotenv()

app = FastAPI(title="Mnemos API", description="MVP Backend for Mnemos Study Hub")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global variables for RAG components
document_loader = None
text_chunker = None
embedder = None
vector_store = None
qa_pipeline = None

@app.on_event("startup")
async def startup_event():
    global document_loader, text_chunker, embedder, vector_store, qa_pipeline
    print("Initializing RAG Pipeline...")
    document_loader = DocumentLoader()
    text_chunker = TextChunker()
    embedder = Embedder()
    vector_store = ChromaVectorStore(embedder=embedder)
    # Pass vectorstore directly for filtering capabilities
    qa_pipeline = QAPipeline(vectorstore=vector_store.vectorstore)
    print("RAG Pipeline Initialized.")

def raise_provider_error(e: Exception):
    """Map failures from the Gemini API (LLM / embeddings) to proper HTTP status codes."""
    msg = str(e)
    if "429" in msg or "RESOURCE_EXHAUSTED" in msg or "quota" in msg.lower():
        raise HTTPException(status_code=429, detail="Gemini API rate limit or quota reached. Please try again shortly.")
    raise HTTPException(status_code=502, detail=f"Upstream AI service error: {msg}")

def parse_llm_json(content: str):
    """Parse JSON returned by the LLM (strips markdown fences). Raises 502 if the format is invalid."""
    try:
        return json.loads(content.replace('```json', '').replace('```', '').strip())
    except json.JSONDecodeError:
        raise HTTPException(status_code=502, detail="The AI returned an invalid format. Please try again.")

@app.get("/")
def read_root():
    return {"message": "Mnemos Backend API is running"}

@app.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    if not document_loader:
        raise HTTPException(status_code=500, detail="RAG pipeline not initialized")
    
    # Strip any directory components from the client-supplied filename (prevents path traversal like "../../x")
    safe_name = os.path.basename((file.filename or "").replace("\\", "/"))
    if not safe_name:
        raise HTTPException(status_code=400, detail="Invalid filename")

    # Save uploaded file to temp directory
    temp_path = os.path.join(document_loader.temp_dir, safe_name)
    try:
        with open(temp_path, "wb") as f:
            f.write(await file.read())
            
        # 1. Load document
        docs = document_loader.load_document(temp_path, file.content_type)
        
        # 2. Chunk text
        chunks = text_chunker.split_documents(docs)
        
        # 3. Add to vector store
        vector_store.add_documents(chunks)
        
        return {"status": "success", "filename": safe_name, "chunks_indexed": len(chunks)}
    except ValueError as e:
        # Unsupported file type
        raise HTTPException(status_code=415, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        raise_provider_error(e)
    finally:
        # Always clean up the temp file, even if indexing failed
        if os.path.exists(temp_path):
            os.remove(temp_path)

@app.get("/documents")
async def get_documents():
    if not vector_store:
        raise HTTPException(status_code=500, detail="Vector store not initialized")
    
    try:
        # Retrieve all metadata from Chroma
        collection_data = vector_store.vectorstore.get(include=["metadatas"])
        
        sources = set()
        for meta in collection_data.get("metadatas", []):
            if meta and "source" in meta:
                sources.add(meta["source"])
                
        return {"documents": list(sources)}
    except Exception as e:
        return {"documents": []}

@app.post("/query")
async def query_knowledge_base(query: str, document: list[str] = Query(default=["all"])):
    if not qa_pipeline:
        raise HTTPException(status_code=500, detail="RAG pipeline not initialized")
    
    try:
        response = qa_pipeline.query(query, document)
        return response
    except HTTPException:
        raise
    except Exception as e:
        raise_provider_error(e)

from rag.prompts.templates import SUMMARY_PROMPT, FLASHCARD_PROMPT, QUIZ_PROMPT

@app.post("/generate-summary")
async def generate_summary(topic: str = "all", document: list[str] = Query(default=["all"])):
    if not qa_pipeline:
        raise HTTPException(status_code=500, detail="RAG pipeline not initialized")
    try:
        content = qa_pipeline.generate_revision_material(topic, SUMMARY_PROMPT, document)
        return {"summary": content}
    except HTTPException:
        raise
    except Exception as e:
        raise_provider_error(e)

@app.post("/generate-flashcards")
async def generate_flashcards(topic: str = "all", document: list[str] = Query(default=["all"])):
    if not qa_pipeline:
        raise HTTPException(status_code=500, detail="RAG pipeline not initialized")
    try:
        content = qa_pipeline.generate_revision_material(topic, FLASHCARD_PROMPT, document)
        return {"flashcards": parse_llm_json(content)}
    except HTTPException:
        raise
    except Exception as e:
        raise_provider_error(e)

@app.post("/generate-quiz")
async def generate_quiz(topic: str = "all", document: list[str] = Query(default=["all"])):
    if not qa_pipeline:
        raise HTTPException(status_code=500, detail="RAG pipeline not initialized")
    try:
        content = qa_pipeline.generate_revision_material(topic, QUIZ_PROMPT, document)
        return {"quiz": parse_llm_json(content)}
    except HTTPException:
        raise
    except Exception as e:
        raise_provider_error(e)

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
