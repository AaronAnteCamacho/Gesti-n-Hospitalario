import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";

function uint8ToBase64(uint8) {
  let binary = "";
  const chunkSize = 0x8000;

  for (let i = 0; i < uint8.length; i += chunkSize) {
    const chunk = uint8.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

export function isNativeMobile() {
  const platform = Capacitor.getPlatform();
  return platform === "android" || platform === "ios";
}

function downloadInBrowser(uint8, filename, mimeType) {
  const blob = new Blob([uint8], { type: mimeType });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";

  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export async function saveAndShareFile({ buffer, filename, mimeType }) {
  const uint8 = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);

  // COMPUTADORA / WEB = SOLO DESCARGA
  if (!isNativeMobile()) {
    downloadInBrowser(uint8, filename, mimeType);
    return;
  }

  // TELÉFONO / APK = GUARDAR Y COMPARTIR
  const base64Data = uint8ToBase64(uint8);

  const result = await Filesystem.writeFile({
    path: filename,
    data: base64Data,
    directory: Directory.Documents,
    recursive: true,
  });

  await Share.share({
    title: filename,
    text: `Archivo generado: ${filename}`,
    url: result.uri,
    dialogTitle: "Compartir archivo",
  });
}