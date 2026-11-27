import test from 'node:test';
import assert from 'node:assert/strict';
import { createBrowser, observe } from '../browser.mjs';
import { generatedChecks } from '../../evaluation/lib/properties.mjs';
import { normalizeModel } from '../../evaluation/lib/compare.mjs';
import { json } from '../../evaluation/lib/io.mjs';
test('all 36 seeded semantic property expectations agree with the pinned oracle',async()=>{
  const browser=await createBrowser(),config=await json('reference/config.json');
  try {
    for(const fixture of generatedChecks(new Set(['FC007','FC012']))) {
      const actual=await observe(browser,fixture.source,config);
      assert.equal(actual.accepted,true,fixture.id);
      assert.deepEqual(normalizeModel(actual.model),normalizeModel(fixture.oracle.model),fixture.id);
    }
  } finally {await browser.close();}
});
