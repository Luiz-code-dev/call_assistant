import logging
from typing import Any

from agentscope.memory import InMemoryMemory
from agentscope.message import Msg
from agentscope.model import OpenAIChatModel

logger = logging.getLogger(__name__)


def _extract_text_from_response(response: Any) -> str:
    """Extract plain text from an AgentScope ChatResponse."""
    if hasattr(response, "content"):
        parts = []
        for block in response.content:
            if isinstance(block, dict) and block.get("type") == "text":
                parts.append(block.get("text", ""))
        return "".join(parts)
    return str(response)


class SpeakFlowCopilotAgent:
    """AgentScope-backed copilot for a single session.

    Single Responsibility: manages one conversation with memory and an LLM.
    Each session gets its own isolated InMemoryMemory instance.
    """

    def __init__(self, session_id: str, model: OpenAIChatModel) -> None:
        self._session_id = session_id
        self._model = model
        self._memory: InMemoryMemory = InMemoryMemory()

    async def generate(self, transcript: str, system_prompt: str) -> str:
        """Add the transcript to memory, call the model with full history, store reply.

        Args:
            transcript: The new user turn to process.
            system_prompt: Context-aware system prompt built by the adapter.

        Returns:
            Raw text from the model.
        """
        user_msg = Msg(name="user", role="user", content=transcript)
        await self._memory.add(user_msg)

        history = await self._memory.get_memory(prepend_summary=False)

        messages: list[dict] = [{"role": "system", "content": system_prompt}]
        for msg in history:
            text = msg.get_text_content() or ""
            messages.append({"role": msg.role, "content": text})

        response = await self._model(messages)
        text = _extract_text_from_response(response)

        assistant_msg = Msg(name="copilot", role="assistant", content=text)
        await self._memory.add(assistant_msg)

        logger.info(
            "Agent reply — session=%s, history_turns=%d, reply_len=%d",
            self._session_id,
            len(history),
            len(text),
        )
        return text

    async def clear(self) -> None:
        """Clear memory when session ends."""
        await self._memory.clear()
