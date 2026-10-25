module.exports = {
  preset: 'jest-expo',
  // CI starts with a cold transform cache on 4 cores; the first route test of a suite took over 15 s there.
  testTimeout: process.env.CI ? 60000 : 15000,
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testMatch: ['**/*.test.[jt]s?(x)'],
};
