---
name: supabase
description: >-
  Provides end-to-end expertise for Supabase database management, authentication, Row Level Security (RLS), migrations, Python SDK integration, and Supabase MCP server operations. Use whenever the user asks to connect to Supabase, write SQL migrations, define tables, enforce RLS policies, configure Supabase auth in FastAPI/Python, manage storage buckets, or interact with Supabase projects via MCP tools.
---

# Supabase Development & Architecture Skill

This skill guides the agent in building robust, production-grade applications with Supabase, integrating the Python `supabase` client with FastAPI, managing PostgreSQL schemas and Row Level Security (RLS), and utilizing the Supabase Model Context Protocol (MCP) server.

---

## 1. Supabase MCP Tools Overview

When the `@supabase/mcp-server-supabase` server is running, the agent has access to management capabilities across Supabase projects:

- **Database Inspection**: List schemas, inspect table structures, foreign keys, and indexes.
- **SQL Execution**: Execute migrations, DDL statements, and test queries directly.
- **Project Configuration**: Query project metadata, regions, and environment settings.
- **Logging & Debugging**: Inspect database and edge function logs, Postgres error logs, and slow queries.
- **Documentation**: Query the official Supabase documentation index directly for up-to-date API syntax.

> **Environment Variable Requirement:**
> The MCP server requires `SUPABASE_ACCESS_TOKEN` (Personal Access Token from `https://supabase.com/dashboard/account/tokens`).

---

## 2. Python SDK (`supabase-py`) Best Practices

### Client Initialization
Use a centralized client factory with typed settings from `pydantic_settings`:

```python
import os
from functools import lru_cache
from supabase import create_client, Client
from pydantic_settings import BaseSettings

class SupabaseSettings(BaseSettings):
    supabase_url: str
    supabase_key: str  # anon/publishable key for user-context requests
    supabase_service_role_key: str | None = None  # admin only, NEVER expose to client

    class Config:
        env_file = ".env"
        extra = "ignore"

@lru_cache()
def get_supabase_settings() -> SupabaseSettings:
    return SupabaseSettings()

def get_supabase_client() -> Client:
    settings = get_supabase_settings()
    return create_client(settings.supabase_url, settings.supabase_key)

def get_supabase_admin_client() -> Client:
    """Use strictly for backend-only background jobs or admin tasks bypassing RLS."""
    settings = get_supabase_settings()
    if not settings.supabase_service_role_key:
        raise ValueError("SUPABASE_SERVICE_ROLE_KEY is required for admin client")
    return create_client(settings.supabase_url, settings.supabase_service_role_key)
```

### Querying Data (PostgREST)
Always filter and limit responses; handle errors predictably:

```python
from supabase import Client

def fetch_user_profile(client: Client, user_id: str) -> dict | None:
    response = (
        client.table("profiles")
        .select("id, full_name, avatar_url, updated_at")
        .eq("id", user_id)
        .maybe_single()
        .execute()
    )
    return response.data
```

### FastAPI Authentication Middleware
Verify JWTs forwarded in the `Authorization: Bearer <token>` header using Supabase Auth:

```python
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import Client

security = HTTPBearer()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    client: Client = Depends(get_supabase_client),
):
    token = credentials.credentials
    try:
        user_response = client.auth.get_user(token)
        if not user_response or not user_response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token",
            )
        return user_response.user
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Authentication error: {str(exc)}",
        )
```

---

## 3. Database Schema & RLS Design Patterns

### Row Level Security (RLS) is Mandatory
Every table in the `public` schema must enable RLS:
```sql
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
```

### Standard User Profile Pattern (Synced with `auth.users`)
```sql
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Trigger to automatically create a profile entry when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, avatar_url)
    VALUES (
        new.id,
        new.email,
        new.raw_user_meta_data->>'full_name',
        new.raw_user_meta_data->>'avatar_url'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### Common RLS Policies
```sql
-- Read: Users can view their own profile (or public profiles depending on app rules)
CREATE POLICY "Users can view own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

-- Update: Users can update only their own profile
CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);
```

### Performance & Security Checklist
1. **Indexes on Foreign Keys**: Always index foreign key columns used in joins and RLS policies (e.g., `CREATE INDEX ON public.items (user_id)`).
2. **Never expose `service_role` key**: Keep `SUPABASE_SERVICE_ROLE_KEY` strictly in backend environments; never send it to frontend clients.
3. **Use `timestamptz`**: Always store timestamps with timezone (`TIMESTAMPTZ DEFAULT timezone('utc'::text, now())`).
4. **Use UUID v4**: Use `gen_random_uuid()` as default primary key values.
