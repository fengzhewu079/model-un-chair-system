import test from 'node:test';
import assert from 'node:assert/strict';
import { preparePresentationDocument } from '../src/utils/presentationDocument';
const file = (name: string, content: string, type = '') => Object.assign(new Blob([content], {type}), {name}) as File;
test('local documents: PDF requires its header and receives a safe MIME type', async () => {
 assert.equal((await preparePresentationDocument(file('Paper.PDF', '%PDF-1.4\n'))).kind, 'pdf');
 await assert.rejects(preparePresentationDocument(file('fake.pdf', '<html>bad</html>')), /valid PDF/);
});
test('local documents: raster images preview; office and active content stay external', async () => {
 assert.equal((await preparePresentationDocument(file('chart.png', 'data'))).kind, 'image');
 for (const name of ['paper.docx', 'slides.pptx', 'page.html', 'drawing.svg']) {
  assert.equal((await preparePresentationDocument(file(name, 'data', 'text/html'))).kind, 'external');
 }
});
test('local documents: text stays literal and oversized text is not read into the viewer', async () => {
 const result = await preparePresentationDocument(file('paper.txt', '<script>alert(1)</script>'));
 assert.equal(result.kind, 'text'); assert.equal(result.text, '<script>alert(1)</script>');
 assert.equal((await preparePresentationDocument(file('large.txt', 'x'.repeat(2*1024*1024+1)))).kind, 'external');
});
test('local documents: empty and oversized files fail before reading', async () => {
 await assert.rejects(preparePresentationDocument(file('empty.pdf', '')), /empty/);
 await assert.rejects(preparePresentationDocument({name:'huge.pdf',size:50*1024*1024+1} as File), /50 MB/);
});
