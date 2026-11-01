import assert from 'node:assert/strict';
import test from 'node:test';
import {
  exportBookmarksToJSON,
  filterBookmarks,
  formatBookmark,
  importBookmarksFromJSON,
  isBookmark,
  normalizeUrl,
  normalizeBookmark,
  normalizeTags,
  parseTags,
  parseStoredBookmarks,
  updateBookmark,
  type Bookmark,
} from './bookmarks.ts';

const bookmarks: Bookmark[] = [
  { url: 'https://example.com/articles/mona', slug: 'mona-7fk2', tags: ['reading', 'work'] },
  { url: 'https://github.com/mona', slug: 'mona-ab12', tags: ['code'] },
  { url: 'https://astro.build/', slug: 'mona-cd34', tags: [] },
];

test('normalizes URLs with and without https to the same value', () => {
  assert.equal(normalizeUrl('example.com'), normalizeUrl('https://example.com'));
});

test('rejects empty, whitespace-only, and non-web URLs', () => {
  for (const value of ['', '   ', 'javascript:alert(1)', 'mailto:mona@example.com']) {
    assert.throws(() => normalizeUrl(value), /required|Only HTTP and HTTPS/);
  }
});

test('normalizes valid bookmarks and rejects corrupted bookmark shapes', () => {
  assert.deepEqual(normalizeBookmark({ url: ' example.com ', slug: 'mona-7fk2' }), {
    url: 'https://example.com/',
    slug: 'mona-7fk2',
    tags: [],
  });
  assert.deepEqual(
    normalizeBookmark({
      url: 'example.com',
      slug: 'mona-7fk2',
      tags: [' Work ', 'work', '', 42],
    }),
    { url: 'https://example.com/', slug: 'mona-7fk2', tags: ['work'] },
  );
  for (const value of [
    null,
    42,
    {},
    { url: 'https://example.com' },
    { slug: 'mona-7fk2' },
    { url: 'https://example.com', slug: 'bad' },
    { url: '', slug: 'mona-7fk2' },
  ]) {
    assert.equal(normalizeBookmark(value), null);
    assert.equal(isBookmark(value), false);
  }
});

test('recovers from invalid stored values', () => {
  for (const raw of [
    '',
    'not json',
    '{"url":"https://example.com","slug":"mona-7fk2"}',
    '{"legacy":"value"}',
    'null',
    '["legacy"]',
    '[{"url":"not a url","slug":"mona-7fk2"}]',
    '[{"url":"https://example.com","slug":"bad"}]',
  ]) {
    assert.deepEqual(parseStoredBookmarks(raw), []);
  }
});

test('formats a saved bookmark with the exact separator', () => {
  assert.equal(
    formatBookmark({ url: 'https://www.example.com', slug: 'mona-7fk2', tags: [] }),
    'https://www.example.com :: mona-7fk2',
  );
});

test('updates a bookmark URL while preserving its slug', () => {
  const updated = updateBookmark(bookmarks, 'mona-7fk2', 'new.example/path');

  assert.deepEqual(updated, [
    { url: 'https://new.example/path', slug: 'mona-7fk2', tags: ['reading', 'work'] },
    bookmarks[1],
    bookmarks[2],
  ]);
  assert.deepEqual(bookmarks[0], {
    url: 'https://example.com/articles/mona',
    slug: 'mona-7fk2',
    tags: ['reading', 'work'],
  });
});

test('rejects empty, malformed, missing, and duplicate bookmark edits', () => {
  for (const value of ['', '   ', 'javascript:alert(1)', 'not a URL']) {
    assert.throws(() => updateBookmark(bookmarks, 'mona-7fk2', value));
  }
  assert.throws(() => updateBookmark([], 'mona-7fk2', 'example.com'), /not found/);
  assert.throws(
    () => updateBookmark(bookmarks, 'mona-7fk2', 'https://github.com/mona'),
    /already exists/,
  );
});

test('normalizes and parses tags while removing empty and duplicate values', () => {
  assert.deepEqual(normalizeTags([' Work ', 'work', '', 'READING', 42, null]), ['work', 'reading']);
  assert.deepEqual(parseTags(' Work, reading, work, , '), ['work', 'reading']);
  assert.deepEqual(parseTags(''), []);
  assert.deepEqual(normalizeTags('work'), []);
});

