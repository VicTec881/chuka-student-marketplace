// Validation for product photos sent as data URLs ("data:image/jpeg;base64,...").
// The browser resizes photos first, but only this code is trusted: the file type is decided
// by looking at the actual bytes, never by the name or declared type alone.

const MAX_IMAGE_BYTES = 1_500_000; // decoded size; the browser sends far less after resizing

const SIGNATURES = [
  { mime: "image/jpeg", ext: "jpg", test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  {
    mime: "image/png",
    ext: "png",
    test: (b) => b.length > 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  },
  {
    mime: "image/webp",
    ext: "webp",
    test: (b) => b.length > 12 && b.subarray(0, 4).toString("latin1") === "RIFF" && b.subarray(8, 12).toString("latin1") === "WEBP"
  }
];

/** Returns { ok: true, buffer, mime, ext } or { ok: false, message }. */
function parseImageDataUrl(value) {
  const match = /^data:image\/(?:jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(typeof value === "string" ? value : "");
  if (!match) return { ok: false, message: "Upload a JPG, PNG or WebP photo." };
  if (match[1].length > Math.ceil((MAX_IMAGE_BYTES * 4) / 3) + 4) {
    return { ok: false, message: "That photo is too large. Try a smaller one." };
  }
  const buffer = Buffer.from(match[1], "base64");
  if (buffer.length === 0 || buffer.length > MAX_IMAGE_BYTES) {
    return { ok: false, message: "That photo is too large. Try a smaller one." };
  }
  const sig = SIGNATURES.find((s) => s.test(buffer));
  if (!sig) return { ok: false, message: "That file is not a real JPG, PNG or WebP photo." };
  return { ok: true, buffer, mime: sig.mime, ext: sig.ext };
}

module.exports = { MAX_IMAGE_BYTES, parseImageDataUrl };
