"""Fail when a desktop course build still depends on required online assets."""

import json
import sys
from pathlib import Path


def fail(message):
    raise SystemExit(message)


def main():
    root = Path(__file__).parent.parent
    generated_pages = root / "frontend/src/book/pages.json.load_by_url"
    course = root / "frontend/course"

    pages = json.loads(generated_pages.read_text())
    rendered_course = json.dumps(pages)
    forbidden_course_text = ("Python Tutor", "pythontutor.com", "i.imgur.com")
    for forbidden in forbidden_course_text:
        if forbidden.lower() in rendered_course.lower():
            fail(f"Offline course still contains {forbidden!r}")

    if not course.is_dir():
        fail("frontend/course does not exist; build the frontend first")

    required_patterns = {
        "course entry point": "index.html",
        "service worker": "service-worker.js",
        "Pyodide WebAssembly runtime": "pyodide/*.wasm",
        "Pyodide standard library": "pyodide/python_stdlib.zip",
        "futurecoder Python archive": "static/media/python_core.tar.*.load_by_url",
        "course page data": "static/media/pages.json.*.load_by_url",
        "Bird's Eye assets": "birdseye/*",
    }
    for description, pattern in required_patterns.items():
        if not any(course.glob(pattern)):
            fail(f"Offline build is missing {description} ({pattern})")

    worker_files = list(course.glob("static/js/Worker*.js"))
    if len(worker_files) != 1:
        fail(f"Expected one compiled Python worker, found {len(worker_files)}")
    worker_source = worker_files[0].read_text(errors="replace")
    if "/course/pyodide/" not in worker_source:
        fail("Compiled Python worker does not reference the bundled Pyodide runtime")

    remote_asset_markers = ("src=\"http://", "src=\"https://", "url(http://", "url(https://")
    for asset in course.rglob("*"):
        if asset.suffix.lower() not in {".css", ".html"} or not asset.is_file():
            continue
        content = asset.read_text(errors="replace").lower()
        for marker in remote_asset_markers:
            if marker in content:
                fail(f"Offline build contains a remote asset reference in {asset}: {marker}")

    print("Offline course audit passed")


if __name__ == "__main__":
    main()
