# Windows desktop validation

The standard `npm run pack:win --prefix desktop` command builds both editions.
`.github/workflows/windows-desktop.yml` validates both before publishing a tag.
The x64 edition uses Electron 44.0.0; the Windows 7 ia32 edition pins 22.3.27.

## Automated coverage

- Offline course/resource audit, including bundled Pyodide packages and adapted
  Python Tutor activities.
- Six desktop packaging, navigation, local server, MIME, and isolation tests.
- Native Python course transcript test and eight linting tests. These suites run
  in separate processes because the course test changes global translation state.
- PE machine inspection plus runtime-reported architecture and Electron version
  for each packaged Windows executable.
- Within each real Electron runtime: 285 generated course cases, including
  expected failures, Snoop, Bird's Eye, and exercise input callbacks.
- Through the application terminal: arithmetic, comprehensions, sleep, interactive
  input, exception display, and recovery after an exception.
- Browser isolation and external HTTP request rejection.
- Editor contents, page selection, course progress, and local storage after reload.
- Silent installation of the self-contained ia32 installer, repetition of the
  runtime checks from the installed copy, and silent uninstallation with removal
  of the application executable.

The packaged application reports JSON under `desktop/release/*-smoke-result.json`.
CI preserves these reports in its `futurecoder-validation-RUN_ID` artifact.
The Python test count is included in each report, so a missing/empty course
cannot silently count as a successful test run.

## Local evidence (2026-09-18)

On the Linux server, Electron 22.3.27 and Electron 44.0.0 each passed 285 course
cases and all terminal/network/reload checks. The offline resource audit, six
Node tests, native course transcript test, and eight isolated linting tests passed.
Linux runtime checks are supplementary: Windows CI tests the actual ia32 and x64
packages and the ia32 installer.

## Remaining device validation

There is no Windows 7 machine or VM available on this server. CI uses modern
Windows. A release built with Electron 22 is therefore a Windows 7-targeted build,
not proof of successful installation or operation on Windows 7.

On a Windows 7 SP1 32-bit device, verify:

1. Transfer the `win7-ia32.exe` installer, disconnect networking, and install it.
2. Launch the course; complete introductory shell and editor exercises.
3. Exercise `input()`, Snoop, Bird's Eye, and a later course exercise.
4. Close and reopen the application; confirm progress and editor text remain.
5. Uninstall, reinstall, and confirm saved progress is retained.

Electron 22 no longer receives security updates. The legacy edition retains the
same restrictions on navigation and external network requests as the x64 edition.
32-bit address-space limits may constrain unusually large user programs.
