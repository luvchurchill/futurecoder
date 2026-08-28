const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".data": "application/octet-stream",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".tar": "application/x-tar",
  ".wasm": "application/wasm",
  ".whl": "application/zip",
  ".zip": "application/zip",
};

function contentType(filePath) {
  const basename = path.basename(filePath);
  if (basename.endsWith(".load_by_url")) {
    if (basename.includes(".json.")) return MIME_TYPES[".json"];
    if (basename.includes(".tar.")) return MIME_TYPES[".tar"];
  }
  return MIME_TYPES[path.extname(filePath).toLowerCase()] || "application/octet-stream";
}

function securityHeaders() {
  return {
    "Cross-Origin-Embedder-Policy": "require-corp",
    "Cross-Origin-Opener-Policy": "same-origin",
    "Cross-Origin-Resource-Policy": "same-origin",
    "Origin-Agent-Cluster": "?1",
    "X-Content-Type-Options": "nosniff",
  };
}

function resolveCoursePath(courseRoot, requestUrl) {
  const url = new URL(requestUrl, "http://127.0.0.1");
  let pathname;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    return null;
  }

  if (pathname === "/" || pathname === "/course") {
    pathname = "/course/";
  }
  if (!pathname.startsWith("/course/")) {
    return null;
  }

  const relativePath = pathname.slice("/course/".length) || "index.html";
  const root = path.resolve(courseRoot);
  const candidate = path.resolve(root, relativePath);
  if (candidate !== root && !candidate.startsWith(`${root}${path.sep}`)) {
    return null;
  }
  return candidate;
}

function createCourseServer(courseRoot) {
  return http.createServer((request, response) => {
    const headers = securityHeaders();
    if (request.method !== "GET" && request.method !== "HEAD") {
      response.writeHead(405, {...headers, Allow: "GET, HEAD"});
      response.end();
      return;
    }

    const filePath = resolveCoursePath(courseRoot, request.url);
    if (!filePath) {
      response.writeHead(404, headers);
      response.end("Not found");
      return;
    }

    fs.stat(filePath, (statError, stat) => {
      if (statError || !stat.isFile()) {
        response.writeHead(404, headers);
        response.end("Not found");
        return;
      }

      const immutableAsset = /\.[0-9a-f]{8}\./.test(path.basename(filePath));
      response.writeHead(200, {
        ...headers,
        "Cache-Control": immutableAsset ? "public, max-age=31536000, immutable" : "no-cache",
        "Content-Length": stat.size,
        "Content-Type": contentType(filePath),
      });
      if (request.method === "HEAD") {
        response.end();
        return;
      }
      fs.createReadStream(filePath).pipe(response);
    });
  });
}

module.exports = {contentType, createCourseServer, resolveCoursePath, securityHeaders};
