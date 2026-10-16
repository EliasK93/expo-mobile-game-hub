import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import { games } from '@/games/registry';

export default function RootLayout() {
  const colors = useTheme();
  // React Navigation's header, screens and back button take their colours from our tokens; only the fonts come from its default theme.
  const navigationTheme = {
    ...DefaultTheme,
    dark: useColorScheme() === 'dark',
    colors: {
      primary: colors.accent,
      background: colors.background,
      card: colors.background,
      text: colors.text,
      border: colors.gridLine,
      notification: colors.digitConflict,
    },
  };
  return (
    <ThemeProvider value={navigationTheme}>
      <Stack>
        <Stack.Screen name="index" options={{ title: 'Game Hub' }} />
        {/* The route file name is the game's route without the leading "/", so each header title comes from the registry. */}
        {games.map((game) => (
          <Stack.Screen key={game.id} name={game.route.slice(1)} options={{ title: game.title }} />
        ))}
      </Stack>
    </ThemeProvider>
  );
}
