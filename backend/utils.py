"""
Utility functions for document processing and text manipulation.

This module provides utilities for:
- Text extraction from PDF and DOCX files
- Text chunking for document processing
- Colored console logging
"""

import io
from typing import List, Union, BinaryIO

from colorama import Fore, Style, init
from docx import Document
from PyPDF2 import PdfReader

from config import CHUNK_SIZE, CHUNK_OVERLAP
from langdetect import detect_langs, DetectorFactory


# Make results deterministic
DetectorFactory.seed = 0

def detect_language_with_confidence(text: str):

    """
    Detect language(s) using langdetect.

    Returns a list of dicts like:
    [
        {"lang": "en", "prob": 0.93},
        {"lang": "fr", "prob": 0.05}
    ]
    """
    if not text or not text.strip():
        return [{"lang": "en", "prob": 1.0}]

    try:
        detections = detect_langs(text)

        # Convert langdetect objects into plain dicts
        return [
            {"lang": d.lang, "prob": d.prob}
            for d in detections
        ]

    except Exception:
        return [{"lang": "en", "prob": 1.0}]


def green_log(message: str) -> None:
    """
    Print a message in green color to the console.
    
    Args:
        message: The message to print in green color
    """
    print(Fore.GREEN + message + Style.RESET_ALL)


def extract_text_from_pdf(pdf: Union[str, BinaryIO]) -> str:
    """
    Extract all text from a PDF using PyPDF2.
    
    Works on s390x (no C extensions required).
    
    Args:
        pdf: Either a file path (str) or a file-like object (BinaryIO)
             containing the PDF content
    
    Returns:
        str: Extracted text from the PDF, stripped of surrounding whitespace
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


def extract_text_from_doc(doc: bytes) -> str:
    """
    Extract text from a DOCX document.
    
    Args:
        doc: Bytes containing the DOCX document content
    
    Returns:
        str: Extracted text from the document
    """
    doc = Document(io.BytesIO(doc))
    text = "\n".join([para.text for para in doc.paragraphs])
    return text


def chunk_code(
    code_text: str, 
    size: int = CHUNK_SIZE, 
    overlap: int = CHUNK_OVERLAP
) -> List[str]:
    """
    Split source code into overlapping line-based chunks.
    
    Args:
        code_text: Full source code as a single string
        size: Number of lines per chunk (default from config)
        overlap: Number of overlapping lines between consecutive chunks 
                 (default from config)
    
    Returns:
        List[str]: List of code chunks, each as a string
    """
    lines = code_text.split("\n")
    chunks = []
    for i in range(0, len(lines), size - overlap):
        chunk = "\n".join(lines[i:i + size])
        if chunk.strip():
            chunks.append(chunk)
    return chunks