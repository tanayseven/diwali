// Base64 over UTF-8 bytes, so names in any script survive the round trip.
// ASCII names encode identically to plain btoa, keeping old links valid.
export function encodeName(name: string): string {
  const bytes = new TextEncoder().encode(name);
  return btoa(Array.from(bytes, byte => String.fromCharCode(byte)).join(""));
}

export function decodeName(encoded: string): string {
  const binary = atob(encoded);
  const bytes = Uint8Array.from(binary, ch => ch.charCodeAt(0));
  try {
    return new TextDecoder("utf-8", {fatal: true}).decode(bytes);
  } catch {
    // Links made with the old btoa encoding of Latin-1 names
    return binary;
  }
}

export function toTitleCase(str: string): string {
  return str.replace(
    /\w\S*/g,
    text => text.charAt(0).toUpperCase() + text.substring(1).toLowerCase()
  );
}
