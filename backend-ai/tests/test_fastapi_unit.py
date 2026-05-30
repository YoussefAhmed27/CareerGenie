import os
import sys
import types
import importlib
from pathlib import Path
from unittest.mock import MagicMock

import pytest
from pydantic import ValidationError


# ============================================================
# Add backend-ai root to Python import path
# ============================================================
BACKEND_AI_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_AI_ROOT))


# ============================================================
# Required env vars for main.py import
# ============================================================
os.environ.setdefault("GROQ_API_KEY", "test-groq-key")
os.environ.setdefault("GEMINI_API_KEY", "test-gemini-key")
os.environ.setdefault("DEEPGRAM_API_KEY", "test-deepgram-key")
os.environ.setdefault("DO_SPACES_ENDPOINT", "https://fra1.digitaloceanspaces.com")
os.environ.setdefault("DO_SPACES_KEY", "test-spaces-key")
os.environ.setdefault("DO_SPACES_SECRET", "test-spaces-secret")
os.environ.setdefault("DO_SPACES_BUCKET", "test-bucket")


# ============================================================
# Mock helper
# ============================================================
def mock_module(name):
    module = types.ModuleType(name)
    sys.modules[name] = module
    return module


# ============================================================
# Mock FastAPI and related modules
# ============================================================
fastapi_module = mock_module("fastapi")


class MockHTTPException(Exception):
    def __init__(self, status_code=500, detail=None):
        super().__init__(detail)
        self.status_code = status_code
        self.detail = detail


class MockFastAPI:
    def __init__(self, *args, **kwargs):
        pass

    def add_middleware(self, *args, **kwargs):
        return None

    def post(self, *args, **kwargs):
        def decorator(func):
            return func
        return decorator

    def get(self, *args, **kwargs):
        def decorator(func):
            return func
        return decorator

    def websocket(self, *args, **kwargs):
        def decorator(func):
            return func
        return decorator


class MockUploadFile:
    def __init__(self, filename="test.pdf", content_type="application/pdf"):
        self.filename = filename
        self.content_type = content_type

    async def read(self):
        return b""


class MockWebSocket:
    pass


class MockWebSocketDisconnect(Exception):
    pass


def MockFile(*args, **kwargs):
    return None


def MockQuery(default=None, *args, **kwargs):
    return default


fastapi_module.FastAPI = MockFastAPI
fastapi_module.HTTPException = MockHTTPException
fastapi_module.UploadFile = MockUploadFile
fastapi_module.File = MockFile
fastapi_module.WebSocket = MockWebSocket
fastapi_module.WebSocketDisconnect = MockWebSocketDisconnect
fastapi_module.Query = MockQuery

fastapi_middleware_module = mock_module("fastapi.middleware")
fastapi_cors_module = mock_module("fastapi.middleware.cors")
fastapi_cors_module.CORSMiddleware = MagicMock()
fastapi_middleware_module.cors = fastapi_cors_module

fastapi_responses_module = mock_module("fastapi.responses")
fastapi_responses_module.StreamingResponse = MagicMock()


# ============================================================
# Mock dotenv
# ============================================================
dotenv_module = mock_module("dotenv")
dotenv_module.load_dotenv = MagicMock(return_value=True)


# ============================================================
# Mock heavy AI / cloud / media dependencies
# ============================================================
mock_module("faiss")

google_module = mock_module("google")
genai_module = mock_module("google.generativeai")
genai_module.configure = MagicMock()
google_module.generativeai = genai_module

boto3_module = mock_module("boto3")
mock_s3_client = MagicMock()
boto3_module.client = MagicMock(return_value=mock_s3_client)

botocore_module = mock_module("botocore")
botocore_client_module = mock_module("botocore.client")
botocore_client_module.Config = MagicMock()
botocore_module.client = botocore_client_module

pypdf2_module = mock_module("PyPDF2")


class MockPdfReader:
    def __init__(self, *args, **kwargs):
        self.pages = []


pypdf2_module.PdfReader = MockPdfReader

mock_module("soundfile")

numpy_module = mock_module("numpy")
numpy_module.array = MagicMock()
numpy_module.mean = MagicMock()

httpx_module = mock_module("httpx")


class MockAsyncClient:
    def __init__(self, *args, **kwargs):
        pass

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        return None

    async def post(self, *args, **kwargs):
        return MagicMock()

    async def get(self, *args, **kwargs):
        return MagicMock()

    def stream(self, *args, **kwargs):
        return MagicMock()


httpx_module.AsyncClient = MockAsyncClient
httpx_module.Timeout = MagicMock()
httpx_module.HTTPStatusError = Exception
httpx_module.RequestError = Exception

