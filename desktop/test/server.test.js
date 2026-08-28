const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const {contentType, createCourseServer, resolveCoursePath} = require("../server");

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
  const root = path.join(path.sep, "tmp", "course");
  assert.equal(resolveCoursePath(root, "/course/"), path.join(root, "index.html"));
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

test("serves course files with isolation and MIME headers", async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "futurecoder-server-"));
  fs.writeFileSync(path.join(root, "index.html"), "<main>offline</main>");
  fs.writeFileSync(path.join(root, "runtime.wasm"), "wasm");
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

  const wasm = await request(port, "/course/runtime.wasm", "HEAD");
  assert.equal(wasm.status, 200);
  assert.equal(wasm.body, "");
  assert.equal(wasm.headers["content-type"], "application/wasm");

  assert.equal((await request(port, "/course/missing.js")).status, 404);
  assert.equal((await request(port, "/course/", "POST")).status, 405);
});
