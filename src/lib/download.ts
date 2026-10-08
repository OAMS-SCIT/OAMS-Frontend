/** Saves a Blob to the user's machine under `fileName` (browser download). */
export function saveBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Revoke after the click has been handled so the download isn't cut off.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/** Today as YYYY-MM-DD in local time — used in downloaded file names. */
export function todayStamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
