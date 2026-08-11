from typing import Any, Optional, Callable
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel


class AppError(Exception):
    """Base application error with an associated HTTP status code."""

    status_code: int = 400

    def __init__(self, detail: str, status_code: Optional[int] = None):
        self.detail = detail
        if status_code is not None:
            self.status_code = status_code
        super().__init__(detail)


class NotFoundError(AppError):
    status_code = 404


class ConflictError(AppError):
    status_code = 409


class InsufficientStockError(AppError):
    status_code = 400


class ErrorResponse(BaseModel):
    detail: str


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
        return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})

    @app.exception_handler(Exception)
    async def unhandled_error_handler(request: Request, exc: Exception) -> JSONResponse:
        detail = str(exc) if exc.__class__.__module__ == "app" else "Internal server error"
        return JSONResponse(status_code=500, content={"detail": detail})
