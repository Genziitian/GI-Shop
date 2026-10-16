import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ShoppingCart, Users, ShoppingBag, BarChart2, MoreHorizontal } from 'lucide-react-native';
import { colors, roleAccent, shadowLarge } from '../theme/colors';
import { TabIcon } from '../components/ui/Motion';
import { useTranslation } from '../context/LanguageContext';
import POSScreen from '../screens/Shopkeeper/POSScreen';
import KhataScreen from '../screens/Shopkeeper/KhataScreen';
import OrdersScreen from '../screens/Shopkeeper/OrdersScreen';
import AnalyticsScreen from '../screens/Shopkeeper/AnalyticsScreen';
import MoreScreen from '../screens/Shopkeeper/MoreScreen';

const Tab = createBottomTabNavigator();

export default function ShopkeeperNavigator() {
  const insets = useSafeAreaInsets();
  const accent = roleAccent.Shopkeeper.main;
  const { t } = useTranslation();

  return (
    <Tab.Navigator
      backBehavior="history"
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        sceneStyle: { backgroundColor: colors.background },
        tabBarActiveTintColor: accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          height: 64 + Math.max(insets.bottom, 8),
          paddingBottom: Math.max(insets.bottom, 8),
          paddingTop: 6,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarItemStyle: { borderRadius: 24, marginHorizontal: 2 },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
        },
      }}
    >
      <Tab.Screen
        name="POS"
        component={POSScreen}
        options={{
          tabBarLabel: t('nav.pos', 'POS Billing'),
          tabBarIcon: ({ color, size, focused }) => <TabIcon focused={focused}><ShoppingCart size={size || 20} color={color} /></TabIcon>,
        }}
      />
      <Tab.Screen
        name="Khata"
        component={KhataScreen}
        options={{
          tabBarLabel: t('nav.khata', 'Khata Ledger'),
          tabBarIcon: ({ color, size, focused }) => <TabIcon focused={focused}><Users size={size || 20} color={color} /></TabIcon>,
        }}
      />
      <Tab.Screen
        name="Orders"
        component={OrdersScreen}
        options={{
          tabBarLabel: t('nav.orders', 'Orders'),
          tabBarIcon: ({ color, size, focused }) => <TabIcon focused={focused}><ShoppingBag size={size || 20} color={color} /></TabIcon>,
        }}
      />
      <Tab.Screen
        name="Analytics"
        component={AnalyticsScreen}
        options={{
          tabBarLabel: t('nav.analytics', 'Analytics'),
          tabBarIcon: ({ color, size, focused }) => <TabIcon focused={focused}><BarChart2 size={size || 20} color={color} /></TabIcon>,
        }}
      />
      <Tab.Screen
        name="More"
        component={MoreScreen}
        options={{
          tabBarLabel: t('nav.more', 'More'),
          tabBarIcon: ({ color, size, focused }) => <TabIcon focused={focused}><MoreHorizontal size={size || 20} color={color} /></TabIcon>,
        }}
      />
    </Tab.Navigator>
  );
}
