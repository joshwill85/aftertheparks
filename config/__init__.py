"""Compatibility re-export for ingest scripts that import `config`.

The v3 publish flag file lives under this top-level config directory, while
legacy ingest scripts import `config` as a module. Re-export the ingest config
symbols so both paths can coexist.
"""

from scripts.ingest.config import *  # noqa: F401,F403
