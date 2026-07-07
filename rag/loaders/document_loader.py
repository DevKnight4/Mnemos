import os
from langchain_community.document_loaders import PyPDFLoader, TextLoader
from langchain_core.documents import Document

class DocumentLoader:
    def __init__(self, temp_dir: str = "temp_uploads"):
        self.temp_dir = temp_dir
        os.makedirs(self.temp_dir, exist_ok=True)
    
    def load_document(self, file_path: str, file_type: str) -> list[Document]:
        if file_type == "application/pdf" or file_path.endswith('.pdf'):
            loader = PyPDFLoader(file_path)
        elif file_type == "text/plain" or file_path.endswith('.txt'):
            loader = TextLoader(file_path)
        elif file_type == "text/markdown" or file_path.endswith('.md'):
            loader = TextLoader(file_path, encoding='utf-8')
        else:
            raise ValueError(f"Unsupported file type: {file_type}")
        
        docs = loader.load()
        # Add basic metadata if needed
        for doc in docs:
            doc.metadata['source'] = os.path.basename(file_path)
            
        return docs
