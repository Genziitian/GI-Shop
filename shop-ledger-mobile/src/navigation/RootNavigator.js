import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';
import AuthScreen from '../screens/AuthScreen';
import PinLockScreen from '../components/PinLockScreen';
import ShopkeeperNavigator from './ShopkeeperNavigator';
import CustomerNavigator from './CustomerNavigator';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const { user, token, isLoading, isLocked } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Lock feature disabled from UI per user preference (code preserved for future use)
  // if (token && user && isLocked) {
  //   return <PinLockScreen />;
  // }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!token || !user ? (
        <Stack.Screen name="Auth" component={AuthScreen} />
      ) : user.role === 'Shopkeeper' ? (
        <Stack.Screen name="ShopkeeperFlow" component={ShopkeeperNavigator} />
      ) : (
        <Stack.Screen name="CustomerFlow" component={CustomerNavigator} />
      )}
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
