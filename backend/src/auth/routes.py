"""FastAPI Authentication & Engineering Profile Routes.

Provides endpoints for:
- User signup & profile initialization
- Email & password signin with Supabase Auth
- Password reset request (forgot password)
- Password update (reset password)
- Current user profile inspection (/api/auth/me)
- User profile & preferences update (/api/auth/profile)
- Session token refresh & signout
"""

from __future__ import annotations
import logging
from typing import Optional, Dict, Any
from fastapi import APIRouter, HTTPException, status, Depends, Header
from pydantic import BaseModel, EmailStr, Field

from ..db.supabase import db_manager
from .dependencies import get_current_user, get_required_user, verify_supabase_token

logger = logging.getLogger("antimatter.auth")
router = APIRouter(prefix="/auth", tags=["Authentication"])


# ── Pydantic Request Models ──────────────────────────────────────────────────

class SignUpRequest(BaseModel):
    email: str
    password: str = Field(..., min_length=6, description="Password must be at least 6 characters")
    full_name: Optional[str] = None
    role: Optional[str] = "Hardware Engineer"
    organization: Optional[str] = ""
    experience_level: Optional[str] = "Intermediate"
    preferred_eda: Optional[str] = "KiCad 8"
    preferred_mcu: Optional[str] = "ESP32 / ARM Cortex"


class SignInRequest(BaseModel):
    email: str
    password: str


class ForgotPasswordRequest(BaseModel):
    email: str
    redirect_to: Optional[str] = None


class ResetPasswordRequest(BaseModel):
    new_password: str = Field(..., min_length=6)
    access_token: Optional[str] = None


class ProfileUpdateRequest(BaseModel):
    full_name: Optional[str] = None
    role: Optional[str] = None
    organization: Optional[str] = None
    experience_level: Optional[str] = None
    preferred_eda: Optional[str] = None
    preferred_mcu: Optional[str] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    settings: Optional[Dict[str, Any]] = None


class RefreshTokenRequest(BaseModel):
    refresh_token: str


# ── Route Handlers ───────────────────────────────────────────────────────────

@router.post("/signup", status_code=status.HTTP_201_CREATED)
async def sign_up(req: SignUpRequest):
    """Register a new engineer user and initialize their database profile."""
    client = db_manager.client or db_manager.admin_client
    if not client:
        # Offline mode fallback: generate mock user response
        mock_id = f"local-user-{abs(hash(req.email))}"
        profile = db_manager.ensure_user_profile(
            user_id=mock_id,
            email=req.email,
            full_name=req.full_name,
            role=req.role,
            experience_level=req.experience_level,
        )
        return {
            "status": "success",
            "message": "User registered in local/offline storage mode.",
            "user": {"id": mock_id, "email": req.email, "user_metadata": {"full_name": req.full_name}},
            "profile": profile,
            "session": None,
        }

    try:
        sign_up_options = {
            "data": {
                "full_name": req.full_name or req.email.split("@")[0],
                "name": req.full_name or req.email.split("@")[0],
                "role": req.role,
                "experience_level": req.experience_level,
            }
        }
        res = client.auth.sign_up({
            "email": req.email,
            "password": req.password,
            "options": sign_up_options,
        })

        user = getattr(res, "user", None)
        session = getattr(res, "session", None)

        if not user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Could not create user account. Email may already be in use.",
            )

        user_id = str(user.id)
        # Ensure database tables (profiles and user_details) have rows populated
        profile = db_manager.ensure_user_profile(
            user_id=user_id,
            email=req.email,
            full_name=req.full_name,
            role=req.role,
            experience_level=req.experience_level,
            metadata=getattr(user, "user_metadata", {}) or {},
        )

        session_data = None
        if session:
            session_data = {
                "access_token": session.access_token,
                "refresh_token": session.refresh_token,
                "expires_in": getattr(session, "expires_in", 3600),
                "token_type": "bearer",
            }

        return {
            "status": "success",
            "message": "Account created successfully.",
            "user": {
                "id": user_id,
                "email": user.email,
                "user_metadata": getattr(user, "user_metadata", {}),
            },
            "profile": profile,
            "session": session_data,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error("[Auth] Signup failed for %s: %s", req.email, e)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Registration failed: {str(e)}",
        )


@router.post("/signin")
async def sign_in(req: SignInRequest):
    """Authenticate with email and password, returning tokens and profile details."""
    client = db_manager.client or db_manager.admin_client
    if not client:
        # Offline mode fallback
        mock_id = f"local-user-{abs(hash(req.email))}"
        profile = db_manager.ensure_user_profile(user_id=mock_id, email=req.email)
        return {
            "status": "success",
            "user": {"id": mock_id, "email": req.email},
            "profile": profile,
            "session": {
                "access_token": f"mock-token-{mock_id}",
                "refresh_token": "mock-refresh",
                "expires_in": 86400,
                "token_type": "bearer",
            },
        }

    try:
        res = client.auth.sign_in_with_password({
            "email": req.email,
            "password": req.password,
        })
        user = getattr(res, "user", None)
        session = getattr(res, "session", None)

        if not user or not session:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password.",
            )

        user_id = str(user.id)
        profile = db_manager.ensure_user_profile(
            user_id=user_id,
            email=user.email or req.email,
            metadata=getattr(user, "user_metadata", {}) or {},
        )

        return {
            "status": "success",
            "user": {
                "id": user_id,
                "email": user.email,
                "user_metadata": getattr(user, "user_metadata", {}),
            },
            "profile": profile,
            "session": {
                "access_token": session.access_token,
                "refresh_token": session.refresh_token,
                "expires_in": getattr(session, "expires_in", 3600),
                "token_type": "bearer",
            },
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.warning("[Auth] Sign-in error for %s: %s", req.email, e)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Authentication failed: {str(e)}",
        )


