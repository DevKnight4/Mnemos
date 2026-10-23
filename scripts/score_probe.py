"""
Calibrate the relevance threshold (MAX_DISTANCE in rag/retrieval/qa_chain.py).

Ingests one document into a THROWAWAY Chroma directory, then prints the best (lowest) distance
for each question. Questions the document can answer should score clearly lower than
questions it cannot. Pick a threshold between the two groups.

Usage (from the repo root):
    venv\\Scripts\\python scripts/score_probe.py path/to/doc.pdf questions.txt

questions.txt format - one question per line, prefixed with:
    + <question>   (answerable from the document)
    - <question>   (NOT answerable / off-topic)
"""
import os
import sys
import shutil
import tempfile
import time
import warnings

warnings.filterwarnings("ignore")
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

from rag.loaders.document_loader import DocumentLoader
from rag.chunking.text_splitter import TextChunker
from rag.embeddings.embedder import Embedder
from rag.vectorstore.chroma_store import ChromaVectorStore


def with_retry(fn, *args, **kwargs):
    """Call fn, waiting and retrying when the Gemini free tier rate limit (429) is hit."""
    for attempt in range(8):
        try:
            return fn(*args, **kwargs)
        except Exception as e:
            if "429" in str(e) or "RESOURCE_EXHAUSTED" in str(e):
                print(f"  rate limit hit, waiting 30s (attempt {attempt + 1}/8)...", flush=True)
                time.sleep(30)
            else:
                raise
    raise RuntimeError("Still rate limited after 8 retries")


def main(doc_path: str, questions_path: str):
    tmp_dir = tempfile.mkdtemp(prefix="mnemos_probe_")
    try:
        store = ChromaVectorStore(embedder=Embedder(), persist_directory=tmp_dir)
        docs = DocumentLoader(temp_dir=tmp_dir).load_document(doc_path, "application/pdf" if doc_path.endswith(".pdf") else "text/plain")
        chunks = TextChunker().split_documents(docs)
        # Index in small batches so a rate limit only retries one batch, not the whole document
        for i in range(0, len(chunks), 20):
            with_retry(store.add_documents, chunks[i:i + 20])
        print(f"Indexed {len(chunks)} chunks from {os.path.basename(doc_path)}\n", flush=True)

        rows = []
        with open(questions_path, encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if len(line) < 3 or line[0] not in "+-":
                    continue
                label, question = line[0], line[1:].strip()
                results = with_retry(store.vectorstore.similarity_search_with_score, question, k=4)
                best = min(score for _, score in results)
                rows.append((label, best, question))

        print(f"{'type':<12}{'best dist':<12}question")
        for label, best, question in sorted(rows, key=lambda r: r[1]):
            kind = "answerable" if label == "+" else "off-topic"
            print(f"{kind:<12}{best:<12.4f}{question}")

        ans = [b for l, b, _ in rows if l == "+"]
        off = [b for l, b, _ in rows if l == "-"]
        if ans and off:
            print(f"\nanswerable: min={min(ans):.4f} max={max(ans):.4f}")
            print(f"off-topic : min={min(off):.4f} max={max(off):.4f}")
            if max(ans) < min(off):
                print(f"Clean gap. A threshold between {max(ans):.4f} and {min(off):.4f} separates them.")
            else:
                print("Groups overlap - choose the threshold that favours refusing less (or add more questions).")
    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print(__doc__)
        sys.exit(1)
    main(sys.argv[1], sys.argv[2])
