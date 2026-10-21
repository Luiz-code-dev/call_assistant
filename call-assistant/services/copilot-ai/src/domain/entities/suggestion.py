from dataclasses import dataclass, field
from typing import List


@dataclass(frozen=True)
class SuggestionResult:
    """Immutable value object representing a copilot suggestion."""

    session_id: str
    translation: str
    suggestions: List[str] = field(default_factory=list)
    suggestion_translations: List[str] = field(default_factory=list)
