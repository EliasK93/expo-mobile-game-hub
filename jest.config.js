module.exports = {
  preset: 'jest-expo',
  // CI starts with a cold transform cache on 4 cores; the first route test of a suite took over 15 s there.
  testTimeout: process.env.CI ? 60000 : 15000,
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testMatch: ['**/*.test.[jt]s?(x)'],
  // The badge reporter only runs when CI asks for it, so local runs and the gate never write a file.
  reporters: process.env.TESTS_BADGE_FILE ? ['default', '<rootDir>/tools/jest-badge-reporter.js'] : ['default'],
};
