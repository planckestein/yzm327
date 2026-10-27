"""Mimari kuralların kendisi de test edilir: bağımlılıklar yalnızca içe doğru akar (Dependency Inversion)."""

from __future__ import annotations

import ast
from pathlib import Path

import pytest

SRC = Path(__file__).resolve().parents[2] / "src" / "kurultay"
FRAMEWORKS = ("sqlalchemy", "fastapi", "starlette", "jinja2", "uvicorn", "urllib", "requests", "httpx")


def imports_of(package: str) -> list[tuple[str, str]]:
    found = []
    for path in (SRC / package).rglob("*.py"):
        for node in ast.walk(ast.parse(path.read_text(encoding="utf-8"))):
            if isinstance(node, ast.Import):
                found += [(path.name, alias.name) for alias in node.names]
            elif isinstance(node, ast.ImportFrom) and node.module:
                found.append((path.name, node.module))
    return found


def test_domain_depends_on_nothing_but_itself_and_the_standard_library() -> None:
    for file, module in imports_of("domain"):
        assert not module.startswith(FRAMEWORKS), f"{file} → {module}"
        if module.startswith("kurultay"):
            assert module.startswith("kurultay.domain"), f"{file} → {module}"


@pytest.mark.parametrize("module_prefix", ["kurultay.adapters.repository", "sqlalchemy"])
def test_handlers_do_not_know_concrete_infrastructure(module_prefix: str) -> None:
    for file, module in imports_of("service_layer"):
        if file in {"handlers.py", "notifications.py", "agents.py", "proxies.py"}:
            assert not module.startswith(module_prefix), f"{file} → {module}"


def test_service_layer_never_imports_entrypoints() -> None:
    for file, module in imports_of("service_layer") + imports_of("adapters"):
        assert not module.startswith("kurultay.entrypoints"), f"{file} → {module}"


def test_no_repository_offers_a_delete_operation() -> None:
    source = (SRC / "adapters" / "repository.py").read_text(encoding="utf-8")
    tree = ast.parse(source)
    methods = {n.name for n in ast.walk(tree) if isinstance(n, ast.FunctionDef)}
    assert not {m for m in methods if "delete" in m or "remove" in m}


def test_no_hidden_global_cache_in_service_layer_or_adapters() -> None:
    """Anti-desen: gizli global durum. Önbellekler bootstrap'ta üretilip enjekte edilir, modül düzeyinde boş
    bir sözlük/liste olarak yaşamaz (aksi halde iki veritabanının verisi aynı önbelleğe karışabilir)."""
    for package in ("service_layer", "adapters"):
        for path in (SRC / package).rglob("*.py"):
            for node in ast.parse(path.read_text(encoding="utf-8")).body:
                value = node.value if isinstance(node, (ast.Assign, ast.AnnAssign)) else None
                empty = isinstance(value, (ast.Dict, ast.List, ast.Set)) and not getattr(value, "keys", None) and not getattr(value, "elts", None)
                assert not empty, f"{path.name}:{node.lineno} modül düzeyinde boş, değiştirilebilir koleksiyon"
