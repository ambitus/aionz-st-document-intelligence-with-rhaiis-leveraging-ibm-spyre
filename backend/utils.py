from PyPDF2 import PdfReader
from docx import Document
from colorama import Fore, Style, init
import io
from config import CHUNK_SIZE, CHUNK_OVERLAP


def green_log(message: str):
    print(Fore.GREEN + message + Style.RESET_ALL)


def extract_text_from_pdf(pdf: str) -> str:
    """
    Extracts all text from a PDF using PyPDF2.
    Works on s390x (no C extensions required).
    """
    text = ""
    try:
        reader = PdfReader(pdf)
        for page in reader.pages:
            # Extract text safely; handle missing text gracefully
            text += (page.extract_text() or "") + "\n"
    except Exception as e:
        print(f"Failed to extract text from {pdf}: {e}")
    return text.strip()


def extract_text_from_doc(doc):
    ''' 
    Extract text from a doc using 
    '''
    doc = Document(io.BytesIO(doc))
    text = "\n".join([para.text for para in doc.paragraphs])
    return text


def chunk_code(code_text, size=CHUNK_SIZE, overlap=CHUNK_OVERLAP):
    """
    Split source code into overlapping line-based chunks.

    Args:
        code_text (str): Full source code as a single string.
        size (int): Number of lines per chunk.
        overlap (int): Number of overlapping lines between consecutive chunks.

    Returns:
        list[str]: List of code chunks.
    """
    lines = code_text.split("\n")
    chunks = []
    for i in range(0, len(lines), size - overlap):
        chunk = "\n".join(lines[i:i + size])
        if chunk.strip():
            chunks.append(chunk)
    return chunks