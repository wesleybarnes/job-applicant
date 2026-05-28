import os
import sys
import uvicorn

# Make the `app` package importable no matter which working directory the
# platform launches us from (Railway root dir, repo root, container WORKDIR…).
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

if __name__ == "__main__":
    # PORT may be unset or an empty string depending on the platform; fall back
    # to 8000. Reading it in Python avoids the "$PORT not a valid integer" crash
    # you get when a start command's $PORT isn't shell-expanded.
    port = int(os.environ.get("PORT") or 8000)
    uvicorn.run("app.main:app", host="0.0.0.0", port=port)
