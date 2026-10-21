import logging
import re
from typing import List, Tuple

from ...domain.entities.suggestion import SuggestionResult
from ...domain.ports.copilot_port import ICopilotPort
from .session_registry import SessionRegistry

logger = logging.getLogger(__name__)

_SUGGESTIONS_MARKER = "RESPOSTAS SUGERIDAS:"


def _build_system_prompt(meeting_context: str, source_lang: str, target_lang: str) -> str:
    context_line = (
        f"Contexto da reunião: {meeting_context}"
        if meeting_context.strip()
        else "Esta é uma conversa geral. Mantenha as respostas naturais e conversacionais."
    )
    return f"""Você é um assistente de chamadas em tempo real para um usuário brasileiro em uma conversa em inglês.
Dado o trecho transcrito, você deve:
1. Traduzir de {source_lang} para {target_lang}.
2. Sugerir 3 possíveis respostas que o usuário poderia dar, escritas em inglês.
   IMPORTANTE: Adapte o tom e o estilo ao contexto da conversa. NÃO use estilo formal de entrevista a menos que o contexto mencione explicitamente uma entrevista.
3. Para cada resposta, forneça também uma tradução em Português (Brasil).
{context_line}

Responda EXATAMENTE neste formato (sem texto extra antes ou depois):
<tradução pt-BR do trecho>
RESPOSTAS SUGERIDAS:
1. Curta: <resposta curta em inglês>
   PT: <tradução em português da resposta curta>
2. Profissional: <resposta profissional em inglês>
   PT: <tradução em português da resposta profissional>
3. Detalhada: <resposta detalhada em inglês>
   PT: <tradução em português da resposta detalhada>"""


def _parse_output(session_id: str, raw: str) -> SuggestionResult:
    """Parse model output into structured SuggestionResult."""
    marker_idx = raw.find(_SUGGESTIONS_MARKER)
    if marker_idx < 0:
        return SuggestionResult(
            session_id=session_id,
            translation=raw.strip(),
            suggestions=[],
            suggestion_translations=[],
        )

    translation = raw[:marker_idx].strip()
    suggestions_block = raw[marker_idx + len(_SUGGESTIONS_MARKER):]
    suggestions: List[str] = []
    suggestion_translations: List[str] = []
    pending_en: str | None = None

    for line in suggestions_block.split("\n"):
        trimmed = line.strip()
        if re.match(r"^\d+\.", trimmed):
            if pending_en is not None:
                suggestions.append(pending_en)
                suggestion_translations.append("")
            pending_en = re.sub(r"^\d+\.\s*[^:]+:\s*", "", trimmed).strip()
        elif trimmed.startswith("PT:") and pending_en is not None:
            suggestions.append(pending_en)
            suggestion_translations.append(trimmed[3:].strip())
            pending_en = None

    if pending_en is not None:
        suggestions.append(pending_en)
        suggestion_translations.append("")

    return SuggestionResult(
        session_id=session_id,
        translation=translation,
        suggestions=suggestions,
        suggestion_translations=suggestion_translations,
    )


class AgentScopeCopilotAdapter(ICopilotPort):
    """Implements ICopilotPort using AgentScope agents with per-session memory.

    Liskov: fully substitutable for ICopilotPort.
    Open/Closed: prompt strategy or parser can be replaced without changing this class.
    """

    def __init__(self, registry: SessionRegistry) -> None:
        self._registry = registry

    async def suggest(
        self,
        session_id: str,
        transcript: str,
        meeting_context: str,
        source_lang: str,
        target_lang: str,
    ) -> SuggestionResult:
        agent = await self._registry.get_or_create(session_id)
        system_prompt = _build_system_prompt(meeting_context, source_lang, target_lang)

        try:
            raw = await agent.generate(transcript=transcript, system_prompt=system_prompt)
            result = _parse_output(session_id, raw)
            logger.info(
                "Suggestion ready — session=%s, suggestions=%d",
                session_id,
                len(result.suggestions),
            )
            return result
        except Exception as exc:
            logger.error("Suggestion failed — session=%s: %s", session_id, exc, exc_info=True)
            raise
