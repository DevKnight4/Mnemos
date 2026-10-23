from operator import itemgetter

from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnableBranch, RunnableLambda, RunnablePassthrough
from langchain_google_genai import ChatGoogleGenerativeAI

REFUSAL_MESSAGE = "I cannot answer this based on the provided documents."

# Maximum vector distance for a chunk to count as relevant (Chroma returns a distance: LOWER = MORE similar).
# Calibrated with scripts/score_probe.py on a 41-page OS notes PDF (87 chunks, 1000/200 chunking, Gemini embeddings):
#   answerable questions scored 0.32-0.57 (one short query, "round robin", scored 0.84)
#   off-topic questions scored 0.63-1.02
# 0.6 sits in the gap between the two groups. Re-calibrate if the embedding model or chunk size changes.
MAX_DISTANCE = 0.6

def format_docs(docs) -> str:
    """Join retrieved chunks into one context string for the prompt."""
    return "\n\n".join(doc.page_content for doc in docs)

class QAPipeline:
    def __init__(self, vectorstore, llm_model="gemini-2.5-flash"):
        # Uses the Gemini API for generative tasks
        self.llm = ChatGoogleGenerativeAI(model=llm_model, temperature=0.1)
        self.vectorstore = vectorstore
        
        # System prompt that enforces strict grounding and source citations
        system_prompt = (
            "You are Mnemos, an AI-powered personal knowledge companion. "
            "Use the following pieces of retrieved context to answer the question. "
            "If the answer is not in the context, say 'I cannot answer this based on the provided documents.' "
            "Do NOT hallucinate. "
            "For every piece of information you provide, you MUST include a citation "
            "referencing the source document name. \n\n"
            "Context: {context}"
        )
        
        self.prompt = ChatPromptTemplate.from_messages([
            ("system", system_prompt),
            ("human", "{input}"),
        ])

        # LCEL chain: format the context -> fill the prompt -> call Gemini -> parse to a plain string
        answer_chain = (
            {"context": lambda x: format_docs(x["docs"]), "input": itemgetter("input")}
            | self.prompt
            | self.llm
            | StrOutputParser()
        )

        # Full RAG chain. Input: {"input": question, "document": [selected sources]}
        #   step 1: retrieve relevant chunks and add them to the dict under "docs"
        #   step 2: if no chunk passed the relevance threshold -> refuse (no LLM call), else run answer_chain
        self.rag_chain = (
            RunnablePassthrough.assign(docs=RunnableLambda(self._retrieve_relevant))
            | RunnablePassthrough.assign(
                answer=RunnableBranch(
                    (lambda x: not x["docs"], RunnableLambda(lambda _: REFUSAL_MESSAGE)),
                    answer_chain,
                )
            )
        )

    async def _search_with_scores(self, query: str, document: list[str], k: int = 4):
        """Vector search returning (Document, distance) pairs. Lower distance = more similar."""
        if "all" not in document and len(document) > 0:
            return await self.vectorstore.asimilarity_search_with_score(query, k=k, filter={"source": {"$in": document}})
        return await self.vectorstore.asimilarity_search_with_score(query, k=k)

    async def _retrieve_relevant(self, inputs: dict):
        """Retriever step of the chain: top-k search, then drop chunks that are not relevant enough."""
        scored_docs = await self._search_with_scores(inputs["input"], inputs["document"])
        return [doc for doc, score in scored_docs if score <= MAX_DISTANCE]

    async def query(self, user_query: str, document: list[str] = ["all"]):
        result = await self.rag_chain.ainvoke({"input": user_query, "document": document})
        retrieved_docs = result["docs"]

        # Extract citations (source file + page number where available, de-duplicated)
        citations = []
        for doc in retrieved_docs:
            citation = {"source": doc.metadata.get("source", "Unknown Source")}
            page = doc.metadata.get("page")
            if isinstance(page, int):
                citation["page"] = page + 1  # PyPDF pages are 0-indexed; show 1-indexed to users
            if citation not in citations:
                citations.append(citation)

        return {
            "answer": result["answer"],
            "citations": citations,
            "context_docs": [doc.page_content for doc in retrieved_docs]
        }

    async def generate_revision_material(self, topic: str, prompt_template, document: list[str] = ["all"]):
        # We retrieve context based on the topic (or "all" for a general overview)
        query_str = "Summarize the core concepts." if topic == "all" else f"Information about {topic}"

        # No relevance threshold here: generic queries like "summarize" always have a larger distance
        scored_docs = await self._search_with_scores(query_str, document)
        context = format_docs([doc for doc, _ in scored_docs])

        # LCEL chain: prompt template -> Gemini -> plain string
        chain = prompt_template | self.llm | StrOutputParser()
        return await chain.ainvoke({"context": context})
