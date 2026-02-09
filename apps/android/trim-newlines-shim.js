// CJS shim for trim-newlines v5 (ESM-only).
// react-native-code-highlighter needs named exports from trim-newlines v5,
// but pnpm hoists v3 (default export only). Pointing Metro's resolveRequest
// into .pnpm store fails in CI (SHA-1 hash error for unwatched paths).
// This local shim provides the same named exports as v5 in CJS format.

function trimNewlines(string) {
  let start = 0;
  let end = string.length;
  while (start < end && (string[start] === '\r' || string[start] === '\n')) {
    start++;
  }
  while (end > start && (string[end - 1] === '\r' || string[end - 1] === '\n')) {
    end--;
  }
  return (start > 0 || end < string.length) ? string.slice(start, end) : string;
}

function trimNewlinesStart(string) {
  const end = string.length;
  let start = 0;
  while (start < end && (string[start] === '\r' || string[start] === '\n')) {
    start++;
  }
  return start > 0 ? string.slice(start, end) : string;
}

function trimNewlinesEnd(string) {
  let end = string.length;
  while (end > 0 && (string[end - 1] === '\r' || string[end - 1] === '\n')) {
    end--;
  }
  return end < string.length ? string.slice(0, end) : string;
}

module.exports = { trimNewlines, trimNewlinesStart, trimNewlinesEnd };
