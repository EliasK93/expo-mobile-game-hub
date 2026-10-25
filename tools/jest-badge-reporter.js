// Jest reporter: writes the shields.io endpoint JSON for the README's tests badge to $TESTS_BADGE_FILE (CI uploads it).
// Skipped tests are left out of the count.
const fs = require('fs');

module.exports = class BadgeReporter {
  onRunComplete(_contexts, results) {
    const { numPassedTests, numFailedTests } = results;
    const badge = {
      schemaVersion: 1,
      label: 'tests',
      message: `${numPassedTests} pass ${numFailedTests} fail`,
      color: numFailedTests === 0 ? 'brightgreen' : 'red',
    };
    fs.writeFileSync(process.env.TESTS_BADGE_FILE, JSON.stringify(badge));
  }
};
