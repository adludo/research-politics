import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
test('home export contains wiki, controls, and infographic', async () => {
 const html = await readFile('out/index.html', 'utf8');
 for (const text of ['Follow your curiosity.', 'Search topics', 'Party A vote share', 'Winner takes all', 'id="library"', 'id="lab"']) assert.ok(html.includes(text), text);
 for (const slug of ['electoral-systems', 'separation-of-powers', 'collective-action', 'policy-cycle']) assert.ok(html.includes(`/topics/${slug}/`), slug);
});
for (const slug of ['electoral-systems', 'separation-of-powers', 'collective-action', 'policy-cycle']) {
 test(`exported article: ${slug}`, async () => {
 const html = await readFile(`out/topics/${slug}/index.html`, 'utf8');
 assert.ok(html.includes('THE TAKEAWAY'));
 assert.ok(html.includes('Keep exploring'));
 assert.match(html, /href="https:\/\//);
 });
}
test('404 export exists', async () => assert.ok((await readFile('out/404.html','utf8')).includes('A page off the map.')));
