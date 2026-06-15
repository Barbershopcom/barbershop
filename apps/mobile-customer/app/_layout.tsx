import '../global.css';

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { BookingProvider } from '@/lib/booking-context';
import { Sentry, initSentry } from '@/lib/sentry';
import { SessionProvider } from '@/lib/session';

initSentry();

function RootLayout() {
  return (
    <SessionProvider>
      <BookingProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }} />
      </BookingProvider>
    </SessionProvider>
  );
}

export default Sentry.wrap(RootLayout);
