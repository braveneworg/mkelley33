/**
 * Serializes a JSON-LD payload for safe embedding in a <script> tag.
 * Escapes `<` so content containing `</script` cannot terminate the tag.
 */
export const serializeJsonLd = (value: unknown): string =>
  JSON.stringify(value).replace(/</g, '\\u003c');
