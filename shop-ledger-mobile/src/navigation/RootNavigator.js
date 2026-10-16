import React from 'react';
import { View, Text, ActivityIndicator, Image, StyleSheet } from 'react-native';
import { FadeInView, Pulse } from '../components/ui/Motion';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
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
        <View style={styles.loadingCard}>
          <ActivityIndicator size="large" color="#1f9d5a" />
          <Text style={styles.loadingTitle}>Opening GI SHOP</Text>
          <Text style={styles.loadingSubtitle}>Getting your account ready...</Text>
          <ActivityIndicator size="small" color="#0f7a43" style={{ marginTop: 14 }} />
        </FadeInView>
      </View>
    );
  }

  // Lock feature disabled from UI per user preference (code preserved for future use)
  // if (token && user && isLocked) {
  //   return <PinLockScreen />;
  // }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade', contentStyle: { backgroundColor: '#ecebe4' } }}>
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
    backgroundColor: '#ecebe4',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingCard: {
    width: '100%',
    maxWidth: 300,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    paddingVertical: 28,
    paddingHorizontal: 22,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e8e1d0',
    shadowColor: '#12201a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 5,
  },
  loadingTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#12201a',
    marginTop: 14,
  },
  loadingSubtitle: {
    fontSize: 13,
    color: '#666c60',
    marginTop: 6,
    fontWeight: '600',
  },
});