test('updates tags without changing URL or slug', () => {
  assert.deepEqual(updateBookmark(bookmarks, 'mona-7fk2', 'example.com', ['New', 'new']), [
    { ...bookmarks[0], url: 'https://example.com/', tags: ['new'] },
    bookmarks[1],
    bookmarks[2],
  ]);
});

test('handles null bookmark lists and preserves edge-case URL normalization', () => {
  assert.throws(() => updateBookmark(null, 'mona-7fk2', 'example.com'), /not found/);
  assert.deepEqual(updateBookmark([{ url: 'https://example.com/', slug: 'mona-7fk2' }], 'mona-7fk2', 'HTTPS://EXAMPLE.COM'), [
    { url: 'https://example.com/', slug: 'mona-7fk2', tags: [] },
  ]);
});

test('filters bookmarks by full or partial URL case-insensitively', () => {
  assert.deepEqual(filterBookmarks(bookmarks, 'HTTPS://EXAMPLE.COM/ARTICLES/MONA'), [bookmarks[0]]);
  assert.deepEqual(filterBookmarks(bookmarks, 'github'), [bookmarks[1]]);
});

test('filters bookmarks by slug', () => {
  assert.deepEqual(filterBookmarks(bookmarks, 'mona-AB12'), [bookmarks[1]]);
});

test('filters bookmarks by tag', () => {
  assert.deepEqual(filterBookmarks(bookmarks, 'READING'), [bookmarks[0]]);
});

test('returns all bookmarks for an empty query', () => {
  assert.deepEqual(filterBookmarks(bookmarks, ''), bookmarks);
  assert.deepEqual(filterBookmarks(bookmarks, '   '), bookmarks);
  assert.deepEqual(filterBookmarks(bookmarks, undefined), bookmarks);
});

test('handles empty or null bookmark lists without throwing', () => {
  assert.deepEqual(filterBookmarks([], 'mona-'), []);
  assert.deepEqual(filterBookmarks(null, 'mona-'), []);
  assert.deepEqual(filterBookmarks(undefined, 'mona-'), []);
});

test('exports bookmarks as formatted valid JSON', () => {
  const exported = exportBookmarksToJSON(bookmarks);

  assert.match(exported, /\n/);
  assert.deepEqual(JSON.parse(exported), bookmarks);
});

test('imports valid JSON bookmarks', () => {
  assert.deepEqual(importBookmarksFromJSON(JSON.stringify(bookmarks)), bookmarks);
});

test('normalizes and deduplicates imported bookmarks by URL and slug', () => {
  const imported = importBookmarksFromJSON(
    JSON.stringify([
      { url: 'example.com', slug: 'mona-7fk2' },
      { url: 'https://example.com/', slug: 'mona-new1' },
      { url: 'https://other.example', slug: 'mona-7fk2' },
      { url: 'https://other.example', slug: 'mona-new2' },
    ]),
  );

  assert.deepEqual(imported, [
    { url: 'https://example.com/', slug: 'mona-7fk2', tags: [] },
    { url: 'https://other.example/', slug: 'mona-new2', tags: [] },
  ]);
});

test('sanitizes malformed imported JSON without throwing', () => {
  assert.deepEqual(
    importBookmarksFromJSON(
      JSON.stringify([
        bookmarks[0],
        { url: 'https://missing-slug.example' },
        { slug: 'mona-bad1' },
        { url: 'not a URL', slug: 'mona-1234' },
        { url: 'https://invalid-slug.example', slug: 'not-a-slug' },
        'not a bookmark',
      ]),
    ),
    [bookmarks[0]],
  );
  assert.deepEqual(importBookmarksFromJSON('{broken json'), []);
  assert.deepEqual(importBookmarksFromJSON(JSON.stringify({ bookmarks })), []);
  assert.deepEqual(importBookmarksFromJSON(null), []);
});

test('exports only unique, normalized valid bookmarks', () => {
  const exported = JSON.parse(
    exportBookmarksToJSON([
      { url: 'example.com', slug: 'mona-7fk2' },
      { url: 'https://example.com/', slug: 'mona-new1' },
      { url: 'https://other.example', slug: 'bad' },
    ]),
  );

  assert.deepEqual(exported, [{ url: 'https://example.com/', slug: 'mona-7fk2', tags: [] }]);
});
