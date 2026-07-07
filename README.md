# 🧠 Mnemos

> **A Retrieval-Augmented Generation (RAG) application for querying and revising study material using AI.**

Mnemos is a personal knowledge assistant built using **React, FastAPI, LangChain, Gemini, and ChromaDB**.

It allows users to upload study resources such as PDFs, lecture notes, markdown files, and text documents, then ask questions in natural language. Instead of relying solely on the LLM, Mnemos retrieves relevant context from the uploaded documents before generating responses, making answers more grounded and reducing hallucinations.

Apart from question answering, it can also generate **summaries, flashcards, and quizzes** to help with revision.

🌐 **Live Demo:** https://mnemos-tau.vercel.app/

---

## ✨ Features

📄 Upload PDFs, Markdown files, and text documents

🔍 Semantic search using vector embeddings

🧠 Retrieval-Augmented Generation (RAG)

📌 Grounded responses with source citations

📝 AI-generated summaries

🃏 Flashcard generation

❓ Quiz generation

💬 Conversational chat interface

---

## 🛠️ Tech Stack

| Category | Technologies |
|----------|--------------|
| Frontend | React, Tailwind CSS |
| Backend | FastAPI |
| LLM | Gemini API |
| AI Framework | LangChain |
| Embeddings | Google Gemini API (Text Embeddings) |
| Vector Database | ChromaDB |
| Deployment | Vercel + Render |

---

## 🔄 RAG Pipeline

```text
          📄 Documents
                │
                ▼
        Document Loading
                │
                ▼
         Text Chunking
                │
                ▼
     Embedding Generation
                │
                ▼
           ChromaDB
                │
                ▼
      Similarity Retriever
                │
                ▼
        Retrieved Context
                │
         + User Query
                │
                ▼
          Gemini LLM
                │
                ▼
      💡 Grounded Response
          📌 Citations
```

---

## 📂 Project Structure

```text
Mnemos/
├── frontend/
├── backend/
├── rag/
│   ├── loaders/
│   ├── chunking/
│   ├── embeddings/
│   ├── prompts/
│   ├── retrieval/
│   └── vectorstore/
├── docs/
└── README.md
```

---

## 🚀 Running Locally

### Clone the repository

```bash
git clone https://github.com/DevKnight4/Mnemos.git
cd Mnemos
```

### Backend

```bash
cd backend

python -m venv venv

# Windows
venv\Scripts\activate

# Linux / macOS
source venv/bin/activate

pip install -r requirements.txt

uvicorn main:app --reload
```

### Frontend

```bash
cd frontend

npm install
npm run dev
```
