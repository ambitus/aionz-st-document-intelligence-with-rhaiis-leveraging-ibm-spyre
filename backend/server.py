from fastapi import FastAPI, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from typing import List

from mongo_utils import ingest_document_in_mongodb
from opensearch_utils import get_retriever_os
from rag import build_rag_prompt
from rhaiis_utils import call_rhaiis_model
from utils import extract_text_from_pdf, extract_text_from_doc, green_log

# ----------------------------
# API SERVER
# ----------------------------

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/upload-files")
async def upload_files(files: List[UploadFile] = File(...), user_id:str = Form(...)):
    docs=[]
    for file in files:
        if file.filename.endswith(".pdf"):
            file_content = extract_text_from_pdf(file.file)
        elif file.filename.endswith(".docx"):
            file_bytes = await file.read()
            file_content = extract_text_from_doc(file_bytes)
        elif file.filename.endswith(".txt"):
            file_content = file.file.read()
        else:
            return {"File not in one of the supported formats (pdf, docx, txt). Please upload a valid file"}

        docs.append({"filename": file.filename, "text": str(file_content)})

    doc_summarized=ingest_document_in_mongodb(docs,user_id)
    
    return doc_summarized


@app.post("/ask-query")
async def ask_query(query: str = Form(...), user_id: str = Form(...)):
    collection_name = f"user_{user_id}"

    retriever = get_retriever_os(collection_name)
    retrieved_chunks = retriever.get_relevant_documents(query)[:5]

    prompt = build_rag_prompt(query, retrieved_chunks)
    print("\nPrompt to send to LLM:\n")
    print(prompt)

    # --- CALL YOUR LLM HERE ---
    response = call_rhaiis_model(prompt, stream=True)

    # If streaming → wrap in StreamingResponse (SSE)
    if hasattr(response, "__iter__") and not isinstance(response, dict):
        return StreamingResponse(response, media_type="text/event-stream")

    # If not streaming → normal JSON response
    return response