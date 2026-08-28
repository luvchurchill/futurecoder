const path = require("node:path");
const {app, BrowserWindow, dialog} = require("electron");
const {createCourseServer} = require("./server");

const HOST = "127.0.0.1";
const PORT = 41731;
const APP_ORIGIN = `http://${HOST}:${PORT}`;
const COURSE_URL = `${APP_ORIGIN}/course/`;
const SMOKE_TEST = process.argv.includes("--smoke-test");

let courseServer;

function courseRoot() {
  return app.isPackaged
    ? path.join(process.resourcesPath, "course")
    : path.join(__dirname, "..", "frontend", "course");
}

function blockNetworkRequests(targetSession) {
  targetSession.webRequest.onBeforeRequest(
    {urls: ["http://*/*", "https://*/*"]},
    (details, callback) => {
      let allowed = false;
      try {
        const url = new URL(details.url);
        allowed = url.origin === APP_ORIGIN;
      } catch {
        allowed = false;
      }
      callback({cancel: !allowed});
    },
  );
}

async function runSmokeTest(window) {
  const timeout = setTimeout(() => {
    process.exitCode = 1;
    app.quit();
  }, 60000);

  try {
    await window.loadURL(COURSE_URL);
    const result = await window.webContents.executeJavaScript(`({
      crossOriginIsolated: window.crossOriginIsolated,
      hasCourseRoot: Boolean(document.getElementById("root")),
      serviceWorkersAvailable: "serviceWorker" in navigator
    })`);
    if (!result.crossOriginIsolated || !result.hasCourseRoot || !result.serviceWorkersAvailable) {
      throw new Error(`Desktop smoke test failed: ${JSON.stringify(result)}`);
    }

    const pythonResult = await window.webContents.executeJavaScript(`(async () => {
      const waitFor = async (predicate, timeoutMs = 45000) => {
        const deadline = Date.now() + timeoutMs;
        while (Date.now() < deadline) {
          const value = predicate();
          if (value) return value;
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        throw new Error("Timed out waiting for the local Python runtime");
      };

      const input = await waitFor(() => {
        const candidate = document.querySelector('input[name="react-console-emulator__input"]');
        return candidate && !candidate.disabled ? candidate : null;
      });
      input.value = "1 + 2";
      input.dispatchEvent(new KeyboardEvent("keydown", {key: "Enter", bubbles: true}));
      try {
        await waitFor(() => {
          const state = window.reduxStore?.getState().book;
          const terminal = document.querySelector('[name="react-console-emulator__content"]');
          return state && !state.processing && terminal?.textContent.includes("3");
        });
      } catch (error) {
        const state = window.reduxStore?.getState().book;
        const terminal = document.querySelector('[name="react-console-emulator__content"]');
        throw new Error(
          error.message + "; state=" + JSON.stringify({processing: state?.processing, running: state?.running, error: state?.error}) +
          "; terminal=" + JSON.stringify(terminal?.textContent)
        );
      }

      localStorage.setItem("futurecoder-offline-smoke", "preserved");
      return {ranPython: true, savedLocalData: localStorage.getItem("futurecoder-offline-smoke")};
    })()`);
    if (!pythonResult.ranPython || pythonResult.savedLocalData !== "preserved") {
      throw new Error(`Python smoke test failed: ${JSON.stringify(pythonResult)}`);
    }
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    clearTimeout(timeout);
    app.quit();
  }
}

async function createWindow() {
  const webPreferences = {
    contextIsolation: true,
    nodeIntegration: false,
    sandbox: true,
  };
  if (SMOKE_TEST) {
    webPreferences.partition = `futurecoder-offline-smoke-${process.pid}`;
  }
  const window = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 900,
    minHeight: 650,
    show: !SMOKE_TEST,
    backgroundColor: "#ffffff",
    webPreferences,
  });
  blockNetworkRequests(window.webContents.session);

  window.webContents.setWindowOpenHandler(() => ({action: "deny"}));
  window.webContents.on("will-navigate", (event, targetUrl) => {
    if (!targetUrl.startsWith(`${APP_ORIGIN}/`)) {
      event.preventDefault();
    }
  });

  if (SMOKE_TEST) {
    await runSmokeTest(window);
  } else {
    await window.loadURL(COURSE_URL);
  }
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    const window = BrowserWindow.getAllWindows()[0];
    if (window) {
      if (window.isMinimized()) window.restore();
      window.focus();
    }
  });

  app.whenReady().then(() => {
    courseServer = createCourseServer(courseRoot());
    courseServer.once("error", (error) => {
      const message = error.code === "EADDRINUSE"
        ? `futurecoder Offline could not start because local port ${PORT} is already in use.`
        : `futurecoder Offline could not start its local course server: ${error.message}`;
      if (!SMOKE_TEST) dialog.showErrorBox("futurecoder Offline", message);
      else console.error(message);
      process.exitCode = 1;
      app.quit();
    });
    courseServer.listen(PORT, HOST, createWindow);
  });
}

app.on("window-all-closed", () => app.quit());
app.on("before-quit", () => courseServer?.close());
