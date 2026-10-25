const fs = require('fs');
const os = require('os');
const path = require('path');
const Reporter = require('./jest-badge-reporter');

const file = path.join(os.tmpdir(), `jest-badge-reporter-test-${process.pid}.json`);

function run(results) {
  process.env.TESTS_BADGE_FILE = file;
  new Reporter().onRunComplete(new Set(), results);
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

afterEach(() => {
  delete process.env.TESTS_BADGE_FILE;
  fs.rmSync(file, { force: true });
});

test('a passing run is a green shields.io endpoint', () => {
  expect(run({ numPassedTests: 19, numFailedTests: 0, numPendingTests: 3 })).toEqual({
    schemaVersion: 1,
    label: 'tests',
    message: '19 pass 0 fail',
    color: 'brightgreen',
  });
});

test('a failing run is red', () => {
  expect(run({ numPassedTests: 17, numFailedTests: 2, numPendingTests: 0 })).toEqual({
    schemaVersion: 1,
    label: 'tests',
    message: '17 pass 2 fail',
    color: 'red',
  });
});
