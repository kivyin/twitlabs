/**
 * Read a text file with Excel-friendly encoding handling.
 * Excel "CSV" on Windows is often Windows-1252, while file.text() is UTF-8.
 * Mis-decoding shows up as U+FFFD () for smart quotes, dashes, ellipses.
 */
export async function readTextFileWithEncoding(file) {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  // UTF-8 BOM
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return new TextDecoder("utf-8").decode(bytes).replace(/^\uFEFF/, "");
  }

  // UTF-16 LE BOM
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
    return new TextDecoder("utf-16le").decode(bytes).replace(/^\uFEFF/, "");
  }

  // UTF-16 BE BOM
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    return new TextDecoder("utf-16be").decode(bytes).replace(/^\uFEFF/, "");
  }

  const utf8 = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  const replacementCount = (utf8.match(/\uFFFD/g) || []).length;
  if (replacementCount === 0) {
    return utf8;
  }

  // Prefer Windows-1252 when UTF-8 produced replacement chars (typical Excel ANSI CSV).
  try {
    const ansi = new TextDecoder("windows-1252").decode(bytes);
    if (!(ansi.match(/\uFFFD/g) || []).length) {
      return ansi;
    }
  } catch {
    // windows-1252 unsupported in rare environments
  }

  try {
    const latin1 = new TextDecoder("iso-8859-1").decode(bytes);
    return latin1;
  } catch {
    return utf8;
  }
}
