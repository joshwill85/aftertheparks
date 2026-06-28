"""Supabase database helpers for the ingest pipeline."""

from __future__ import annotations

import json
import importlib.util
from typing import Any
from pathlib import Path
from urllib.parse import quote

try:
    from .config import STORAGE_BUCKET, supabase_service_key, supabase_url
except ImportError:  # pragma: no cover - supports direct script imports
    config_path = Path(__file__).with_name("config.py")
    spec = importlib.util.spec_from_file_location("ingest_config", config_path)
    if spec is None or spec.loader is None:
        raise
    ingest_config = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(ingest_config)
    STORAGE_BUCKET = ingest_config.STORAGE_BUCKET
    supabase_service_key = ingest_config.supabase_service_key
    supabase_url = ingest_config.supabase_url

try:
    import httpx
except ImportError:
    httpx = None  # type: ignore


class SupabaseClient:
    def __init__(self, url: str | None = None, key: str | None = None) -> None:
        self.url = (url or supabase_url()).rstrip("/")
        self.key = key or supabase_service_key()
        if not self.url or not self.key:
            raise RuntimeError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required")
        if httpx is None:
            raise RuntimeError("httpx is required; pip install httpx")

    def _headers(self, prefer: str | None = None) -> dict[str, str]:
        headers = {
            "apikey": self.key,
            "Authorization": f"Bearer {self.key}",
            "Content-Type": "application/json",
        }
        if prefer:
            headers["Prefer"] = prefer
        return headers

    def select(
        self,
        table: str,
        columns: str = "*",
        filters: dict[str, str] | None = None,
        limit: int | None = None,
    ) -> list[dict[str, Any]]:
        params = [f"select={quote(columns, safe='*,()')}"]
        if filters:
            for key, value in filters.items():
                params.append(f"{key}={quote(value)}")
        if limit is not None:
            params.append(f"limit={limit}")
        url = f"{self.url}/rest/v1/{table}?{'&'.join(params)}"
        resp = httpx.get(url, headers=self._headers(), timeout=60)
        resp.raise_for_status()
        return resp.json()

    def insert(self, table: str, rows: dict[str, Any] | list[dict[str, Any]], *, on_conflict: str | None = None) -> list[dict[str, Any]]:
        payload = rows if isinstance(rows, list) else [rows]
        prefer = "return=representation"
        if on_conflict:
            prefer = f"resolution=merge-duplicates,return=representation"
        url = f"{self.url}/rest/v1/{table}"
        if on_conflict:
            url += f"?on_conflict={on_conflict}"
        resp = httpx.post(url, headers=self._headers(prefer), content=json.dumps(payload), timeout=120)
        resp.raise_for_status()
        return resp.json()

    def upsert(self, table: str, rows: dict[str, Any] | list[dict[str, Any]], on_conflict: str) -> list[dict[str, Any]]:
        return self.insert(table, rows, on_conflict=on_conflict)

    def update(self, table: str, match: dict[str, str], values: dict[str, Any]) -> None:
        params = "&".join(f"{k}={quote(v)}" for k, v in match.items())
        url = f"{self.url}/rest/v1/{table}?{params}"
        resp = httpx.patch(url, headers=self._headers(), content=json.dumps(values), timeout=60)
        resp.raise_for_status()

    def rpc(self, fn: str, args: dict[str, Any] | None = None) -> Any:
        url = f"{self.url}/rest/v1/rpc/{fn}"
        resp = httpx.post(url, headers=self._headers(), content=json.dumps(args or {}), timeout=60)
        resp.raise_for_status()
        return resp.json()

    def upload_storage(self, path: str, data: bytes, content_type: str = "application/pdf") -> str:
        url = f"{self.url}/storage/v1/object/{STORAGE_BUCKET}/{path}"
        headers = {
            "apikey": self.key,
            "Authorization": f"Bearer {self.key}",
            "Content-Type": content_type,
            "x-upsert": "true",
        }
        resp = httpx.post(url, headers=headers, content=data, timeout=120)
        resp.raise_for_status()
        return path
