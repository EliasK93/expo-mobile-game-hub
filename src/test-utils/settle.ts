import { act } from 'expo-router/testing-library';

// Lets the pending storage promises finish (e.g. GameRoute's playtime write); they need no timers.
export const settle = async () => {
  for (let i = 0; i < 5; i++) await act(async () => {});
};
