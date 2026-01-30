"""
RAG (Retrieval-Augmented Generation) pipeline utilities.

This module provides prompt engineering and construction utilities for
building effective RAG-based question answering systems.
"""

import logging
from typing import List, Optional, Union, Any, Dict

from langchain.schema import Document
from utils import detect_language

# Configure logging
logger = logging.getLogger(__name__)


def build_rag_prompt(question: str, chunks: List[Document], image_context: str = "") -> str:
    """
    Build a prompt for Retrieval-Augmented Generation (RAG).

    Language-aware version supporting:
    - English (default)
    - French
    - Portuguese
    - Hindi
    
    Args:
        question: The user's question
        chunks: Retrieved document chunks
        image_context: Optional context from image search results
    """
    # Validate inputs
    if not question or not question.strip():
        raise ValueError("Question cannot be empty")

    if not chunks and not image_context:
        raise ValueError("No context provided for RAG prompt")
    
    # ---- Combine document context chunks ----
    document_context_parts = []
    for i, doc in enumerate(chunks):
        if hasattr(doc, "page_content") and doc.page_content:
            content = doc.page_content.strip()
            if content:
                document_context_parts.append(content)

    # ---- Combine all context ----
    all_context_parts = []
    
    # Add document context if available
    if document_context_parts:
        document_context = "\n\n---\n\n".join(document_context_parts)
        all_context_parts.append(f"Document Context:\n{document_context}")
    
    # Add image context if available
    if image_context and image_context.strip():
        all_context_parts.append(f"Image Context:\n{image_context.strip()}")
    
    if not all_context_parts:
        raise ValueError("All context chunks are empty or invalid")

    context = "\n\n".join(all_context_parts)

    logger.debug(f"Building RAG prompt for question: '{question[:50]}...'")
    logger.debug(f"Using {len(chunks)} document chunks, image context: {'yes' if image_context else 'no'}")

    # ---- Language detection ----
    language = detect_language(question)

    # ---- Language-specific system instruction ----
    if language == "fr":
        system_instruction = (
            "Tu es un assistant expert.\n"
            "Réponds uniquement en français.\n"
            "Utilise exclusivement les informations fournies dans le contexte.\n"
            "Le contexte inclut des extraits de documents et/ou des descriptions d'images.\n"
            "Si la réponse n'est pas dans le contexte, dis-le clairement."
        )
    elif language == "pt":
        system_instruction = (
            "Você é um assistente especialista.\n"
            "Responda apenas em português.\n"
            "Use exclusivamente as informações fornecidas no contexto.\n"
            "O contexto inclui trechos de documentos e/ou descrições de imagens.\n"
            "Se a resposta não estiver no contexto, diga isso claramente."
        )
    elif language == "hi":
        system_instruction = (
            "आप एक विशेषज्ञ सहायक हैं।\n"
            "केवल हिंदी में उत्तर दें।\n"
            "नीचे दिए गए संदर्भ में उपलब्ध जानकारी का ही उपयोग करें।\n"
            "संदर्भ में दस्तावेज़ अंश और/या छवि विवरण शामिल हैं।\n"
            "यदि उत्तर संदर्भ में नहीं है, तो स्पष्ट रूप से बताएं।"
        )
    else:
        system_instruction = (
            "You are a smart document analyzer.\n"
            "Answer the question using ONLY the Context provided.\n"
            "The context includes document excerpts and/or image descriptions.\n"
            "If the answer is not in the context, say so clearly.\n"
            "When referring to images, mention which image you are referring to."
        )

    # ---- Final prompt ----
    prompt = f"""{system_instruction}

Context:
{context}

Question:
{question}

Answer:"""

    logger.info(
        f"Built RAG prompt: language={language}, "
        f"{len(question)} chars question, "
        f"{len(context)} chars context, "
        f"{len(prompt)} chars total"
    )

    return prompt.strip()


