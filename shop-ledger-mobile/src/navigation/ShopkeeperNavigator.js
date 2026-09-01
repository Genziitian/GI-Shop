import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ShoppingCart, Users, ShoppingBag, BarChart2, MoreHorizontal } from 'lucide-react-native';
import { colors } from '../theme/colors';
import POSScreen from '../screens/Shopkeeper/POSScreen';
import KhataScreen from '../screens/Shopkeeper/KhataScreen';
import OrdersScreen from '../screens/Shopkeeper/OrdersScreen';
import AnalyticsScreen from '../screens/Shopkeeper/AnalyticsScreen';
import MoreScreen from '../screens/Shopkeeper/MoreScreen';

const Tab = createBottomTabNavigator();

export default function ShopkeeperNavigator() {
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
          height: 60,
          paddingBottom: 8,
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
          tabBarLabel: 'POS Billing',
          tabBarIcon: ({ color, size }) => <ShoppingCart size={size || 20} color={color} />,
        }}
      />
      <Tab.Screen
        name="Khata"
        component={KhataScreen}
        options={{
          tabBarLabel: 'Khata Ledger',
          tabBarIcon: ({ color, size }) => <Users size={size || 20} color={color} />,
        }}
      />
      <Tab.Screen
        name="Orders"
        component={OrdersScreen}
        options={{
          tabBarLabel: 'Orders',
          tabBarIcon: ({ color, size }) => <ShoppingBag size={size || 20} color={color} />,
        }}
      />
      <Tab.Screen
        name="Analytics"
        component={AnalyticsScreen}
        options={{
          tabBarLabel: 'Analytics',
          tabBarIcon: ({ color, size }) => <BarChart2 size={size || 20} color={color} />,
        }}
      />
      <Tab.Screen
        name="More"
        component={MoreScreen}
        options={{
          tabBarLabel: 'More',
          tabBarIcon: ({ color, size }) => <MoreHorizontal size={size || 20} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}
