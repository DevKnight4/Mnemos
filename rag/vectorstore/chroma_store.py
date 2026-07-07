from langchain_chroma import Chroma
from langchain_core.documents import Document
from typing import List

class ChromaVectorStore:
    def __init__(self, embedder, persist_directory: str = "./vectorstore_db"):
        self.persist_directory = persist_directory
        self.embedder = embedder.get_embedding_model()
        self.vectorstore = Chroma(
            collection_name="mnemos_knowledge_base",
            embedding_function=self.embedder,
            persist_directory=self.persist_directory
        )

    def add_documents(self, documents: List[Document]):
        self.vectorstore.add_documents(documents)

    def get_retriever(self, search_kwargs={"k": 4}):
        return self.vectorstore.as_retriever(search_kwargs=search_kwargs)
