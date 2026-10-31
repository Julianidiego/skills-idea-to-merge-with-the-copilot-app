import assert from 'node:assert/strict';
import test from 'node:test';
import { formatBookmark, normalizeUrl, parseStoredBookmarks } from './bookmarks.ts';

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
