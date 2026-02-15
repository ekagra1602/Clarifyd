from typing import TypedDict, Optional
from langgraph.graph import StateGraph, END
from langchain_core.prompts import ChatPromptTemplate
# from langchain_google_genai import ChatGoogleGenerativeAI
from agent.server import StudentProfile, TranscriptChunk

# Define State
class StudentState(TypedDict):
    profile: StudentProfile
    chunk: TranscriptChunk
    processed_text: str

# Define Nodes
def translate_node(state: StudentState):
    profile = state['profile']
    text = state['processed_text']
    print(f"[AGENT: Student.translate_node] Translating for language: {profile.language}")
    
    if profile.language == 'en':
        return {"processed_text": text}
        
    # Placeholder for actual LLM translation
    # llm = ChatGoogleGenerativeAI(model="gemini-1.5-flash")
    # translation = llm.invoke(...)
    
    translated_text = f"[Translated to {profile.language}] {text}"
    return {"processed_text": translated_text}

def simplify_node(state: StudentState):
    profile = state['profile']
    text = state['processed_text']
    print(f"[AGENT: Student.simplify_node] Checking simplification for disability: {profile.disability}")
    
    if profile.disability != 'auditory':
        return {"processed_text": text}
        
    # Placeholder for actual LLM simplification
    simplified_text = f"[Simplified] {text}"
    return {"processed_text": simplified_text}

# Build Graph
# workflow = StateGraph(StudentState)

# workflow.add_node("translate", translate_node)
# workflow.add_node("simplify", simplify_node)

# workflow.set_entry_point("translate")
# workflow.add_edge("translate", "simplify")
# workflow.add_edge("simplify", END)

# student_graph = workflow.compile()

def process_chunk(profile: StudentProfile, chunk: TranscriptChunk) -> str:
    print(f"[AGENT: Student.process_chunk] Processing chunk: {chunk.text[:50]}...")
    # Manual graph execution for prototype to avoid complex dependency setup if LangGraph fails
    state = {
        "profile": profile,
        "chunk": chunk,
        "processed_text": chunk.text
    }
    
    # Simulate nodes
    state.update(translate_node(state))
    state.update(simplify_node(state))
    
    return state["processed_text"]
