"""Supabase JWT Authentication Dependency for FastAPI routes and WebSockets.

Verifies tokens issued by Supabase Auth and extracts user identity.
"""

from __future__ import annotations
import logging
from typing import Optional, Dict, Any
from fastapi import Depends, HTTPException, status, Header, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from ..db.supabase import db_manager

logger = logging.getLogger(__name__)

security = HTTPBearer(auto_error=False)


def verify_supabase_token(token: str) -> Optional[Dict[str, Any]]:
    """Validate a Supabase JWT and return user details."""
    if not token or not db_manager.is_connected or not db_manager.client:
        return None

    try:
        user_resp = db_manager.client.auth.get_user(token)
        if user_resp and user_resp.user:
            return {
                "id": str(user_resp.user.id),
                "email": user_resp.user.email,
                "user_metadata": getattr(user_resp.user, "user_metadata", {}) or {},
            }
    except Exception as e:
        logger.debug("[Auth] Token verification failed: %s", e)
    return None


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> Optional[Dict[str, Any]]:
    """FastAPI route dependency extracting current user from Bearer header."""
    if not credentials or not credentials.credentials:
        return None
    return verify_supabase_token(credentials.credentials)


async def get_required_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> Dict[str, Any]:
    """FastAPI dependency requiring a valid authenticated user."""
    user = await get_current_user(credentials)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials required or invalid session.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user
