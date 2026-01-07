// CRITICAL: Import polyfills FIRST before anything else
import '../polyfills';

import { firebaseApp } from '@/firebaseConfig';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, getFirestore } from 'firebase/firestore';
import { useCallback, useEffect, useRef, useState } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { Alert, Animated, Easing, Pressable, StyleSheet, Text, TouchableWithoutFeedback, View } from 'react-native';

SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  initialRouteName: 'auth/Login',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const [showSplash, setShowSplash] = useState(true);
  const splashOpacity = useRef(new Animated.Value(1)).current;
  const bounceDriver = useRef(new Animated.Value(0)).current;
  const hasHiddenNativeSplash = useRef(false);
  const hasDismissedOverlay = useRef(false);

  const bounceScale = bounceDriver.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });
  const bounceTranslate = bounceDriver.interpolate({ inputRange: [0, 1], outputRange: [0, -6] });

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bounceDriver, { toValue: 1, duration: 650, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(bounceDriver, { toValue: 0, duration: 650, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      ]),
    );

    loop.start();
    return () => loop.stop();
  }, [bounceDriver]);

  const hideNativeSplash = useCallback(async () => {
    if (hasHiddenNativeSplash.current) return;

    hasHiddenNativeSplash.current = true;
    try {
      await SplashScreen.hideAsync();
    } catch (error) {
      console.warn('Unable to hide splash screen', error);
    }
  }, []);

  const fadeOutSplash = useCallback(async () => {
    if (hasDismissedOverlay.current) return;

    hasDismissedOverlay.current = true;
    await hideNativeSplash();

    Animated.timing(splashOpacity, {
      toValue: 0,
      duration: 260,
      easing: Easing.inOut(Easing.quad),
      useNativeDriver: true,
    }).start(() => setShowSplash(false));
  }, [hideNativeSplash, splashOpacity]);

  useEffect(() => {
    hideNativeSplash();
  }, [hideNativeSplash]);

  useEffect(() => {
    const timer = setTimeout(() => fadeOutSplash(), 3000);
    return () => clearTimeout(timer);
  }, [fadeOutSplash]);

  useEffect(() => {
    const auth = getAuth(firebaseApp);
    const db = getFirestore(firebaseApp);

    console.log('🔍 Auth listener setup');

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log('🔄 Auth state changed. User:', user?.uid);

      if (user) {
        console.log('👤 User authenticated:', user.uid);
        console.log('📊 Checking Firestore for user document...');

        try {
          const userRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userRef);

          console.log('📄 Document exists:', userDoc.exists());

          if (userDoc.exists()) {
            const data = userDoc.data();
            console.log('📋 User data:', data);
            console.log('🎯 Role:', data?.role);

            if (data?.role === 'parent') {
              console.log('➡️ Routing to parent tabs');
              router.replace('/(parent-tabs)');
            } else {
              console.log('➡️ Routing to student tabs');
              router.replace('/(tabs)');
            }
          } else {
            console.log('❌ No document found for user');
            console.log('➡️ Redirecting to signup to complete registration');
            router.replace({ pathname: '/auth/Signup', params: { uid: user.uid } });
          }
        } catch (error) {
          console.error('🔥 Error fetching user data:', error);
          Alert.alert('Error', 'Failed to load your profile. Please try again.');
          router.replace('/auth/Login');
        }
      } else {
        console.log('➡️ No user, routing to login');
        router.replace('/auth/Login');
      }

      fadeOutSplash();
    });

    return unsubscribe;
  }, [fadeOutSplash, router]);

  const themeContent = (
    <>
      <Stack screenOptions={{ headerBackButtonDisplayMode: 'minimal', headerTintColor: colorScheme === 'dark' ? '#fff' : '#000' }}>
        <Stack.Screen name="auth/Login" options={{ headerShown: false }} />
        <Stack.Screen
          name="auth/RoleSelection"
          options={{
            headerShown: true,
            title: 'Select Role',
            headerLeft: () => (
              <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
                <Text style={styles.backIcon}>{'<'}</Text>
              </Pressable>
            ),
          }}
        />
        <Stack.Screen
          name="auth/Signup"
          options={{
            headerShown: true,
            title: 'Sign Up',
            headerLeft: () => (
              <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
                <Text style={styles.backIcon}>{'<'}</Text>
              </Pressable>
            ),
          }}
        />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(parent-tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </>
  );

  return (
    <View style={styles.appShell}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme} children={themeContent} />

      {showSplash && (
        <TouchableWithoutFeedback onPress={fadeOutSplash}>
          <Animated.View style={[StyleSheet.absoluteFillObject, styles.splashLayer, { opacity: splashOpacity }]}>
            <Animated.Image
              source={require('../assets/images/android-icon-foreground.png')}
              style={[styles.splashImage, { transform: [{ scale: bounceScale }, { translateY: bounceTranslate }] }]}
              resizeMode="contain"
            />
          </Animated.View>
        </TouchableWithoutFeedback>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  appShell: { flex: 1, backgroundColor: '#ffffff' },
  splashLayer: { justifyContent: 'center', alignItems: 'center', backgroundColor: '#ffffff', zIndex: 10 },
  splashImage: { width: 184, height: 184 },
  backBtn: { paddingHorizontal: 8, paddingVertical: 6 },
  backIcon: { fontSize: 18, fontWeight: '700', color: '#111827' },
});