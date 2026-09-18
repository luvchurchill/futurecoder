const fs = require("node:fs");
const path = require("node:path");
const {app, BrowserWindow, dialog} = require("electron");
const {isAllowedNavigation, isBirdseyeViewerUrl} = require("./navigation");
const {createCourseServer} = require("./server");

const HOST = "127.0.0.1";
const PORT = 41731;
const APP_ORIGIN = `http://${HOST}:${PORT}`;
const COURSE_URL = `${APP_ORIGIN}/course/`;
const SMOKE_TEST = process.argv.includes("--smoke-test");
const SMOKE_RESULT_PATH = process.env.FUTURECODER_SMOKE_RESULT;

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

async function runSmokeTest(window) {
  const timeout = setTimeout(() => {
    if (SMOKE_RESULT_PATH) {
      fs.writeFileSync(SMOKE_RESULT_PATH, JSON.stringify({success: false, error: "Desktop smoke test timed out"}));
    }
    app.exit(1);
  }, 510000);
  let exitCode = 0;
  let failure;
  let validation;

  try {
    validation = await require('./smoke').runChecks(window, COURSE_URL);

  } catch (error) {
    console.error(error);
    exitCode = 1;
    failure = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  } finally {
    clearTimeout(timeout);
    if (SMOKE_RESULT_PATH) {
      fs.writeFileSync(SMOKE_RESULT_PATH, JSON.stringify({success: exitCode === 0, error: failure, electron: process.versions.electron, arch: process.arch, ...validation}));
    }
    app.exit(exitCode);
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
