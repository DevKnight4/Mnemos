from langchain_google_genai import GoogleGenerativeAIEmbeddings

class Embedder:
    def __init__(self, model_name: str = "models/text-embedding-004"):
        # We use Google's native Gemini embeddings to offload RAM usage to the cloud.
        # This completely avoids loading heavy PyTorch models on Render's 512MB free tier!
        self.embeddings = GoogleGenerativeAIEmbeddings(model=model_name)

    def get_embedding_model(self):
        return self.embeddings
