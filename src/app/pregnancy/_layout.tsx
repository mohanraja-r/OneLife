import { Stack } from 'expo-router';
import type { JSX } from 'react';

/** Stack for the pregnancy feature screens reached from the Pregnancy hub. */
export default function PregnancyLayout(): JSX.Element {
  return <Stack screenOptions={{ headerShown: false }} />;
}
