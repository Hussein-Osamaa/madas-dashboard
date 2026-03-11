import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as Font from 'expo-font';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';
import { AuthProvider } from './src/contexts/AuthContext';
import { BusinessProvider } from './src/contexts/BusinessContext';
import { AppNavigation } from './src/navigation';
import { darkColors } from './src/theme';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

const AppInner = () => {
  const { colors, isDark } = useTheme();
  return (
    <View style={[styles.root, { backgroundColor: colors.bgPrimary }]}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <BusinessProvider>
            <StatusBar style={isDark ? 'light' : 'dark'} />
            <AppNavigation />
          </BusinessProvider>
        </AuthProvider>
      </QueryClientProvider>
    </View>
  );
};

export default function App() {
  const [fontsReady, setFontsReady] = useState(false);

  useEffect(() => {
    Font.loadAsync({
      ...Ionicons.font,
    })
      .then(() => setFontsReady(true))
      .catch(() => setFontsReady(true));
  }, []);

  if (!fontsReady) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" color={darkColors.accent} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppInner />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  splash: { flex: 1, backgroundColor: darkColors.bgPrimary, justifyContent: 'center', alignItems: 'center' },
});
