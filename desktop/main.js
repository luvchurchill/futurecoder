const path = require("node:path");
const {app, BrowserWindow, dialog} = require("electron");
const {isAllowedNavigation, isBirdseyeViewerUrl} = require("./navigation");
const {createCourseServer} = require("./server");

const HOST = "127.0.0.1";
const PORT = 41731;
const APP_ORIGIN = `http://${HOST}:${PORT}`;
const COURSE_URL = `${APP_ORIGIN}/course/`;
const SMOKE_TEST = process.argv.includes("--smoke-test");

let courseServer;

const windowOptions = {
  width: 1280,
  height: 820,
  minWidth: 900,
  minHeight: 650,
  backgroundColor: "#ffffff",
  webPreferences: {
    contextIsolation: true,
    nodeIntegration: false,
    sandbox: true,
  },
};

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

function preventExternalNavigation(webContents) {
  webContents.on("will-navigate", (event, targetUrl) => {
    if (!isAllowedNavigation(targetUrl, APP_ORIGIN)) {
      event.preventDefault();
    }
  });
}

function allowBirdseyeViewer(window) {
  window.webContents.setWindowOpenHandler(({url}) => {
    if (!isBirdseyeViewerUrl(url, APP_ORIGIN)) {
      return {action: "deny"};
    }
    return {
      action: "allow",
      overrideBrowserWindowOptions: {
        ...windowOptions,
        show: !SMOKE_TEST,
        title: "Bird's Eye - futurecoder Offline",
        webPreferences: {
          ...windowOptions.webPreferences,
          session: window.webContents.session,
        },
      },
    };
  });
  window.webContents.on("did-create-window", (childWindow) => {
    preventExternalNavigation(childWindow.webContents);
    childWindow.webContents.setWindowOpenHandler(() => ({action: "deny"}));
  });
}

function waitFor(predicate, timeoutMs, message) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      clearInterval(interval);
      reject(new Error(message));
    }, timeoutMs);
    const interval = setInterval(() => {
      const value = predicate();
      if (!value) return;
      clearTimeout(timeout);
      clearInterval(interval);
      resolve(value);
    }, 100);
  });
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

    const birdseyeWindowPromise = waitFor(
      () => BrowserWindow.getAllWindows().find(candidate => candidate !== window),
      45000,
      "Timed out waiting for the Bird's Eye window",
    );
    await window.webContents.executeJavaScript(`(async () => {
      window.location.hash = "ide";
      const deadline = Date.now() + 10000;
      while (Date.now() < deadline) {
        const input = document.querySelector("#editor textarea");
        const button = [...document.querySelectorAll(".editor-buttons button")]
          .find(candidate => candidate.textContent.includes("birdseye"));
        if (input && button && !button.disabled) {
          input.focus();
          return true;
        }
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      throw new Error("Timed out waiting for the Bird's Eye editor controls");
    })()`);
    window.webContents.insertText("numbers = [1, 2, 3]\\nprint(numbers[0])");
    await window.webContents.executeJavaScript(`(async () => {
      const deadline = Date.now() + 5000;
      while (Date.now() < deadline) {
        const state = window.reduxStore?.getState().book;
        if (state?.editorContent.includes("numbers = [1, 2, 3]")) {
          const button = [...document.querySelectorAll(".editor-buttons button")]
            .find(candidate => candidate.textContent.includes("birdseye"));
          button.click();
          return true;
        }
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      throw new Error("Timed out entering the Bird's Eye smoke-test program");
    })()`);

    const birdseyeWindow = await birdseyeWindowPromise;
    await waitFor(
      () => !birdseyeWindow.webContents.isLoading(),
      15000,
      "Timed out loading the Bird's Eye viewer",
    );
    const birdseyeResult = await birdseyeWindow.webContents.executeJavaScript(`(async () => {
      const deadline = Date.now() + 10000;
      while (Date.now() < deadline) {
        const code = document.querySelector("#code");
        if (code?.textContent.includes("numbers = [1, 2, 3]")) {
          return {renderedCode: true, expressionBoxes: code.querySelectorAll(".box").length};
        }
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      throw new Error("Timed out rendering the Bird's Eye trace");
    })()`);
    if (!birdseyeResult.renderedCode || birdseyeResult.expressionBoxes < 1) {
      throw new Error(`Bird's Eye smoke test failed: ${JSON.stringify(birdseyeResult)}`);
    }
    birdseyeWindow.close();
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    clearTimeout(timeout);
    app.quit();
  }
}

async function createWindow() {
  const options = {...windowOptions, webPreferences: {...windowOptions.webPreferences}};
  if (SMOKE_TEST) {
    options.webPreferences.partition = `futurecoder-offline-smoke-${process.pid}`;
  }
  const window = new BrowserWindow({
    ...options,
    show: !SMOKE_TEST,
  });
  blockNetworkRequests(window.webContents.session);

  allowBirdseyeViewer(window);
  preventExternalNavigation(window.webContents);

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
