const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_DIMENSION = 1600;

export function isImageFile(file) {
  return Boolean(file?.type?.startsWith("image/"));
}

export function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Could not read image file."));
    reader.readAsDataURL(file);
  });
}

export async function compressImageDataUrl(
  dataUrl,
  { maxDimension = MAX_DIMENSION, quality = 0.86 } = {}
) {
  if (!dataUrl?.startsWith("data:image/")) return dataUrl;
  if (dataUrl.startsWith("data:image/gif") || dataUrl.startsWith("data:image/svg")) {
    return dataUrl;
  }

  const image = await loadImage(dataUrl);
  const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));

  if (scale >= 1 && dataUrl.length < 350_000) {
    return dataUrl;
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return dataUrl;
  ctx.drawImage(image, 0, 0, width, height);

  const outputType = dataUrl.startsWith("data:image/png") ? "image/png" : "image/jpeg";
  const compressed =
    outputType === "image/png"
      ? canvas.toDataURL("image/png")
      : canvas.toDataURL("image/jpeg", quality);

  return compressed.length < dataUrl.length ? compressed : dataUrl;
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not decode image."));
    image.src = src;
  });
}

export async function prepareImageFile(file) {
  if (!isImageFile(file)) {
    throw new Error("Only image files can be inserted.");
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error("Image is too large. Please use a file under 8MB.");
  }
  const dataUrl = await fileToDataUrl(file);
  return compressImageDataUrl(dataUrl);
}

export function htmlHasRemoteImages(html = "") {
  return /<img\b[^>]*\bsrc=["']https?:\/\//i.test(html);
}

export async function localizeHtmlImages(html, localizeUrl) {
  if (!html || !htmlHasRemoteImages(html)) {
    return { html, changed: false };
  }

  const doc = new DOMParser().parseFromString(html, "text/html");
  const images = [...doc.querySelectorAll("img[src]")];
  let changed = false;

  for (const img of images) {
    const src = img.getAttribute("src") || "";
    if (!/^https?:\/\//i.test(src)) continue;
    try {
      const dataUrl = await localizeUrl(src);
      if (dataUrl?.startsWith("data:image/")) {
        const compressed = await compressImageDataUrl(dataUrl);
        img.setAttribute("src", compressed);
        img.removeAttribute("srcset");
        changed = true;
      }
    } catch {
      // Keep the original URL if localization fails.
    }
  }

  if (!changed) {
    return { html, changed: false };
  }

  return { html: doc.body.innerHTML, changed: true };
}
