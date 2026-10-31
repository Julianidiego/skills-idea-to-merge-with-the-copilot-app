import assert from 'node:assert/strict';
import test from 'node:test';
import {
  filterBookmarks,
  formatBookmark,
  normalizeUrl,
  parseStoredBookmarks,
  type Bookmark,
} from './bookmarks.ts';

const bookmarks: Bookmark[] = [
  { url: 'https://example.com/articles/mona', slug: 'mona-7fk2' },
  { url: 'https://github.com/mona', slug: 'mona-ab12' },
  { url: 'https://astro.build', slug: 'mona-cd34' },
];

test('normalizes URLs with and without https to the same value', () => {
  assert.equal(normalizeUrl('example.com'), normalizeUrl('https://example.com'));
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
    formatBookmark({ url: 'https://www.example.com', slug: 'mona-7fk2' }),
    'https://www.example.com :: mona-7fk2',
  );
});

test('filters bookmarks by full or partial URL case-insensitively', () => {
  assert.deepEqual(filterBookmarks(bookmarks, 'HTTPS://EXAMPLE.COM/ARTICLES/MONA'), [bookmarks[0]]);
  assert.deepEqual(filterBookmarks(bookmarks, 'github'), [bookmarks[1]]);
});

test('filters bookmarks by slug', () => {
  assert.deepEqual(filterBookmarks(bookmarks, 'mona-AB12'), [bookmarks[1]]);
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
