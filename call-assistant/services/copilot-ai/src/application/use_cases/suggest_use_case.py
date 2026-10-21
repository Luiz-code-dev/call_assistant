import logging
from typing import Optional

from ...domain.entities.suggestion import SuggestionResult
from ...domain.ports.copilot_port import ICopilotPort

logger = logging.getLogger(__name__)


class SuggestResponseUseCase:
    """Orchestrates the copilot suggestion flow.

    Single Responsibility: validate input and delegate to the port.
    Open/Closed: extend behaviour by swapping the ICopilotPort implementation.
    Dependency Inversion: depends on ICopilotPort abstraction, not AgentScope.
    """

    def __init__(self, copilot: ICopilotPort) -> None:
        self._copilot = copilot

    async def execute(
        self,
        session_id: str,
        transcript: str,
        meeting_context: str = "",
        source_lang: str = "en-US",
        target_lang: str = "pt-BR",
    ) -> Optional[SuggestionResult]:
        if not transcript or not transcript.strip():
            logger.debug("Empty transcript — skipping suggestion for session=%s", session_id)
            return None

        logger.info("Generating suggestion — session=%s, transcript_len=%d", session_id, len(transcript))
        return await self._copilot.suggest(
            session_id=session_id,
            transcript=transcript.strip(),
            meeting_context=meeting_context or "",
            source_lang=source_lang,
            target_lang=target_lang,
        )
