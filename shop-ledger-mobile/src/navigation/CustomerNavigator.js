import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Store, Tag, BookOpen, Clock, Menu } from 'lucide-react-native';
import { colors, roleAccent, shadowLarge } from '../theme/colors';
import { TabIcon } from '../components/ui/Motion';
import { useTranslation } from '../context/LanguageContext';
import CustomerExploreScreen from '../screens/Customer/CustomerExploreScreen';
import CustomerCompareScreen from '../screens/Customer/CustomerCompareScreen';
import CustomerKhataScreen from '../screens/Customer/CustomerKhataScreen';
import CustomerOrdersScreen from '../screens/Customer/CustomerOrdersScreen';
import CustomerMoreScreen from '../screens/Customer/CustomerMoreScreen';

const Tab = createBottomTabNavigator();

export default function CustomerNavigator() {
  const insets = useSafeAreaInsets();
  const accent = roleAccent.Customer.main;
  const { t } = useTranslation();

  return (
    <Tab.Navigator
      initialRouteName="CustomerKhata"
      backBehavior="history"
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        sceneStyle: { backgroundColor: colors.background },
        tabBarActiveTintColor: accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopWidth: 0,
          height: 64,
          marginHorizontal: 12,
          marginBottom: Math.max(insets.bottom, 10),
          paddingBottom: 6,
          paddingTop: 6,
          borderRadius: 30,
          position: 'relative',
          ...shadowLarge,
        },
        tabBarItemStyle: { borderRadius: 24, marginHorizontal: 2 },
        tabBarActiveBackgroundColor: roleAccent.Customer.tint,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
        },
      }}
    >
      <Tab.Screen
        name="CustomerExplore"
        component={CustomerExploreScreen}
        options={{
          tabBarLabel: t('nav.shops', 'Explore'),
          tabBarIcon: ({ color, size, focused }) => <TabIcon focused={focused}><Store size={size || 20} color={color} /></TabIcon>,
        }}
      />
      <Tab.Screen
        name="CustomerCompare"
        component={CustomerCompareScreen}
        options={{
          tabBarLabel: t('nav.compare', 'Compare'),
          tabBarIcon: ({ color, size, focused }) => <TabIcon focused={focused}><Tag size={size || 20} color={color} /></TabIcon>,
        }}
      />
      <Tab.Screen
        name="CustomerKhata"
        component={CustomerKhataScreen}
        options={{
          tabBarLabel: t('nav.khata', 'My Khata'),
          tabBarIcon: ({ color, size, focused }) => <TabIcon focused={focused}><BookOpen size={size || 20} color={color} /></TabIcon>,
        }}
      />
      <Tab.Screen
        name="CustomerOrders"
        component={CustomerOrdersScreen}
        options={{
          tabBarLabel: t('nav.orders', 'All Orders'),
          tabBarIcon: ({ color, size, focused }) => <TabIcon focused={focused}><Clock size={size || 20} color={color} /></TabIcon>,
        }}
      />
      <Tab.Screen
        name="CustomerMore"
        component={CustomerMoreScreen}
        options={{
          tabBarLabel: t('nav.more', 'More'),
          tabBarIcon: ({ color, size, focused }) => <TabIcon focused={focused}><Menu size={size || 20} color={color} /></TabIcon>,
        }}
      />
    </Tab.Navigator>
  );
}
