from typing import Optional, List
import chromadb
from chromadb.utils import embedding_functions

# Initialize ChromaDB client
try:
    chroma_client = chromadb.Client()
    collection = chroma_client.create_collection(name="course_knowledge")
except Exception as e:
    print(f"ChromaDB initialization failed (likely in-memory for prototype): {e}")
    collection = None

def add_document(doc_id: str, text: str, metadata: dict = None):
    if collection:
        collection.add(
            documents=[text],
            metadatas=[metadata or {}],
            ids=[doc_id]
        )

def query_library(query_text: str, n_results: int = 1) -> Optional[str]:
    if not collection:
        return None
        
    results = collection.query(
        query_texts=[query_text],
        n_results=n_results
    )
    
    if results["documents"] and results["documents"][0]:
        return results["documents"][0][0]
    
    return None

def check_if_asked_before(question_text: str) -> Optional[str]:
    """
    Checks if a similar question exists in the library.
    Returns the answer if found, otherwise None.
    """
    # Threshold based check would go here
    result = query_library(question_text)
    # Placeholder: assume if result exists, it's a match (for prototype)
    return result
