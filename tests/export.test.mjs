import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';

test('static export provides an empty wiki without starter material', async () => {
  const html = await readFile('out/index.html', 'utf8');
  assert.ok(html.includes('No articles yet.'));
  assert.ok(html.includes('id="main"'));
  assert.ok(!html.includes('/topics/'));
  assert.ok(!html.includes('Winner takes all'));
  await assert.rejects(access('out/topics/electoral-systems/index.html'));
});

test('404 export provides navigation back to the wiki', async () => {
  const html = await readFile('out/404.html', 'utf8');
  assert.ok(html.includes('Page not found'));
  assert.ok(html.includes('Return to the wiki'));
});
