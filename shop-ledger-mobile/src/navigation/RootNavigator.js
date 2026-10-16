import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import AnimatedSplash from '../components/AnimatedSplash';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import AuthScreen from '../screens/AuthScreen';
import PinLockScreen from '../components/PinLockScreen';
import ShopkeeperNavigator from './ShopkeeperNavigator';
import CustomerNavigator from './CustomerNavigator';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const { user, token, isLoading, isLocked } = useAuth();
  const [minTimeDone, setMinTimeDone] = useState(false);
  const [splashGone, setSplashGone] = useState(false);

  // Keep the splash up long enough for the intro animation to play.
  useEffect(() => {
    const t = setTimeout(() => setMinTimeDone(true), 2400);
    return () => clearTimeout(t);
  }, []);

  const splashVisible = isLoading || !minTimeDone;

  useEffect(() => {
    if (!splashVisible) {
      const t = setTimeout(() => setSplashGone(true), 450);
      return () => clearTimeout(t);
    }
  }, [splashVisible]);

  // Lock feature disabled from UI per user preference (code preserved for future use)
  // if (token && user && isLocked) {
  //   return <PinLockScreen />;
  // }

  return (
    <View style={{ flex: 1 }}>
    {!isLoading && (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade', contentStyle: { backgroundColor: '#f2f4f7' } }}>
      {!token || !user ? (
        <Stack.Screen name="Auth" component={AuthScreen} />
      ) : user.role === 'Shopkeeper' ? (
        <Stack.Screen name="ShopkeeperFlow" component={ShopkeeperNavigator} />
      ) : (
        <Stack.Screen name="CustomerFlow" component={CustomerNavigator} />
      )}
    </Stack.Navigator>
    )}
    {!splashGone && <AnimatedSplash visible={splashVisible} />}
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#f2f4f7',
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
    borderColor: '#e4e7ec',
    shadowColor: '#101828',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 5,
  },
  loadingTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#101828',
    marginTop: 14,
  },
  loadingSubtitle: {
    fontSize: 13,
    color: '#667085',
    marginTop: 6,
    fontWeight: '600',
  },
});
