export interface Bookmark {
  url: string;
  slug: string;
}

const BASE62 = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
const SLUG_LENGTH = 4;
const SLUG_SPACE = BASE62.length ** SLUG_LENGTH;
const SLUG_PATTERN = /^mona-[0-9a-zA-Z]{4}$/;

export function normalizeUrl(value: string): string {
  const trimmed = value.trim();
  const withProtocol = /^[a-z][a-z\d+\-.]*:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  const url = new URL(withProtocol);

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('Only HTTP and HTTPS URLs are supported.');
  }

  return url.href;
}

export function isBookmark(value: unknown): value is Bookmark {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Record<string, unknown>).url === 'string' &&
    typeof (value as Record<string, unknown>).slug === 'string' &&
    normalizeStoredUrl((value as Record<string, unknown>).url) !== null &&
    SLUG_PATTERN.test((value as Record<string, unknown>).slug)
  );
}

function normalizeStoredUrl(value: string): string | null {
  try {
    return normalizeUrl(value);
  } catch {
    return null;
  }
}

export function parseStoredBookmarks(raw: string | null): Bookmark[] {
  if (!raw) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter(isBookmark).map((bookmark) => ({
          url: normalizeUrl(bookmark.url),
          slug: bookmark.slug,
        }))
      : [];
  } catch {
    return [];
  }
}

export function formatBookmark(bookmark: Bookmark): string {
  return `${bookmark.url} :: ${bookmark.slug}`;
}

export function filterBookmarks(
  bookmarks: Bookmark[] | null | undefined,
  query: string | null | undefined,
): Bookmark[] {
  const storedBookmarks = bookmarks ?? [];
  const normalizedQuery = query?.trim().toLowerCase() ?? '';

  if (!normalizedQuery) {
    return storedBookmarks;
  }

  return storedBookmarks.filter(
    (bookmark) =>
      bookmark.url.toLowerCase().includes(normalizedQuery) ||
      bookmark.slug.toLowerCase().includes(normalizedQuery),
  );
}

export function exportBookmarksToJSON(bookmarks: Bookmark[] | null | undefined): string {
  const validBookmarks = (bookmarks ?? [])
    .filter(isBookmark)
    .map((bookmark) => ({
      url: normalizeUrl(bookmark.url),
      slug: bookmark.slug,
    }));

  return JSON.stringify(validBookmarks, null, 2);
}

export function importBookmarksFromJSON(jsonString: string | null | undefined): Bookmark[] {
  return typeof jsonString === 'string' ? parseStoredBookmarks(jsonString) : [];
}

export function generateSlug(existingSlugs: Iterable<string>, random = Math.random): string {
  const used = new Set(existingSlugs);

  for (let attempt = 0; attempt < SLUG_SPACE; attempt += 1) {
    const value = Math.floor(Math.max(0, Math.min(0.999999999, random())) * SLUG_SPACE);
    const slug = `mona-${toBase62(value).padStart(SLUG_LENGTH, '0')}`;
    if (!used.has(slug)) {
      return slug;
    }
  }

  throw new Error('Unable to generate a unique bookmark slug.');
}

function toBase62(value: number): string {
  let remainder = value;
  let result = '';

  for (let index = 0; index < SLUG_LENGTH; index += 1) {
    result = BASE62[remainder % BASE62.length] + result;
    remainder = Math.floor(remainder / BASE62.length);
  }

  return result;
}
