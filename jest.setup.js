// Rule 5: every test talks to the AsyncStorage mock (in memory), never to real storage. Cleared before each test.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

beforeEach(async () => {
  jest.clearAllMocks(); // forget recorded calls (tests count writes); implementations stay
  await require('@react-native-async-storage/async-storage').clear();
});
