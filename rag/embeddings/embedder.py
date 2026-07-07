from langchain_huggingface import HuggingFaceEmbeddings

class Embedder:
    def __init__(self, model_name: str = "BAAI/bge-small-en-v1.5"):
        # BAAI/bge-small-en-v1.5 is a highly performant embedding model for RAG
        self.embeddings = HuggingFaceEmbeddings(model_name=model_name)

    def get_embedding_model(self):
        return self.embeddings
