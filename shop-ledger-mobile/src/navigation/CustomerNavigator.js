import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Store, Tag, BookOpen, Clock } from 'lucide-react-native';
import { colors } from '../theme/colors';
import CustomerExploreScreen from '../screens/Customer/CustomerExploreScreen';
import CustomerCompareScreen from '../screens/Customer/CustomerCompareScreen';
import CustomerKhataScreen from '../screens/Customer/CustomerKhataScreen';
import CustomerOrdersScreen from '../screens/Customer/CustomerOrdersScreen';

const Tab = createBottomTabNavigator();

export default function CustomerNavigator() {
  return (
    <Tab.Navigator
      initialRouteName="CustomerKhata"
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
        name="CustomerExplore"
        component={CustomerExploreScreen}
        options={{
          tabBarLabel: 'Explore',
          tabBarIcon: ({ color, size }) => <Store size={size || 20} color={color} />,
        }}
      />
      <Tab.Screen
        name="CustomerCompare"
        component={CustomerCompareScreen}
        options={{
          tabBarLabel: 'Compare',
          tabBarIcon: ({ color, size }) => <Tag size={size || 20} color={color} />,
        }}
      />
      <Tab.Screen
        name="CustomerKhata"
        component={CustomerKhataScreen}
        options={{
          tabBarLabel: 'My Khata',
          tabBarIcon: ({ color, size }) => <BookOpen size={size || 20} color={color} />,
        }}
      />
      <Tab.Screen
        name="CustomerOrders"
        component={CustomerOrdersScreen}
        options={{
          tabBarLabel: 'All Orders',
          tabBarIcon: ({ color, size }) => <Clock size={size || 20} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}
