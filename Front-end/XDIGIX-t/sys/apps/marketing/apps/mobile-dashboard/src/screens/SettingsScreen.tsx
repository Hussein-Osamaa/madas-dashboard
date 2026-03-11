import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useBusiness } from '../contexts/BusinessContext';
import { useTheme } from '../contexts/ThemeContext';
import { spacing, radius, fontSize, fontWeight } from '../theme';

export const SettingsScreen = () => {
  const { colors, isDark, mode, setMode } = useTheme();
  const { user, logout } = useAuth();
  const { businessName, currency } = useBusiness();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (err: any) {
      Alert.alert('Logout failed', err?.message || 'Please try again');
    }
  };

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: colors.bgPrimary,
        },
        content: {
          padding: spacing.lg,
          paddingTop: spacing.xl,
          paddingBottom: 100,
        },
        title: {
          color: colors.textPrimary,
          fontSize: fontSize.xl,
          fontWeight: fontWeight.bold,
          marginBottom: spacing.xl,
        },
        section: {
          marginBottom: spacing.xl,
        },
        sectionLabel: {
          color: colors.textMuted,
          fontSize: fontSize.xs,
          fontWeight: fontWeight.semibold,
          textTransform: 'uppercase',
          letterSpacing: 0.7,
          marginBottom: spacing.sm,
        },
        card: {
          backgroundColor: colors.bgCard,
          borderRadius: radius.lg,
          padding: spacing.lg,
          ...(isDark
            ? {}
            : {
                shadowColor: '#000000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.08,
                shadowRadius: 4,
                elevation: 2,
              }),
        },
        row: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
        },
        iconCircle: {
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: colors.bgCard,
          alignItems: 'center',
          justifyContent: 'center',
        },
        cardTitle: {
          color: colors.textPrimary,
          fontSize: fontSize.md,
          fontWeight: fontWeight.semibold,
        },
        cardSubtitle: {
          color: colors.textMuted,
          fontSize: fontSize.xs,
          marginTop: 2,
        },
        modeButtonRow: {
          flexDirection: 'row',
          gap: spacing.sm,
        },
        modeButton: {
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: spacing.xs,
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.sm,
          borderRadius: radius.md,
        },
        modeButtonActive: {
          backgroundColor: colors.accent,
        },
        modeButtonInactive: {
          backgroundColor: colors.bgCard,
        },
        modeButtonTextActive: {
          color: colors.textInverse,
          fontSize: fontSize.sm,
          fontWeight: fontWeight.semibold,
        },
        modeButtonTextInactive: {
          color: colors.textSecondary,
          fontSize: fontSize.sm,
          fontWeight: fontWeight.semibold,
        },
        logoutButton: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: spacing.sm,
          paddingVertical: spacing.md,
          borderRadius: radius.md,
          backgroundColor: colors.dangerBg,
          borderWidth: 1,
          borderColor: colors.danger + '40',
        },
        logoutText: {
          color: colors.danger,
          fontSize: fontSize.md,
          fontWeight: fontWeight.semibold,
        },
      }),
    [colors, isDark],
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      <Text style={styles.title}>Settings</Text>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Appearance</Text>
        <View style={styles.card}>
          <View style={styles.modeButtonRow}>
            <TouchableOpacity
              style={[styles.modeButton, mode === 'dark' ? styles.modeButtonActive : styles.modeButtonInactive]}
              onPress={() => setMode('dark')}
              activeOpacity={0.8}
            >
              <Ionicons
                name="moon"
                size={18}
                color={mode === 'dark' ? colors.textInverse : colors.textSecondary}
              />
              <Text style={mode === 'dark' ? styles.modeButtonTextActive : styles.modeButtonTextInactive}>
                Dark
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeButton, mode === 'light' ? styles.modeButtonActive : styles.modeButtonInactive]}
              onPress={() => setMode('light')}
              activeOpacity={0.8}
            >
              <Ionicons
                name="sunny"
                size={18}
                color={mode === 'light' ? colors.textInverse : colors.textSecondary}
              />
              <Text style={mode === 'light' ? styles.modeButtonTextActive : styles.modeButtonTextInactive}>
                Light
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeButton, mode === 'system' ? styles.modeButtonActive : styles.modeButtonInactive]}
              onPress={() => setMode('system')}
              activeOpacity={0.8}
            >
              <Ionicons
                name="phone-portrait-outline"
                size={18}
                color={mode === 'system' ? colors.textInverse : colors.textSecondary}
              />
              <Text style={mode === 'system' ? styles.modeButtonTextActive : styles.modeButtonTextInactive}>
                System
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Account</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.iconCircle}>
              <Ionicons name="person-circle-outline" size={26} color={colors.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{user?.email || 'Logged in'}</Text>
              <Text style={styles.cardSubtitle}>Dashboard account</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Business</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={[styles.iconCircle, { backgroundColor: colors.bgSecondary }]}>
              <Ionicons name="briefcase-outline" size={22} color={colors.textSecondary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{businessName || 'Business'}</Text>
              <Text style={styles.cardSubtitle}>Currency: {currency}</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>App</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={[styles.iconCircle, { backgroundColor: colors.bgSecondary }]}>
              <Ionicons name="phone-portrait-outline" size={22} color={colors.textSecondary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>XDIGIX Dashboard Mobile</Text>
              <Text style={styles.cardSubtitle}>Version 1.0.0</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={20} color={colors.danger} />
          <Text style={styles.logoutText}>Sign out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};
