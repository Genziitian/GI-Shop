import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Store, Tag, BookOpen, Clock, Menu } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { useTranslation } from '../context/LanguageContext';
import CustomerExploreScreen from '../screens/Customer/CustomerExploreScreen';
import CustomerCompareScreen from '../screens/Customer/CustomerCompareScreen';
import CustomerKhataScreen from '../screens/Customer/CustomerKhataScreen';
import CustomerOrdersScreen from '../screens/Customer/CustomerOrdersScreen';
import CustomerMoreScreen from '../screens/Customer/CustomerMoreScreen';

const Tab = createBottomTabNavigator();

export default function CustomerNavigator() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

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
        name="CustomerExplore"
        component={CustomerExploreScreen}
        options={{
          tabBarLabel: t('nav.shops', 'Explore'),
          tabBarIcon: ({ color, size }) => <Store size={size || 20} color={color} />,
        }}
      />
      <Tab.Screen
        name="CustomerCompare"
        component={CustomerCompareScreen}
        options={{
          tabBarLabel: t('nav.compare', 'Compare'),
          tabBarIcon: ({ color, size }) => <Tag size={size || 20} color={color} />,
        }}
      />
      <Tab.Screen
        name="CustomerKhata"
        component={CustomerKhataScreen}
        options={{
          tabBarLabel: t('nav.khata', 'My Khata'),
          tabBarIcon: ({ color, size }) => <BookOpen size={size || 20} color={color} />,
        }}
      />
      <Tab.Screen
        name="CustomerOrders"
        component={CustomerOrdersScreen}
        options={{
          tabBarLabel: t('nav.orders', 'All Orders'),
          tabBarIcon: ({ color, size }) => <Clock size={size || 20} color={color} />,
        }}
      />
      <Tab.Screen
        name="CustomerMore"
        component={CustomerMoreScreen}
        options={{
          tabBarLabel: t('nav.more', 'More'),
          tabBarIcon: ({ color, size }) => <Menu size={size || 20} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}
