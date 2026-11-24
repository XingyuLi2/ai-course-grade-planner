// Run existing synthetic checks. No network, browser, model, or user data is used.
import { writeFile } from 'node:fs/promises';
import { runTests } from './calculation.test.mjs';
import { runStorageTests } from './storage.test.mjs';
import { runScoreEditTests } from './score-edit.test.mjs';
import { runAppFlowTests } from './app-flow-smoke.mjs';
import { runStartupTests } from './startup-smoke.mjs';

const unknown = process.argv.slice(2).filter(arg => arg !== '--write');
if (unknown.length) throw new Error(`Unknown arguments: ${unknown.join(', ')}`);
const persist = process.argv.includes('--write');
const suites = [
  ['calculation', runTests, 'Independent hand-calculated synthetic answers'],
  ['storage', runStorageTests, 'In-memory storage substitute'],
  ['score-edit', runScoreEditTests, 'Pure validation and commit checks'],
  ['app-flow', runAppFlowTests, 'Node VM with DOM and storage substitutes'],
  ['startup', runStartupTests, 'Node VM with DOM and module-load substitutes'],
];
const metadata = {
  executedAt: new Date().toISOString(),
  runtime: process.version,
  platform: `${process.platform}/${process.arch}`,
  command: 'node --experimental-vm-modules tests/run-all.mjs --write',
  inputType: 'synthetic',
  scope: 'Automated module and substitute-based checks; not browser acceptance or model evaluation',
};
if (!persist) metadata.command = 'node --experimental-vm-modules tests/run-all.mjs';
let total = 0;
let passed = 0;
let failed = 0;
for (const [name, run, method] of suites) {
  const result = await run();
  total += result.total;
  passed += result.passed;
  failed += result.failed;
  if (persist) {
    await writeFile(new URL(`./latest-${name}-results.json`, import.meta.url),
      `${JSON.stringify({ ...result, metadata: { ...metadata, method } }, null, 2)}\n`);
  }
  console.log(`${name}: ${result.passed}/${result.total} passed, ${result.failed} failed`);
  for (const check of result.results.filter(check => !check.passed)) {
    console.error(`${check.name}\n${check.error}`);
  }
}
console.log(`Total: ${passed}/${total} passed, ${failed} failed${persist ? '; result JSON updated' : ''}`);
process.exitCode = failed ? 1 : 0;
