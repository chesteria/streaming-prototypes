/**
 * Reads Jest JSON output (test-output.json) and writes a human-readable
 * REPORT.md. Run automatically via `npm run test:ci`.
 *
 * Claude Code: after running `npm run test:ci`, read REPORT.md to find
 * which tests failed and what the error messages are, then fix js/analytics.js.
 */
const fs   = require('fs');
const path = require('path');

const inputPath  = path.join(__dirname, '..', 'test-output.json');
const outputPath = path.join(__dirname, '..', 'REPORT.md');

if (!fs.existsSync(inputPath)) {
  console.error('test-output.json not found. Run `npm run test:ci` first.');
  process.exit(1);
}

const results = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
const ts      = new Date().toISOString();

const totalTests   = results.numTotalTests;
const passedTests  = results.numPassedTests;
const failedTests  = results.numFailedTests;
const pendingTests = results.numPendingTests;
const passed       = results.success;

const statusBadge = passed ? '✅ ALL PASSING' : `❌ ${failedTests} FAILING`;

let md = `# Test Report — Firebase Analytics Integration
**Generated:** ${ts}
**Status:** ${statusBadge}
**Results:** ${passedTests}/${totalTests} passed`;

if (pendingTests > 0) md += ` (${pendingTests} skipped)`;
md += '\n\n---\n\n';

// ── Suite Summary ──────────────────────────────────────────────────────────
md += '## Suite Summary\n\n';
md += '| Suite | Status | Passed | Failed |\n|---|---|---|---|\n';

for (const suite of results.testResults) {
  const suiteName = suite.testFilePath ? path.basename(suite.testFilePath) : '(unknown)';
  const suitePass = suite.status === 'passed';
  const icon      = suitePass ? '✅' : '❌';
  const p         = suite.numPassingTests;
  const f         = suite.numFailingTests;
  md += `| ${suiteName} | ${icon} | ${p} | ${f} |\n`;
}

md += '\n---\n\n';

// ── Failures Detail ────────────────────────────────────────────────────────
const failures = results.testResults.flatMap(suite =>
  suite.testResults.filter(t => t.status === 'failed').map(t => ({
    suite: suite.testFilePath ? path.basename(suite.testFilePath) : '(unknown)',
    title: t.fullName,
    messages: t.failureMessages,
  }))
);

if (failures.length === 0) {
  md += '## Failures\n\nNone. All tests passed.\n';
} else {
  md += `## Failures (${failures.length})\n\n`;
  for (const f of failures) {
    md += `### ❌ ${f.title}\n`;
    md += `**Suite:** \`${f.suite}\`\n\n`;
    md += '**Error:**\n```\n';
    md += f.messages.join('\n').replace(/\x1b\[[0-9;]*m/g, ''); // strip ANSI
    md += '\n```\n\n';
  }
}

// ── Fix Instructions ───────────────────────────────────────────────────────
if (!passed) {
  md += `---\n\n## Fix Instructions for Claude Code\n\n`;
  md += `1. Read each failure above — the test title maps directly to a PRD requirement.\n`;
  md += `2. Open \`js/analytics.js\` and implement or correct the failing behaviour.\n`;
  md += `3. Run \`npm run test:ci\` again to regenerate this report.\n`;
  md += `4. Repeat until this report shows **✅ ALL PASSING**.\n\n`;
  md += `**Do not modify test files to make tests pass — fix the implementation.**\n`;
}

fs.writeFileSync(outputPath, md);
console.log(`\nReport written to REPORT.md — ${passedTests}/${totalTests} passed, ${failedTests} failed.`);
