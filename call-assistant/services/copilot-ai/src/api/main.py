import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from agentscope.model import OpenAIChatModel

from .routers.copilot_router import router as copilot_router
from ..application.use_cases.suggest_use_case import SuggestResponseUseCase
from ..infrastructure.agentscope.session_registry import SessionRegistry
from ..infrastructure.agentscope.agentscope_copilot_adapter import AgentScopeCopilotAdapter

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
)
logger = logging.getLogger(__name__)


def _build_model() -> OpenAIChatModel:
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        raise EnvironmentError("OPENAI_API_KEY environment variable is required")

    model_name = os.environ.get("COPILOT_MODEL", "gpt-4o-mini")

    return OpenAIChatModel(
        model_name=model_name,
        api_key=api_key,
        stream=False,
        generate_kwargs={"temperature": 0.7},
    )


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting copilot-ai service...")
    model = _build_model()
    registry = SessionRegistry(model=model)
    adapter = AgentScopeCopilotAdapter(registry=registry)
    use_case = SuggestResponseUseCase(copilot=adapter)

    app.state.session_registry = registry
    app.state.suggest_use_case = use_case

    logger.info("copilot-ai service ready (model=%s)", model.model_name)
    yield

    logger.info("Shutting down copilot-ai service — active sessions: %d", registry.active_sessions())


app = FastAPI(
    title="SpeakFlow Copilot AI",
    description="Multi-agent copilot microservice powered by AgentScope",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)

app.include_router(copilot_router)


@app.get("/health")
async def health():
    return {"status": "ok", "active_sessions": app.state.session_registry.active_sessions()}
