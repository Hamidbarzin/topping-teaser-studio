export function sanitizeText(value: string, max = 180): string {
  let result = "";
  for (const char of value) {
    const code = char.codePointAt(0) ?? 0;
    if (code < 32 && code !== 9 && code !== 10 && code !== 13) continue;
    result += char;
    if (result.length >= max) break;
  }
  return result;
}
