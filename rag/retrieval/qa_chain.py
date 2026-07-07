from langchain_core.prompts import ChatPromptTemplate
from langchain_google_genai import ChatGoogleGenerativeAI

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
        
    def query(self, user_query: str, document: list[str] = ["all"]):
        # 1. Retrieve documents
        if "all" not in document and len(document) > 0:
            retrieved_docs = self.vectorstore.similarity_search(user_query, k=4, filter={"source": {"$in": document}})
        else:
            retrieved_docs = self.vectorstore.similarity_search(user_query, k=4)
            
        context = "\n\n".join([doc.page_content for doc in retrieved_docs])
        
        # 2. Format prompt
        messages = self.prompt.format_messages(context=context, input=user_query)
        
        # 3. Get LLM response
        response = self.llm.invoke(messages)
        
        # 4. Extract citations
        citations = []
        for doc in retrieved_docs:
            source = doc.metadata.get("source", "Unknown Source")
            if source not in citations:
                citations.append(source)
                
        return {
            "answer": response.content,
            "citations": citations,
            "context_docs": [doc.page_content for doc in retrieved_docs]
        }

    def generate_revision_material(self, topic: str, prompt_template, document: list[str] = ["all"]):
        # We retrieve context based on the topic (or "all" for a general overview)
        query_str = "Summarize the core concepts." if topic == "all" else f"Information about {topic}"
        
        if "all" not in document and len(document) > 0:
            retrieved_docs = self.vectorstore.similarity_search(query_str, k=4, filter={"source": {"$in": document}})
        else:
            retrieved_docs = self.vectorstore.similarity_search(query_str, k=4)
            
        context = "\n\n".join([doc.page_content for doc in retrieved_docs])
        
        prompt = prompt_template.format(context=context)
        response = self.llm.invoke(prompt)
        return response.content
