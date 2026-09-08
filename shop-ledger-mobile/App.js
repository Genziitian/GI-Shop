import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthProvider } from './src/context/AuthContext';
import { LanguageProvider } from './src/context/LanguageContext';
import RootNavigator from './src/navigation/RootNavigator';

export const NAVIGATION_PERSISTENCE_KEY = '@shop_ledger_navigation_state';

export default function App() {
  const [isNavigationReady, setIsNavigationReady] = useState(false);
  const [initialNavigationState, setInitialNavigationState] = useState(undefined);

  useEffect(() => {
    let active = true;
    const restoreNavigationState = async () => {
      try {
        const savedStateString = await AsyncStorage.getItem(NAVIGATION_PERSISTENCE_KEY);
        if (savedStateString && active) {
          const parsed = JSON.parse(savedStateString);
          setInitialNavigationState(parsed);
        }
      } catch (err) {
        console.warn('Failed to restore navigation state:', err);
      } finally {
        if (active) {
          setIsNavigationReady(true);
        }
      }
    };

    restoreNavigationState();
    return () => {
      active = false;
    };
  }, []);

  if (!isNavigationReady) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <LanguageProvider>
          <NavigationContainer
            initialState={initialNavigationState}
            onStateChange={(state) => {
              if (state) {
                AsyncStorage.setItem(NAVIGATION_PERSISTENCE_KEY, JSON.stringify(state)).catch((err) => {
                  console.warn('Failed to save navigation state:', err);
                });
              }
            }}
          >
            <StatusBar style="dark" />
            <RootNavigator />
          </NavigationContainer>
        </LanguageProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

