import { screen } from 'expo-router/testing-library';
import { StyleSheet } from 'react-native';

// What a `Button` looks like on screen, found by its text: the background is the first element above the text that has one.
export function buttonLook(text: string) {
  let node = screen.getByText(text).parent;
  while (node && !StyleSheet.flatten(node.props.style)?.backgroundColor) node = node.parent;
  return { background: StyleSheet.flatten(node?.props.style).backgroundColor, text: StyleSheet.flatten(screen.getByText(text).props.style).color };
}
