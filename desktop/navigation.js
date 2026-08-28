function parseLocalUrl(targetUrl, appOrigin) {
  try {
    const url = new URL(targetUrl);
    return url.origin === appOrigin ? url : null;
  } catch {
    return null;
  }
}

function isAllowedNavigation(targetUrl, appOrigin) {
  return Boolean(parseLocalUrl(targetUrl, appOrigin));
}

function isBirdseyeViewerUrl(targetUrl, appOrigin) {
  const url = parseLocalUrl(targetUrl, appOrigin);
  return Boolean(
    url &&
    url.pathname === "/course/birdseye/" &&
    url.searchParams.get("call_id")
  );
}

module.exports = {isAllowedNavigation, isBirdseyeViewerUrl};
