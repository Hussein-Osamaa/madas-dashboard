import React from 'react';
import { ActivityIndicator, View, StyleSheet, Platform } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useBusiness } from '../contexts/BusinessContext';
import { LoginScreen } from '../screens/LoginScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { OrdersScreen } from '../screens/OrdersScreen';
import { InventoryScreen } from '../screens/InventoryScreen';
import { ProductDetailsScreen } from '../screens/ProductDetailsScreen';
import { AnalyticsScreen } from '../screens/AnalyticsScreen';
import { FinanceScreen } from '../screens/FinanceScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { fontSize, fontWeight } from '../theme';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const InventoryStack = createNativeStackNavigator();

const InventoryStackNavigator = () => (
  <InventoryStack.Navigator screenOptions={{ headerShown: false }}>
    <InventoryStack.Screen name="InventoryList" component={InventoryScreen} />
    <InventoryStack.Screen name="ProductDetails" component={ProductDetailsScreen} />
  </InventoryStack.Navigator>
);

const TAB_ICONS: Record<string, { active: keyof typeof Ionicons.glyphMap; inactive: keyof typeof Ionicons.glyphMap }> = {
  Home: { active: 'grid', inactive: 'grid-outline' },
  Orders: { active: 'receipt', inactive: 'receipt-outline' },
  Inventory: { active: 'cube', inactive: 'cube-outline' },
  Analytics: { active: 'bar-chart', inactive: 'bar-chart-outline' },
  Finance: { active: 'wallet', inactive: 'wallet-outline' },
  Settings: { active: 'settings', inactive: 'settings-outline' },
};

const DashboardTabs = () => {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          const icons = TAB_ICONS[route.name];
          const iconName = focused ? icons?.active : icons?.inactive;
          return <Ionicons name={iconName || 'ellipse-outline'} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: isDark ? colors.bgSecondary : colors.bgCard,
          borderTopColor: colors.border,
          borderTopWidth: isDark ? 1 : 0,
          paddingTop: 12,
          paddingBottom: Math.max(10, insets.bottom + 8),
          height: Platform.OS === 'ios' ? 88 : 72,
          ...(isDark
            ? {}
            : {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: -2 },
                shadowOpacity: 0.06,
                shadowRadius: 8,
                elevation: 8,
              }),
        },
        tabBarLabelStyle: {
          fontSize: fontSize.xs,
          fontWeight: fontWeight.medium,
        },
        tabBarItemStyle: {
          minWidth: 52,
          paddingHorizontal: 4,
        },
        headerStatusBarHeight: insets.top,
        headerStyle: {
          backgroundColor: colors.bgPrimary,
        },
        headerTintColor: colors.textPrimary,
        headerTitleStyle: {
          fontWeight: fontWeight.bold,
          fontSize: fontSize.lg,
        },
        headerShadowVisible: false,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
      <Tab.Screen name="Orders" component={OrdersScreen} options={{ title: 'Orders' }} />
      <Tab.Screen name="Inventory" component={InventoryStackNavigator} options={{ title: 'Inventory' }} />
      <Tab.Screen name="Analytics" component={AnalyticsScreen} options={{ title: 'Analytics' }} />
      <Tab.Screen name="Finance" component={FinanceScreen} options={{ title: 'Finance' }} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
    </Tab.Navigator>
  );
};

export const AppNavigation = () => {
  const { user, loading: authLoading } = useAuth();
  const { loading: bizLoading } = useBusiness();
  const { colors, isDark } = useTheme();

  const navTheme = {
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDark ? DarkTheme : DefaultTheme).colors,
      background: colors.bgPrimary,
      card: colors.bgCard,
      text: colors.textPrimary,
      border: colors.border,
      primary: colors.accent,
    },
  };

  if (authLoading || (user && bizLoading)) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.bgPrimary }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <Stack.Screen name="Dashboard" component={DashboardTabs} />
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
