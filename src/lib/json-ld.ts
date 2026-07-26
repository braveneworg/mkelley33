/**
 * Serializes a JSON-LD payload for safe embedding in a <script> tag.
 * Escapes `<` so content containing `</script` cannot terminate the tag.
 */
export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}
