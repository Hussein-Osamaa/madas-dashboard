import React from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useBusiness } from '../contexts/BusinessContext';
import { LoginScreen } from '../screens/LoginScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { OrdersScreen } from '../screens/OrdersScreen';
import { InventoryScreen } from '../screens/InventoryScreen';
import { AnalyticsScreen } from '../screens/AnalyticsScreen';
import { FinanceScreen } from '../screens/FinanceScreen';
import { colors, fontSize, fontWeight } from '../theme';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const TAB_ICONS: Record<string, { active: keyof typeof Ionicons.glyphMap; inactive: keyof typeof Ionicons.glyphMap }> = {
  Home: { active: 'grid', inactive: 'grid-outline' },
  Orders: { active: 'receipt', inactive: 'receipt-outline' },
  Inventory: { active: 'cube', inactive: 'cube-outline' },
  Analytics: { active: 'bar-chart', inactive: 'bar-chart-outline' },
  Finance: { active: 'wallet', inactive: 'wallet-outline' },
};

const DashboardTabs = () => (
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
        backgroundColor: colors.bgSecondary,
        borderTopColor: colors.border,
        borderTopWidth: 1,
        height: 85,
        paddingTop: 8,
        paddingBottom: 28,
      },
      tabBarLabelStyle: {
        fontSize: fontSize.xs,
        fontWeight: fontWeight.medium,
      },
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
    <Tab.Screen
      name="Home"
      component={HomeScreen}
      options={{ headerShown: false }}
    />
    <Tab.Screen
      name="Orders"
      component={OrdersScreen}
      options={{ title: 'Orders' }}
    />
    <Tab.Screen
      name="Inventory"
      component={InventoryScreen}
      options={{ title: 'Inventory' }}
    />
    <Tab.Screen
      name="Analytics"
      component={AnalyticsScreen}
      options={{ title: 'Analytics' }}
    />
    <Tab.Screen
      name="Finance"
      component={FinanceScreen}
      options={{ title: 'Finance' }}
    />
  </Tab.Navigator>
);

export const AppNavigation = () => {
  const { user, loading: authLoading } = useAuth();
  const { loading: bizLoading } = useBusiness();

  if (authLoading || (user && bizLoading)) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <NavigationContainer>
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
    backgroundColor: colors.bgPrimary,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
