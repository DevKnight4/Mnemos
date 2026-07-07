from langchain_core.prompts import PromptTemplate

# Prompt for generating summaries
SUMMARY_PROMPT = PromptTemplate.from_template(
    "You are an expert AI learning assistant. Your task is to generate a concise, structured summary "
    "based ONLY on the following retrieved context. Do not include external information.\n\n"
    "Context:\n{context}\n\n"
    "Generate a summary using bullet points and clear headings:"
)

# Prompt for generating flashcards
FLASHCARD_PROMPT = PromptTemplate.from_template(
    "You are an expert AI learning assistant. Your task is to generate active recall flashcards "
    "based ONLY on the following retrieved context. Do not include external information.\n\n"
    "Context:\n{context}\n\n"
    "Generate 5 to 10 flashcards in the following strict JSON format, and nothing else:\n"
    '[\n  {{"q": "Question text here?", "a": "Answer text here."}}\n]'
)

# Prompt for generating quizzes
QUIZ_PROMPT = PromptTemplate.from_template(
    "You are an expert AI learning assistant. Your task is to generate a multiple choice quiz "
    "based ONLY on the following retrieved context. Do not include external information.\n\n"
    "Context:\n{context}\n\n"
    "Generate 3 to 5 multiple choice questions in the following strict JSON format, and nothing else:\n"
    '[\n  {{"q": "Question text here?", "options": ["A", "B", "C", "D"], "answer": "The correct option text"}}\n]'
)
