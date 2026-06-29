#!/usr/bin/env python3
"""
nightly_forecasts.py — refresh the S&P next-day forecast models, one per AI provider.

Flavor A ("refresh the function"): each run asks every configured model to (re)write a
`predict(history)` strategy for the S&P-next-day competition, then submits it to ConvexPi via
POST /api/sp500-models. Re-submitting under the same name replaces that provider's model in
place, so a daily cron keeps each provider's strategy current. The platform scores the function
walk-forward on real prices.

Env (set as GitHub Actions secrets):
    CONVEXPI_API_KEY        agent-scoped ConvexPi key (cpk_…) with the "submit" scope   [required]
    CONVEXPI_BASE_URL       default https://www.convexpi.ai
    ANTHROPIC_API_KEY       enables the Anthropic model   (model: ANTHROPIC_MODEL)
    OPENAI_API_KEY          enables the OpenAI model      (model: OPENAI_MODEL)
    GEMINI_API_KEY          enables the Google model      (model: GEMINI_MODEL)

A provider is simply skipped if its key isn't set. Run with --dry-run to call the models and
print whether each produced a valid predict() without submitting.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
import urllib.request

SLUG = "sp500-nextday"

PROMPT = """You are competing in the ConvexPi "S&P 500 next-day" forecasting competition.

Write a single Python function `predict(history)` that forecasts the NEXT trading day's return of
the S&P 500.
- `history` is a pandas DataFrame of daily closes with a 'close' column, up to and including today.
- Return a single float: your forecast of tomorrow's return. Its SIGN is your bet (positive = long,
  negative = short). Magnitude doesn't matter beyond the sign for scoring.
- You are scored walk-forward on real prices by the annualised Sharpe of sign(forecast) * next-day
  return. Daily index timing is extremely hard; a simple, robust rule that generalises out of
  sample beats an over-fit one.
- Allowed: pandas and numpy only. No imports of os/sys/subprocess/socket/requests, no network, no
  file or system access. Keep it self-contained and deterministic.

Respond with ONLY a Python code block defining `predict(history)` — no prose, no explanation."""

MAX_TOKENS = 1500


def _post_json(url: str, payload: dict, headers: dict, timeout: int = 90) -> dict:
    data = json.dumps(payload).encode()
    req = urllib.request.Request(url, data=data, headers={**headers, "Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read())


# --- provider callers: prompt -> raw text response ---------------------------------------------

def call_anthropic(key: str, model: str) -> str:
    out = _post_json(
        "https://api.anthropic.com/v1/messages",
        {"model": model, "max_tokens": MAX_TOKENS, "messages": [{"role": "user", "content": PROMPT}]},
        {"x-api-key": key, "anthropic-version": "2023-06-01"},
    )
    return "".join(b.get("text", "") for b in out.get("content", []))


def call_openai(key: str, model: str) -> str:
    out = _post_json(
        "https://api.openai.com/v1/chat/completions",
        {"model": model, "max_tokens": MAX_TOKENS, "messages": [{"role": "user", "content": PROMPT}]},
        {"Authorization": f"Bearer {key}"},
    )
    return out["choices"][0]["message"]["content"]


def call_gemini(key: str, model: str) -> str:
    out = _post_json(
        f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}",
        {"contents": [{"parts": [{"text": PROMPT}]}]},
        {},
    )
    return "".join(p.get("text", "") for p in out["candidates"][0]["content"]["parts"])


# Each: (leaderboard name, key env, model env, default model, caller). A provider with no key is skipped.
PROVIDERS = [
    ("anthropic", "ANTHROPIC_API_KEY", "ANTHROPIC_MODEL", "claude-opus-4-8", call_anthropic),
    ("openai",    "OPENAI_API_KEY",    "OPENAI_MODEL",    "gpt-4o",          call_openai),
    ("google",    "GEMINI_API_KEY",    "GEMINI_MODEL",    "gemini-2.0-flash", call_gemini),
]


def extract_code(text: str) -> str | None:
    """Pull the python from a fenced block (or the whole text), and require a predict() def."""
    m = re.search(r"```(?:python)?\s*(.*?)```", text, re.S)
    code = (m.group(1) if m else text).strip()
    return code if "def predict" in code else None


def submit(base: str, api_key: str, name: str, code: str) -> dict:
    return _post_json(
        f"{base.rstrip('/')}/api/sp500-models",
        {"name": name, "code": code},
        {"Authorization": f"Bearer {api_key}"},
    )


def main() -> int:
    ap = argparse.ArgumentParser(description="Refresh S&P forecast models, one per AI provider.")
    ap.add_argument("--dry-run", action="store_true", help="Call models but don't submit.")
    ap.add_argument("--name-prefix", default="", help="Optional prefix for leaderboard names.")
    args = ap.parse_args()

    base = os.environ.get("CONVEXPI_BASE_URL", "https://www.convexpi.ai")
    api_key = os.environ.get("CONVEXPI_API_KEY", "")
    if not api_key and not args.dry_run:
        print("CONVEXPI_API_KEY not set — use --dry-run to test the model calls only.", file=sys.stderr)
        return 2

    ran = ok = 0
    for name, key_env, model_env, default_model, caller in PROVIDERS:
        key = os.environ.get(key_env)
        if not key:
            print(f"· {name}: skipped (no {key_env})")
            continue
        ran += 1
        model = os.environ.get(model_env, default_model)
        label = f"{args.name_prefix}{name}/{model}"
        try:
            code = extract_code(caller(key, model))
            if not code:
                print(f"✗ {name} ({model}): no valid predict() in response")
                continue
            if args.dry_run:
                print(f"✓ {name} ({model}): produced predict() [{len(code)} chars] — dry run, not submitted")
                ok += 1
                continue
            res = submit(base, api_key, label, code)
            mid = (res.get("model") or {}).get("id", "?")
            print(f"✓ {name} ({model}): submitted as '{label}' (id {mid})")
            ok += 1
        except Exception as e:  # noqa: BLE001 — one provider failing shouldn't stop the rest
            print(f"✗ {name} ({model}): {type(e).__name__}: {e}")

    print(f"\nDone — {ok}/{ran} providers succeeded ({len(PROVIDERS)} configured).")
    return 0 if (ran == 0 or ok > 0) else 1


if __name__ == "__main__":
    raise SystemExit(main())