def build_summarize_prompt(doc):
    """
    Build a language-aware prompt for document summarization.
    
    Args:
        doc: A dictionary containing document data. Expected to have a 'content' 
             key with the document text to summarize. The dictionary may contain
             additional metadata (similar to Document objects in `build_rag_prompt`).
    
    Returns:
        str: A formatted prompt string ready for use with a language model.
    """
    language = detect_language(doc["content"][:2000])

    if language == "fr":
        system_instruction = (
            "Tu es un assistant expert.\n"
            "Résume le document ci-dessous uniquement en français.\n"
            "Sois clair, concis et fidèle au contenu.\n"
            "N'ajoute aucune information qui n'est pas présente dans le document."
        )
    elif language == "pt":
        system_instruction = (
            "Você é um assistente especialista.\n"
            "Resuma o documento abaixo apenas em português.\n"
            "Seja claro, concis e fiel ao conteúdo.\n"
            "Não adicione informações que não estejam no documento."
        )
    elif language == "hi":
        system_instruction = (
            "आप एक विशेषज्ञ सहायक हैं।\n"
            "नीचे दिए गए दस्तावेज़ का सारांश केवल हिंदी में प्रस्तुत करें।\n"
            "सार स्पष्ट, संक्षिप्त और दस्तावेज़ की जानकारी पर आधारित होना चाहिए।\n"
            "दस्तावेज़ में न होने वाली कोई जानकारी न जोड़ें।"
        )
    else:
        system_instruction = (
            "You are a smart document analyzer.\n"
            "Summarize the document below clearly and concisely.\n"
            "Do not add information that is not present in the document."
        )

    # -----------------------------
    # Language-aware summarization prompt
    # -----------------------------
    prompt = f"""{system_instruction}

    Document:
    {doc['content'][:16000]}

    Summary:"""

    return prompt


def build_image_only_prompt(question: str, image_context: str) -> str:
    """
    Build a prompt specifically for image-only queries.
    
    Args:
        question: The user's question
        image_context: Context from image search results
        
    Returns:
        str: Formatted prompt string
    """
    if not image_context or not image_context.strip():
        raise ValueError("No image context provided for image-only prompt")
    
    # ---- Language detection ----
    language = detect_language(question)
    
    # ---- Language-specific system instruction ----
    if language == "fr":
        system_instruction = (
            "Tu es un assistant expert qui répond aux questions sur les images.\n"
            "Réponds uniquement en français.\n"
            "Utilise exclusivement les descriptions d'images fournies dans le contexte.\n"
            "Si la réponse n'est pas dans les descriptions d'images, dis-le clairement.\n"
            "Lorsque tu fais référence à des images spécifiques, mentionne de quelle image il s'agit."
        )
    elif language == "pt":
        system_instruction = (
            "Você é um assistente especialista que responde perguntas sobre imagens.\n"
            "Responda apenas em português.\n"
            "Use exclusivamente as descrições de imagens fornecidas no contexto.\n"
            "Se a resposta não estiver nas descrições das imagens, diga isso claramente.\n"
            "Ao se referir a imagens específicas, mencione qual imagem está sendo referida."
        )
    elif language == "hi":
        system_instruction = (
            "आप एक विशेषज्ञ सहायक हैं जो छवियों के बारे में प्रश्नों का उत्तर देते हैं।\n"
            "केवल हिंदी में उत्तर दें।\n"
            "संदर्भ में दी गई छवि विवरणों का ही उपयोग करें।\n"
            "यदि उत्तर छवि विवरणों में नहीं है, तो स्पष्ट रूप से बताएं।\n"
            "विशिष्ट छवियों का उल्लेख करते समय, बताएं कि आप किस छवि का उल्लेख कर रहे हैं।"
        )
    else:
        system_instruction = (
            "You are a smart image analyzer.\n"
            "Answer the question using ONLY the image descriptions provided in the context.\n"
            "If the answer is not in the image descriptions, say so clearly.\n"
            "When referring to specific images, mention which image you are referring to."
        )
    
    # ---- Final prompt ----
    prompt = f"""{system_instruction}

Context:
{image_context}

Question:
{question}

Answer:"""
    
    logger.info(f"Built image-only prompt for language={language}")
    return prompt.strip()


def format_chunks_for_display(chunks: List[Document]) -> str:
    """
    Format document chunks for readable display or logging.
    
    Args:
        chunks: List of Document objects
        
    Returns:
        str: Formatted string showing chunk information
    """
    if not chunks:
        return "No chunks available"
    
    formatted = []
    for i, doc in enumerate(chunks, 1):
        content_preview = doc.page_content[:100] + "..." if len(doc.page_content) > 100 else doc.page_content
        formatted.append(f"Chunk {i}: {content_preview}")
        
        if hasattr(doc, 'metadata') and doc.metadata:
            formatted.append(f"  Metadata: {doc.metadata}")
    
    return "\n".join(formatted)


# Export public API
__all__ = [
    "build_rag_prompt",
    "build_summarize_prompt",
    "build_image_only_prompt",
    "format_chunks_for_display",
]