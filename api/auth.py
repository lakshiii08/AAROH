"""Amazon Cognito access-token verification for deployed API routes."""
import os
from functools import lru_cache

import jwt
from fastapi import Request
from fastapi.responses import JSONResponse
from jwt import PyJWKClient
from starlette.middleware.base import BaseHTTPMiddleware


@lru_cache(maxsize=8)
def _jwks_client(issuer: str) -> PyJWKClient:
    return PyJWKClient(f"{issuer}/.well-known/jwks.json", cache_keys=True, lifespan=3600)


def verify_access_token(token: str) -> dict:
    region = os.environ["AWS_REGION"]
    pool_id = os.environ["COGNITO_USER_POOL_ID"]
    client_id = os.environ["COGNITO_APP_CLIENT_ID"]
    issuer = f"https://cognito-idp.{region}.amazonaws.com/{pool_id}"
    signing_key = _jwks_client(issuer).get_signing_key_from_jwt(token)
    claims = jwt.decode(token, signing_key.key, algorithms=["RS256"], issuer=issuer, options={"verify_aud": False})
    if claims.get("token_use") != "access" or claims.get("client_id") != client_id:
        raise jwt.InvalidTokenError("Expected an access token for the AAROH dashboard")
    return claims


class CognitoAuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if request.url.path.startswith("/api/v1/") and request.method != "OPTIONS":
            authorization = request.headers.get("authorization", "")
            scheme, _, token = authorization.partition(" ")
            if scheme.lower() != "bearer" or not token:
                return JSONResponse({"detail": "Sign in is required."}, status_code=401, headers={"WWW-Authenticate": "Bearer"})
            try:
                request.state.user = verify_access_token(token)
            except Exception:
                return JSONResponse({"detail": "Your sign-in has expired or is invalid. Please sign in again."}, status_code=401, headers={"WWW-Authenticate": "Bearer"})
        return await call_next(request)
