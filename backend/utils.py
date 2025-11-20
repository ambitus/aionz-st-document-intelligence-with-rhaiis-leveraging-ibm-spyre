from PyPDF2 import PdfReader
from docx import Document
from colorama import Fore, Style, init
import io


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


def green_log(message: str):
    print(Fore.GREEN + message + Style.RESET_ALL)