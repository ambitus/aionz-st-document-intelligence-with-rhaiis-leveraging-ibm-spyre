# ----------------------------
# RAG pipeline
# ----------------------------


def build_rag_prompt(question: str, chunks):
    context = "\n\n---\n\n".join(doc.page_content for doc in chunks)

    prompt = f"""
    You are a smart document analyzer.
    Answer the question below using Context provided.

    Context:
    {context}

    Question:
    {question}

    Answer:
    """
    return prompt.strip()
