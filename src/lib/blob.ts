const ACCEPTED_PREFIXES = ['image/', 'application/pdf'];

export function isAcceptedContentType(contentType: string) {
  return ACCEPTED_PREFIXES.some((prefix) => contentType.startsWith(prefix));
}
