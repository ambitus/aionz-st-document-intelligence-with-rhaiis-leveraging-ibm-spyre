# ----------------------------
# RAG pipeline
# ----------------------------

from rhaiis_utils import call_rhaiis_model_without_streaming, call_rhaiis_model

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


def summarize(doc_content):
    try:
        prompt = f""" 
        Summarize the following document
        
        Document:
        {doc_content}
        """
        response = call_rhaiis_model(prompt)
        return response
    except:
        return "Error in document summarization"
