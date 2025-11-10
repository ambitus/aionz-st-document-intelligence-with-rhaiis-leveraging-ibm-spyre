"""
Document ingestion utilities (s390x-compatible).
Handles reading and extracting text from PDFs and text files.

Dependencies:
    - PyPDF2 (pure Python, works on s390x)
"""

import os
from PyPDF2 import PdfReader


def extract_text_from_pdf(pdf_path: str) -> str:
    """
    Extracts all text from a PDF using PyPDF2.
    Works on s390x (no C extensions required).
    """
    text = ""
    try:
        with open(pdf_path, "rb") as f:
            reader = PdfReader(f)
            for page in reader.pages:
                # Extract text safely; handle missing text gracefully
                text += (page.extract_text() or "") + "\n"
    except Exception as e:
        print(f"Failed to extract text from {pdf_path}: {e}")
    return text.strip()


def ingest_from_folder(folder_path: str):
    """
    Scans a folder for PDF or text files and returns structured documents.

    Returns:
        list[dict]: Each entry is
            {
                "path": full file path,
                "content": extracted text,
                "type": "pdf" or "text"
            }
    """
    documents = []

    for filename in os.listdir(folder_path):
        file_path = os.path.join(folder_path, filename)
        if not os.path.isfile(file_path):
            continue

        if filename.lower().endswith(".pdf"):
            print(f"Extracting text from PDF: {filename}")
            content = extract_text_from_pdf(file_path)
            if content:
                documents.append({"path": file_path, "content": content, "type": "pdf"})
            else:
                print(f"No text extracted from {filename} (possibly scanned image).")

        elif filename.lower().endswith(".txt"):
            print(f"Reading text file: {filename}")
            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    content = f.read()
                documents.append({"path": file_path, "content": content, "type": "text"})
            except Exception as e:
                print(f"Failed to read {filename}: {e}")

    print(f"Total documents processed: {len(documents)}")
    return documents
