import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ShoppingCart, Users, ShoppingBag, BarChart2, MoreHorizontal } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { useTranslation } from '../context/LanguageContext';
import POSScreen from '../screens/Shopkeeper/POSScreen';
import KhataScreen from '../screens/Shopkeeper/KhataScreen';
import OrdersScreen from '../screens/Shopkeeper/OrdersScreen';
import AnalyticsScreen from '../screens/Shopkeeper/AnalyticsScreen';
import MoreScreen from '../screens/Shopkeeper/MoreScreen';

const Tab = createBottomTabNavigator();

export default function ShopkeeperNavigator() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 60 + insets.bottom,
          paddingBottom: 8 + insets.bottom,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tab.Screen
        name="POS"
        component={POSScreen}
        options={{
          tabBarLabel: t('nav.pos', 'POS Billing'),
          tabBarIcon: ({ color, size }) => <ShoppingCart size={size || 20} color={color} />,
        }}
      />
      <Tab.Screen
        name="Khata"
        component={KhataScreen}
        options={{
          tabBarLabel: t('nav.khata', 'Khata Ledger'),
          tabBarIcon: ({ color, size }) => <Users size={size || 20} color={color} />,
        }}
      />
      <Tab.Screen
        name="Orders"
        component={OrdersScreen}
        options={{
          tabBarLabel: t('nav.orders', 'Orders'),
          tabBarIcon: ({ color, size }) => <ShoppingBag size={size || 20} color={color} />,
        }}
      />
      <Tab.Screen
        name="Analytics"
        component={AnalyticsScreen}
        options={{
          tabBarLabel: t('nav.analytics', 'Analytics'),
          tabBarIcon: ({ color, size }) => <BarChart2 size={size || 20} color={color} />,
        }}
      />
      <Tab.Screen
        name="More"
        component={MoreScreen}
        options={{
          tabBarLabel: t('nav.more', 'More'),
          tabBarIcon: ({ color, size }) => <MoreHorizontal size={size || 20} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}
