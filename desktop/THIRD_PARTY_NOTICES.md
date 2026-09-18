# Third-party notices

futurecoder Offline includes open-source software in addition to futurecoder's
MIT-licensed code. The corresponding projects retain their own copyrights and
licenses. Important runtime components include:

- Electron (MIT) and Chromium. Electron distributions include Electron's
  license and Chromium's notices. The legacy Windows 7 ia32 build pins
  Electron 22.3.27 in `electron-builder.win7.cjs`; the x64 runtime is locked
  in `desktop/package-lock.json`.
- Pyodide (Mozilla Public License 2.0), including its CPython/WebAssembly
  runtime and Python standard library bundle.
- React (MIT), Workbox (MIT), and the other JavaScript packages recorded in
  `frontend/package-lock.json`.
- Bird's Eye, Snoop, Friendly Traceback, and the other Python packages recorded
  in `poetry.lock`.

The authoritative source versions and license metadata are the lockfiles in
the source repository used to build this application.
