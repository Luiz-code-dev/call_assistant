import logging
from fastapi import APIRouter, Depends, HTTPException, status

from ..schemas.suggest_schema import SuggestRequest, SuggestResponse, SessionEndRequest
from ..dependencies import get_suggest_use_case, get_session_registry
from ...application.use_cases.suggest_use_case import SuggestResponseUseCase
from ...infrastructure.agentscope.session_registry import SessionRegistry

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/copilot", tags=["copilot"])


@router.post("/suggest", response_model=SuggestResponse, status_code=status.HTTP_200_OK)
async def suggest(
    request: SuggestRequest,
    use_case: SuggestResponseUseCase = Depends(get_suggest_use_case),
) -> SuggestResponse:
    """Generate a copilot suggestion for a real-time conversation transcript."""
    result = await use_case.execute(
        session_id=request.session_id,
        transcript=request.transcript,
        meeting_context=request.meeting_context or "",
        source_lang=request.source_lang or "en-US",
        target_lang=request.target_lang or "pt-BR",
    )
    if result is None:
        raise HTTPException(status_code=status.HTTP_204_NO_CONTENT)

    return SuggestResponse(
        session_id=result.session_id,
        translation=result.translation,
        suggestions=result.suggestions,
        suggestion_translations=result.suggestion_translations,
    )


@router.post("/session/end", status_code=status.HTTP_204_NO_CONTENT)
async def end_session(
    request: SessionEndRequest,
    registry: SessionRegistry = Depends(get_session_registry),
) -> None:
    """Clear session memory when a session ends."""
    await registry.remove(request.session_id)
    logger.info("Session ended — session=%s", request.session_id)
