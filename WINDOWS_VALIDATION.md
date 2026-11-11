# Windows desktop validation

The standard `npm run pack:win --prefix desktop` command builds both editions.
`.github/workflows/windows-desktop.yml` validates both before publishing a tag.
The x64 edition uses Electron 44.0.0; the Windows 7 ia32 edition pins 22.3.27.

## Automated coverage

- Offline course/resource audit, including bundled Pyodide packages and adapted
  Python Tutor activities.
- Six desktop packaging, navigation, local server, MIME, and isolation tests.
- Four frontend regressions for prerequisite order, reading-page visits, older
  out-of-order progress, immediate saves, and storage failure fallback.
- Native Python course transcript test and eight linting tests. These suites run
  in separate processes because the course test changes global translation state.
- PE machine inspection plus runtime-reported architecture and Electron version
  for each packaged Windows executable.
- Within each real Electron runtime: 285 generated course cases, including
  expected failures, Snoop, Bird's Eye, and exercise input callbacks.
- Through the application terminal: arithmetic, comprehensions, sleep, interactive
  input, exception display, and recovery after an exception.
- Browser isolation and external HTTP request rejection.
- Rejection of locked startup/query/hash links and disabled future lesson links in
  the contents menu; Developer mode disabled; real introductory exercise completion
  and reading-page visits unlock subsequent lessons.
- Editor contents, a non-initial page selection, completed exercise progress, and
  local storage after reload.
- A normal application quit followed by a new process using the same isolated,
  persistent profile; all lesson progress, current page, editor text, and the
  storage marker must survive. This runs for both architectures and the installed
  ia32 application. The original temporary smoke partition only tested reloads.
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

## Lesson-order validation (2026-10-20)

The Linux offline production build, resource audit, four frontend progress tests,
six desktop tests, and eight linting tests passed. Electron 44 passed all 285 course
cases plus locked startup/hash/contents navigation, real introductory exercise
completion, reading-page progression, and reload persistence of completed steps,
page selection, and editor contents. The Windows workflow now includes the frontend
regressions and the expanded smoke checks. These Linux results do not establish
Windows 7 device compatibility.

## Windows evidence (2026-09-18)

[Windows build 35399022113](https://github.com/luvchurchill/futurecoder/actions/runs/35399022113)
passed the offline audit, six desktop tests, eight linting tests, and native course
transcript comparison. Both actual Windows executables passed architecture/version
checks and 285 course cases each. The installed ia32 copy passed another 285 cases
and all runtime checks; silent installation and uninstallation passed.

## Windows 7 persistence investigation (2026-11-10)

The released v0.1.11 ia32 installer was tested in the existing QEMU Windows
Embedded Standard 7 SP1 32-bit evaluation VM (2 GB RAM, Core 2 Duo CPU model,
WHPX, no network adapter). A separate qcow2 overlay preserved the original VM.
Installer SHA-256:
`dbb5dbe4662c23ae32b751431e1633a9dfa71fa1e2d83e18c2d448fe6fe2b86a`.

Only the desktop test harness was replaced to support a persistent isolated
profile, normal quit, and a second-process assertion; the released course assets
were unchanged. All 285 course cases, sequential navigation, introductory exercise
completion, reading-page progression, editor saving, and reload checks passed.
The process exited normally with code 0. After rebooting the guest, a new process
restored the same page, every step/visit record, editor text, and local-storage
marker, and exited with code 0. The same process-restart check passed on the host
with Electron 22.3.27 ia32. Four frontend tests and six desktop tests passed.

The reported loss of progress was not reproduced on v0.1.11. This change fixes
the release test's coverage gap; it does not claim a newly identified production
storage bug. School installer version, Windows account/profile retention, and
the exact close/reopen sequence remain relevant if the report recurs.

Local evidence is under `tmp/win7-progress/` (serial log, host JSON reports,
guest harness, and disk overlay). The VM password was changed with the owner's
authorization after it expired. An initial harness attempt selected the Windows
setup disc; this was corrected before the successful application tests.

## Remaining device validation

CI uses modern Windows. The additional VM test uses Embedded Standard 7, not
retail Windows 7 or the school's actual account policies and hardware.

On a Windows 7 SP1 32-bit device, verify:

1. Transfer the `win7-ia32.exe` installer, disconnect networking, and install it.
2. Launch the course; complete introductory shell and editor exercises.
3. Exercise `input()`, Snoop, Bird's Eye, and a later course exercise.
4. Close and reopen the application; confirm progress and editor text remain.
5. Uninstall, reinstall, and confirm saved progress is retained.

Electron 22 no longer receives security updates. The legacy edition retains the
same restrictions on navigation and external network requests as the x64 edition.
32-bit address-space limits may constrain unusually large user programs.
