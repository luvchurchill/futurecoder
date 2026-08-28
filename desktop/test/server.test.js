const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const {isAllowedNavigation, isBirdseyeViewerUrl} = require("../navigation");
const {contentType, createCourseServer, resolveCoursePath} = require("../server");

const appOrigin = "http://127.0.0.1:41731";

function request(port, pathname, method = "GET") {
  return new Promise((resolve, reject) => {
    const req = http.request({host: "127.0.0.1", port, path: pathname, method}, (response) => {
      const chunks = [];
      response.on("data", (chunk) => chunks.push(chunk));
      response.on("end", () => resolve({
        body: Buffer.concat(chunks).toString(),
        headers: response.headers,
        status: response.statusCode,
      }));
    });
    req.on("error", reject);
    req.end();
  });
}

test("resolves only files beneath /course/", () => {
  const root = path.resolve("test-course-root");
  assert.equal(resolveCoursePath(root, "/course/"), path.join(root, "index.html"));
  assert.equal(
    resolveCoursePath(root, "/course/birdseye/?call_id=abc123"),
    path.join(root, "birdseye", "index.html"),
  );
  assert.equal(resolveCoursePath(root, "/course/static/app.js"), path.join(root, "static", "app.js"));
  assert.equal(resolveCoursePath(root, "/elsewhere"), null);
  assert.equal(resolveCoursePath(root, "/course/%2e%2e/secret"), null);
  assert.equal(resolveCoursePath(root, "/course/%E0%A4%A"), null);
});

test("recognises generated load-by-URL asset types", () => {
  assert.equal(contentType("pages.json.12345678.load_by_url"), "application/json; charset=utf-8");
  assert.equal(contentType("python_core.tar.12345678.load_by_url"), "application/x-tar");
  assert.equal(contentType("pyodide.asm.wasm"), "application/wasm");
});

test("allows only the local Bird's Eye viewer to open a window", () => {
  assert.equal(
    isBirdseyeViewerUrl(`${appOrigin}/course/birdseye/?call_id=abc123`, appOrigin),
    true,
  );
  assert.equal(isBirdseyeViewerUrl(`${appOrigin}/course/birdseye/`, appOrigin), false);
  assert.equal(isBirdseyeViewerUrl(`${appOrigin}/course/`, appOrigin), false);
  assert.equal(
    isBirdseyeViewerUrl("https://example.com/course/birdseye/?call_id=abc123", appOrigin),
    false,
  );
});

test("allows navigation only within the fixed local app origin", () => {
  assert.equal(isAllowedNavigation(`${appOrigin}/course/`, appOrigin), true);
  assert.equal(isAllowedNavigation(`${appOrigin}/course/birdseye/?call_id=1`, appOrigin), true);
  assert.equal(isAllowedNavigation("https://futurecoder.io/course/", appOrigin), false);
  assert.equal(isAllowedNavigation("not a URL", appOrigin), false);
});

test("serves course files with isolation and MIME headers", async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "futurecoder-server-"));
  fs.writeFileSync(path.join(root, "index.html"), "<main>offline</main>");
  fs.writeFileSync(path.join(root, "runtime.wasm"), "wasm");
  fs.mkdirSync(path.join(root, "birdseye"));
  fs.writeFileSync(path.join(root, "birdseye", "index.html"), "<main>birdseye</main>");
  const server = createCourseServer(root);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => {
    server.close();
    fs.rmSync(root, {recursive: true, force: true});
  });
  const port = server.address().port;

  const page = await request(port, "/course/");
  assert.equal(page.status, 200);
  assert.equal(page.body, "<main>offline</main>");
  assert.equal(page.headers["content-type"], "text/html; charset=utf-8");
  assert.equal(page.headers["cross-origin-opener-policy"], "same-origin");
  assert.equal(page.headers["cross-origin-embedder-policy"], "require-corp");

  const birdseye = await request(port, "/course/birdseye/?call_id=abc123");
  assert.equal(birdseye.status, 200);
  assert.equal(birdseye.body, "<main>birdseye</main>");

  const wasm = await request(port, "/course/runtime.wasm", "HEAD");
  assert.equal(wasm.status, 200);
  assert.equal(wasm.body, "");
  assert.equal(wasm.headers["content-type"], "application/wasm");

  assert.equal((await request(port, "/course/missing.js")).status, 404);
  assert.equal((await request(port, "/course/", "POST")).status, 405);
});
