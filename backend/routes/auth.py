from fastapi import APIRouter, HTTPException, status

from config import settings
from dependencies import create_access_token
from schemas import LoginRequest, TokenResponse

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest):
    if (
        body.username != settings.admin_username
        or body.password != settings.admin_password
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
        )
    token = create_access_token(subject=body.username)
    return TokenResponse(access_token=token)
