"""
RAG (Retrieval-Augmented Generation) pipeline utilities.

This module provides prompt engineering and construction utilities for
building effective RAG-based question answering systems.
"""

import logging
from typing import List, Optional, Union, Any, Dict

from langchain.schema import Document

# Configure logging
logger = logging.getLogger(__name__)


def build_rag_prompt(question: str, chunks: List[Document]) -> str:
    """
    Build a prompt for Retrieval-Augmented Generation (RAG).
    
    Constructs a prompt that combines retrieved document chunks (context)
    with a user question to generate a coherent, context-aware answer.
    
    Args:
        question: User's question to be answered
        chunks: List of Document objects retrieved as context
        
    Returns:
        str: Formatted prompt ready for LLM processing
        
    Example:
        >>> chunks = [Document(page_content="Document chunk 1")]
        >>> prompt = build_rag_prompt("What is RAG?", chunks)
        >>> print(prompt[:50])
        You are a smart document analyzer...
        
    Raises:
        ValueError: If no chunks are provided or question is empty
    """
    # Validate inputs
    if not question or not question.strip():
        raise ValueError("Question cannot be empty")
    
    if not chunks:
        raise ValueError("No context chunks provided for RAG prompt")
    
    logger.debug(f"Building RAG prompt for question: '{question[:50]}...'")
    logger.debug(f"Using {len(chunks)} context chunks")
    
    # Combine all chunks into a single context string
    try:
        context_parts = []
        for i, doc in enumerate(chunks):
            if hasattr(doc, 'page_content') and doc.page_content:
                content = doc.page_content.strip()
                if content:
                    context_parts.append(content)
                else:
                    logger.warning(f"Empty content in chunk {i}")
            else:
                logger.warning(f"Missing page_content in chunk {i}")
        
        if not context_parts:
            raise ValueError("All context chunks are empty or invalid")
        
        context = "\n\n---\n\n".join(context_parts)
        logger.debug(f"Context length: {len(context)} characters")
        
    except Exception as e:
        logger.error(f"Error processing context chunks: {e}")
        raise
    
    # Construct the prompt template
    prompt = f"""You are a smart document analyzer.
Answer the question below using ONLY the Context provided.

Context:
{context}

Question:
{question}

Answer:"""
    
    # Log some statistics
    logger.info(
        f"Built RAG prompt: {len(question)} chars question, "
        f"{len(context)} chars context, {len(prompt)} chars total"
    )
    
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
    "format_chunks_for_display",
]