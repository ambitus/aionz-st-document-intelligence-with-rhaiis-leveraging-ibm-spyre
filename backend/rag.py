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
    - German
    - Italian
    - Greek
    
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
    elif language == "de":
        system_instruction = (
           "Sie sind ein erfahrener Assistent.\n"
            "Antworten Sie ausschließlich auf Deutsch.\n"
            "Verwenden Sie nur die Informationen, die im untenstehenden Kontext verfügbar sind.\n"
            "Der Kontext umfasst Dokumentenauszüge und/oder Bildbeschreibungen.\n"
            "Sollte die Antwort nicht im Kontext enthalten sein, geben Sie dies deutlich an.\n"
        )
    elif language == "it":
        system_instruction = (
            "Sei un assistente esperto.\n"
            "Rispondi solo in italiano.\n"
            "Utilizza esclusivamente le informazioni disponibili nel contesto fornito di seguito.\n"
            "Il contesto include estratti di documenti e/o descrizioni di immagini.\n"
            "Se la risposta non è presente nel contesto, indicalo chiaramente.\n"
        )
    elif language == "el":
        system_instruction = (
            "Είστε ειδικός βοηθός.\n"
            "Απαντήστε μόνο στα Ελληνικά.\n"
            "Χρησιμοποιήστε μόνο τις πληροφορίες που είναι διαθέσιμες στο παρακάτω πλαίσιο.\n"
            "Το πλαίσιο περιλαμβάνει αποσπάσματα εγγράφων ή/και περιγραφές εικόνων.\n"
            "Εάν η απάντηση δεν περιλαμβάνεται στο πλαίσιο, δηλώστε το σαφώς.\n"
        )
    else:
        system_instruction = (
            "You are a smart document analyzer.\n"
            "Answer the question using ONLY the Context provided.\n"
            "The context includes document excerpts and/or image descriptions.\n"
            "If the answer is not in the context, say so clearly.\n"
            "When referring to images, mention which image you are referring to.\n"
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
    elif language == "de":
        system_instruction = (
            "Sie sind ein kompetenter Assistent.\n"
            "Fassen Sie das untenstehende Dokument ausschließlich auf Deutsch zusammen.\n"
            "Formulieren Sie klar, prägnant und inhaltlich getreu.\n"
            "Fügen Sie keine Informationen hinzu, die nicht im Dokument enthalten sind.\n"
        )
    elif language == "it":
        system_instruction = (
            "Sei un assistente esperto.\n"
            "Riassumi il documento seguente esclusivamente in italiano.\n"
            "Sii chiaro, conciso e fedele al contenuto.\n"
            "Non aggiungere informazioni non presenti nel documento.\n"
        )
    elif language == "el":
        system_instruction = (
            "Είστε ένας έμπειρος βοηθός.\n"
            "Συνοψίστε το παρακάτω έγγραφο μόνο στα Ελληνικά.\n"
            "Να είστε σαφής, συνοπτικός και πιστός στο περιεχόμενο.\n"
            "Μην προσθέτετε πληροφορίες που δεν υπάρχουν στο έγγραφο.\n"
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
    elif language == "de":
        system_instruction = (
           "Sie sind ein Fachassistent, der Fragen zu Bildern beantwortet.\n"
           "Bitte antworten Sie nur auf Deutsch.\n"
           "Verwenden Sie ausschließlich die im Kontext bereitgestellten Bildbeschreibungen.\n"
           "Falls die Antwort nicht in den Bildbeschreibungen enthalten ist, geben Sie dies bitte deutlich an.\n"
           "Wenn Sie sich auf bestimmte Bilder beziehen, nennen Sie bitte das jeweilige Bild.\n"
        )
    elif language == "it":
        system_instruction = (
           "Sei un assistente qualificato che risponde a domande sulle immagini.\n"
            "Rispondi solo in italiano.\n"
            "Utilizza solo le descrizioni delle immagini fornite nel contesto.\n"
            "Se la risposta non è presente nelle descrizioni delle immagini, indicalo chiaramente.\n"
            "Quando fai riferimento a immagini specifiche, indica a quale immagine ti riferisci.\n"
        )
    elif language == "el":
        system_instruction = (
            "Είστε ένας εξειδικευμένος βοηθός που απαντά σε ερωτήσεις σχετικά με εικόνες.\n"
            "Απαντήστε μόνο στα Ελληνικά.\n"
            "Χρησιμοποιήστε μόνο τις περιγραφές εικόνων που παρέχονται στα συμφραζόμενα.\n"
            "Εάν η απάντηση δεν περιλαμβάνεται στις περιγραφές εικόνων, δηλώστε το με σαφήνεια.\n"
            "Όταν αναφέρεστε σε συγκεκριμένες εικόνες, υποδείξτε σε ποια εικόνα γίνεται αναφορά.\n"
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