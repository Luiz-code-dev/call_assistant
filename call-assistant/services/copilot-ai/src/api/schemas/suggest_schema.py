from typing import List, Optional
from pydantic import BaseModel, Field


class SuggestRequest(BaseModel):
    session_id: str = Field(..., description="Unique session identifier")
    transcript: str = Field(..., description="Transcribed text from the conversation")
    meeting_context: Optional[str] = Field(default="", description="Context provided before the session")
    source_lang: Optional[str] = Field(default="en-US", description="BCP-47 source language code")
    target_lang: Optional[str] = Field(default="pt-BR", description="BCP-47 target language code")


class SuggestResponse(BaseModel):
    session_id: str
    translation: str
    suggestions: List[str]
    suggestion_translations: List[str]


class SessionEndRequest(BaseModel):
    session_id: str
