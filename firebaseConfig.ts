// firebaseConfig.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { getReactNativePersistence, initializeAuth } from 'firebase/auth';
import { getFirestore, initializeFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCBMqQe1M4KIXQty1kFLGwG0HlDcnS0Y80",
  authDomain: "xrpay-student-mobile.firebaseapp.com",
  projectId: "xrpay-student-mobile",
  storageBucket: "xrpay-student-mobile.appspot.com",
  messagingSenderId: "1056039680754",
  appId: "1:1056039680754:web:485b4e82770fdb368cee6b",
  measurementId: "G-MPERT55QRR"
};

// Prevent re-initialization
let firebaseAppInstance = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Initialize Auth with AsyncStorage persistence
if (!getApps().some(app => app === firebaseAppInstance)) {
  firebaseAppInstance = initializeApp(firebaseConfig);
}

try {
  initializeAuth(firebaseAppInstance, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch (error: any) {
  // Auth might already be initialized, that's okay
}

// Initialize Firestore with offline persistence
try {
  initializeFirestore(firebaseAppInstance, {
    localCache: { kind: 'persistent' },
  });
} catch (error: any) {
  // Firestore already initialized
  getFirestore(firebaseAppInstance);
}

export const firebaseApp = firebaseAppInstance;
