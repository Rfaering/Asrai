import test from 'node:test';
import assert from 'node:assert/strict';
import { createBrowser, inspectSvg } from '../browser.mjs';
test('SVG inspector rejects active content, external resources, CSS escapes and malformed XML',async()=>{
  const browser=await createBrowser();
  const wrap=content=>`<svg xmlns="http://www.w3.org/2000/svg" role="img" viewBox="0 0 100 50"><title>Diagram</title>${content}</svg>`;
  try {
    const valid=await inspectSvg(browser,wrap('<text x="1" y="20">&lt;script&gt; hello</text>'));
    assert.deepEqual(valid.failures,[]);assert.match(valid.text,/<script> hello/);
    for(const content of ['<script>alert(1)</script>','<rect onload="alert(1)"/>','<foreignObject/>','<image href="https://example.com/x.png"/>','<rect fill="url(https://example.com/x)"/>','<rect style="fill:red"/>','<rect fill="u\\72l(https://example.com/x)"/>'])assert.ok((await inspectSvg(browser,wrap(content))).failures.length,content);
    assert.ok((await inspectSvg(browser,'<svg><broken>')).failures.length);
  } finally {await browser.close();}
});