groq_module = mock_module("groq")
groq_module.Groq = MagicMock()
groq_module.AsyncGroq = MagicMock()

deepgram_module = mock_module("deepgram")
deepgram_module.AsyncDeepgramClient = MagicMock()

deepgram_core_module = mock_module("deepgram.core")
deepgram_events_module = mock_module("deepgram.core.events")
deepgram_events_module.EventType = MagicMock()
deepgram_core_module.events = deepgram_events_module
deepgram_module.core = deepgram_core_module

websockets_module = mock_module("websockets")
websockets_module.connect = MagicMock()

lc_google_module = mock_module("langchain_google_genai")
lc_google_module.GoogleGenerativeAIEmbeddings = MagicMock()

lc_experimental_module = mock_module("langchain_experimental")
lc_text_splitter_module = mock_module("langchain_experimental.text_splitter")
lc_text_splitter_module.SemanticChunker = MagicMock()
lc_experimental_module.text_splitter = lc_text_splitter_module

lc_community_module = mock_module("langchain_community")
lc_vectorstores_module = mock_module("langchain_community.vectorstores")
lc_vectorstores_module.FAISS = MagicMock()
lc_community_module.vectorstores = lc_vectorstores_module


# ============================================================
# Import actual main.py after mocks
# ============================================================
main = importlib.import_module("main")


# ============================================================
# Unit tests based on actual main.py logic
# ============================================================

def test_ext_maps_python_to_py():
    assert main._ext("python") == "py"


def test_ext_maps_javascript_to_js():
    assert main._ext("javascript") == "js"


def test_ext_maps_typescript_to_ts():
    assert main._ext("typescript") == "ts"


def test_ext_maps_java_to_java():
    assert main._ext("java") == "java"


def test_ext_maps_c_to_c():
    assert main._ext("c") == "c"


def test_ext_maps_gcc_to_cpp():
    assert main._ext("gcc") == "cpp"


def test_ext_maps_csharp_to_cs():
    assert main._ext("csharp") == "cs"


def test_ext_maps_go_to_go():
    assert main._ext("go") == "go"


def test_ext_maps_rust_to_rs():
    assert main._ext("rust") == "rs"


def test_ext_is_case_insensitive():
    assert main._ext("PYTHON") == "py"


def test_ext_unknown_language_falls_back_to_txt():
    assert main._ext("unknownlang") == "txt"


def test_session_start_request_defaults_are_applied():
    req = main.SessionStartRequest(
        cv_text="Candidate CV",
        jd_text="Job description"
    )

    assert req.cv_text == "Candidate CV"
    assert req.jd_text == "Job description"
    assert req.job_role == "Domain Expert"
    assert req.voice_id == "aura-orpheus-en"


def test_session_start_request_accepts_custom_values():
    req = main.SessionStartRequest(
        cv_text="Candidate CV",
        jd_text="Job description",
        job_role="Backend Developer",
        voice_id="aura-2-odysseus-en"
    )

    assert req.job_role == "Backend Developer"
    assert req.voice_id == "aura-2-odysseus-en"


def test_session_start_request_requires_cv_text():
    with pytest.raises(ValidationError):
        main.SessionStartRequest(
            jd_text="Job description"
        )


def test_chat_request_stores_session_and_message():
    req = main.ChatRequest(
        session_id="session_123",
        message="Hello"
    )

    assert req.session_id == "session_123"
    assert req.message == "Hello"


def test_chat_request_requires_message():
    with pytest.raises(ValidationError):
        main.ChatRequest(session_id="session_123")


def test_feedback_request_defaults_mer_data_to_empty_list():
    req = main.FeedbackRequest(session_id="session_123")

    assert req.session_id == "session_123"
    assert req.mer_data == []


def test_code_execution_request_default_stdin_is_empty():
    req = main.CodeExecutionRequest(
        language="python",
        version="3.10.0",
        code="print('hello')"
    )

    assert req.language == "python"
    assert req.version == "3.10.0"
    assert req.code == "print('hello')"
    assert req.stdin == ""


def test_code_execution_request_requires_code():
    with pytest.raises(ValidationError):
        main.CodeExecutionRequest(
            language="python",
            version="3.10.0"
        )


def test_code_execution_response_model_stores_output():
    resp = main.CodeExecutionResponse(
        stdout="hello",
        stderr="",
        output="hello",
        exit_code=0,
        compile_output=""
    )

    assert resp.stdout == "hello"
    assert resp.stderr == ""
    assert resp.output == "hello"
    assert resp.exit_code == 0
    assert resp.compile_output == ""


def test_cached_rag_search_returns_empty_for_missing_session():
    result = main.cached_rag_search("missing_session", "backend developer")
    assert result == ""