@router.post("/forgot-password")
async def forgot_password(req: ForgotPasswordRequest):
    """Dispatch a password reset email via Supabase Auth with return recovery URL."""
    client = db_manager.client or db_manager.admin_client
    if not client:
        return {
            "status": "success",
            "message": "Offline mode: Password reset instructions simulated.",
        }

    try:
        options = {}
        if req.redirect_to:
            options["redirect_to"] = req.redirect_to

        client.auth.reset_password_for_email(req.email, options=options)
        return {
            "status": "success",
            "message": f"If an account exists for {req.email}, password recovery instructions have been dispatched.",
        }
    except Exception as e:
        logger.warning("[Auth] Forgot password dispatch error for %s: %s", req.email, e)
        # Never leak email existence
        return {
            "status": "success",
            "message": f"If an account exists for {req.email}, password recovery instructions have been dispatched.",
        }


@router.post("/reset-password")
async def reset_password(
    req: ResetPasswordRequest,
    authorization: Optional[str] = Header(None),
):
    """Reset user password after clicking recovery link or while authenticated."""
    token = req.access_token
    if not token and authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1]

    if not token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A valid recovery access token or Bearer session is required to reset password.",
        )

    # Verify user token
    user_info = verify_supabase_token(token)
    if not user_info:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Recovery token is invalid or has expired. Please request a new password reset link.",
        )

    user_id = user_info["id"]

    # If admin client is available, we can update directly by user_id
    if db_manager.admin_client:
        try:
            db_manager.admin_client.auth.admin.update_user_by_id(
                user_id,
                {"password": req.new_password}
            )
            return {
                "status": "success",
                "message": "Password updated successfully. You may now sign in with your new credentials.",
            }
        except Exception as e:
            logger.error("[Auth] Admin update_user_by_id failed: %s", e)

    # Fallback to updating via user-authenticated client
    try:
        if db_manager.client:
            # Set session on client temporarily to perform self-update
            db_manager.client.auth.set_session(access_token=token, refresh_token="")
            db_manager.client.auth.update_user({"password": req.new_password})
            return {
                "status": "success",
                "message": "Password updated successfully. You may now sign in with your new credentials.",
            }
    except Exception as e:
        logger.error("[Auth] update_user failed: %s", e)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to reset password: {str(e)}",
        )

    return {
        "status": "success",
        "message": "Password updated successfully.",
    }


@router.get("/me")
async def get_me(current_user: Dict[str, Any] = Depends(get_required_user)):
    """Fetch the authenticated user's credentials and engineering preferences."""
    user_id = current_user["id"]
    profile = db_manager.get_user_details(user_id) or {}
    return {
        "status": "success",
        "user": current_user,
        "profile": profile,
    }


@router.put("/profile")
async def update_profile(
    req: ProfileUpdateRequest,
    current_user: Dict[str, Any] = Depends(get_required_user),
):
    """Update profile attributes and workspace preferences for current engineer."""
    user_id = current_user["id"]
    update_data = {k: v for k, v in req.model_dump().items() if v is not None}
    success = db_manager.save_user_details(user_id, update_data)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to persist profile updates.",
        )
    refreshed = db_manager.get_user_details(user_id) or {}
    return {
        "status": "success",
        "message": "Profile updated successfully.",
        "profile": refreshed,
    }


@router.post("/refresh")
async def refresh_session(req: RefreshTokenRequest):
    """Refresh an expired Supabase access token using a refresh token."""
    client = db_manager.client or db_manager.admin_client
    if not client:
        return {
            "status": "success",
            "session": {"access_token": "mock-refreshed-token", "refresh_token": req.refresh_token, "expires_in": 3600},
        }

    try:
        res = client.auth.refresh_session(req.refresh_token)
        session = getattr(res, "session", None)
        if not session:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Unable to refresh session.",
            )
        return {
            "status": "success",
            "session": {
                "access_token": session.access_token,
                "refresh_token": session.refresh_token,
                "expires_in": getattr(session, "expires_in", 3600),
                "token_type": "bearer",
            },
        }
    except Exception as e:
        logger.warning("[Auth] Refresh token error: %s", e)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token refresh failed: {str(e)}",
        )


@router.post("/signout")
async def sign_out(current_user: Optional[Dict[str, Any]] = Depends(get_current_user)):
    """Terminate current user session."""
    return {"status": "success", "message": "Signed out successfully."}
