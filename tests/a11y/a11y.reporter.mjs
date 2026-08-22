/**
 * a11y.reporter.mjs — a clean per-page reporter for the a11y sweep.
 *
 * Playwright's default 'list' reporter dumps a stack trace + code snippet +
 * file paths on failure — noise that buries the real accessibility violations,
 * especially across many pages. This reporter prints one ✓/✘ line per URL,
 * replays only the test's own violation output, and ends with a pass/fail tally.
 * Adapted from aemdemos/ise-boilerplate.
 */
class A11yReporter {
  constructor() {
    this.passed = 0;
    this.failed = 0;
  }

  onTestEnd(test, result) {
    if (result.status === 'passed') {
      this.passed += 1;
      console.log(`  ✓  ${test.title}`);
    } else {
      this.failed += 1;
      console.log(`  ✘  ${test.title}`);

      // Replay the test's captured output (console.warn/error → stderr, console.log → stdout)
      const stderr = result.stderr.map((c) => (typeof c === 'string' ? c : c.toString())).join('');
      if (stderr) process.stderr.write(stderr);
      const stdout = result.stdout.map((c) => (typeof c === 'string' ? c : c.toString())).join('');
      if (stdout) process.stdout.write(stdout);

      // Error message only — never the snippet or file path
      for (const error of result.errors) {
        const message = (error.message || '').split('\n')[0].trim();
        if (message) console.log(`     ${message}`);
      }
    }
  }

  onEnd() {
    console.log('');
    if (this.failed === 0) {
      console.log(`${this.passed} passed`);
    } else {
      const parts = [`${this.failed} failed`];
      if (this.passed > 0) parts.push(`${this.passed} passed`);
      console.log(parts.join(', '));
    }
  }
}

export default A11yReporter;
