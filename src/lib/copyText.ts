export async function copyTextToClipboard(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    return;
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
  }
}

export function downloadTextFile(filename: string, text: string, mimeType = "application/json"): void {
  const blob = new Blob([text], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function copyOrDownloadLargeJson(
  payload: unknown,
  downloadFilename: string,
): Promise<"clipboard" | "download"> {
  const json = JSON.stringify(payload, null, 2);

  // Very large payloads often exceed clipboard limits in browsers.
  if (json.length > 1_500_000) {
    downloadTextFile(downloadFilename, json);
    return "download";
  }

  try {
    await copyTextToClipboard(json);
    return "clipboard";
  } catch {
    downloadTextFile(downloadFilename, json);
    return "download";
  }
}
