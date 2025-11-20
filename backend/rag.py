# ----------------------------
# RAG pipeline
# ----------------------------

def build_rag_prompt(question: str, chunks):
    context = "\n\n---\n\n".join(doc.page_content for doc in chunks)

    prompt = f"""
    You are an AI assistant that answers questions using the Context provided.
    Answer only to the question asked.

    Rules:
    - Answer **only the user's question**.
    - Use **only** the information from the context.
    - Do **not** generate additional questions or answers.

    Context:
    {context}

    Question:
    {question}

    Answer:
    """
    return prompt.strip()