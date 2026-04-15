import asyncio
import logging
from typing import Dict

from agentscope.model import OpenAIChatModel

from .speakflow_agent import SpeakFlowCopilotAgent

logger = logging.getLogger(__name__)


class SessionRegistry:
    """Manages one SpeakFlowCopilotAgent per active session.

    Single Responsibility: agent lifecycle management.
    Thread-safe: uses asyncio.Lock for concurrent request protection.
    """

    def __init__(self, model: OpenAIChatModel) -> None:
        self._model = model
        self._sessions: Dict[str, SpeakFlowCopilotAgent] = {}
        self._lock = asyncio.Lock()

    async def get_or_create(self, session_id: str) -> SpeakFlowCopilotAgent:
        """Return existing agent or create a new one for the session."""
        async with self._lock:
            if session_id not in self._sessions:
                logger.info("Creating new agent for session=%s", session_id)
                self._sessions[session_id] = SpeakFlowCopilotAgent(
                    session_id=session_id,
                    model=self._model,
                )
            return self._sessions[session_id]

    async def remove(self, session_id: str) -> None:
        """Clear session memory and remove the agent."""
        async with self._lock:
            agent = self._sessions.pop(session_id, None)
            if agent:
                await agent.clear()
                logger.info("Removed agent for session=%s", session_id)

    def active_sessions(self) -> int:
        return len(self._sessions)
