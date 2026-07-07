from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.documents import Document

class TextChunker:
    def __init__(self, chunk_size: int = 1000, chunk_overlap: int = 200):
        self.splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            length_function=len,
            is_separator_regex=False,
        )

    def split_documents(self, documents: list[Document]) -> list[Document]:
        return self.splitter.split_documents(documents)
