from abc import ABC, abstractmethod

from ..entities.suggestion import SuggestionResult


class ICopilotPort(ABC):
    """Port (interface) that any copilot infrastructure must implement.

    Depends only on domain entities — no framework, no HTTP, no AgentScope.
    """

    @abstractmethod
    async def suggest(
        self,
        session_id: str,
        transcript: str,
        meeting_context: str,
        source_lang: str,
        target_lang: str,
    ) -> SuggestionResult:
        """Generate a copilot suggestion for the given transcript.

        Args:
            session_id: Unique session identifier (used for memory isolation).
            transcript: The raw transcribed text from the conversation.
            meeting_context: Free-text context provided by the user before the session.
            source_lang: BCP-47 code of the speaker's language (e.g. "en-US").
            target_lang: BCP-47 code of the user's language (e.g. "pt-BR").

        Returns:
            SuggestionResult with translation and suggested replies.
        """
