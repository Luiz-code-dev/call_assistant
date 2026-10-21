from fastapi import Request

from ..application.use_cases.suggest_use_case import SuggestResponseUseCase
from ..infrastructure.agentscope.session_registry import SessionRegistry


def get_session_registry(request: Request) -> SessionRegistry:
    """Retrieve the singleton SessionRegistry from app state."""
    return request.app.state.session_registry


def get_suggest_use_case(request: Request) -> SuggestResponseUseCase:
    """Retrieve the singleton SuggestResponseUseCase from app state."""
    return request.app.state.suggest_use_case
