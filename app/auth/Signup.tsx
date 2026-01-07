// CRITICAL: Import crypto polyfills BEFORE any other imports
import 'react-native-get-random-values';

// Now import other modules
import { useLocalSearchParams, useRouter } from 'expo-router';
import { createUserWithEmailAndPassword, getAuth, updateProfile } from 'firebase/auth';
import { doc, getDoc, getFirestore, setDoc } from 'firebase/firestore';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Wallet } from 'xrpl';
import { firebaseApp } from '../../firebaseConfig';
import { setupWalletOnXRPL } from '../../services/walletSetupService';

export default function Signup() {
  const router = useRouter();
  const { role } = useLocalSearchParams();
  const [form, setForm] = useState<{ name: string; email: string; password: string }>({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    setLoading(true);

    try {
      const auth = getAuth(firebaseApp);
      const db = getFirestore(firebaseApp);

      console.log('Creating auth user...');
      const userCredential = await createUserWithEmailAndPassword(auth, form.email, form.password);
      const uid = userCredential.user.uid;
      console.log('Auth user created with UID:', uid);

      console.log('Generating XRPL wallet...');
      const wallet = Wallet.generate();
      const walletAddress = wallet.address;
      const walletSeed = wallet.seed || '';
      console.log('✅ Wallet generated successfully:', walletAddress);

      let userData: any = {
        uid,
        role,
        name: form.name,
        email: form.email,
        walletAddress: walletAddress,
        walletSeed: walletSeed,
        balance: '0.00',
        xrpBalance: '0.00',
        createdAt: new Date().toISOString(),
      };

      if (role === 'parent') {
        userData = { ...userData, studentIds: [] };
      } else {
        userData = {
          ...userData,
          parentIds: [],
          did: `did:xrpl:${walletAddress}`,
          spentThisWeek: 0,
        };
      }

      console.log('Creating Firestore document...');
      await setDoc(doc(db, 'users', uid), userData);
      console.log('Firestore document created!');

      await updateProfile(userCredential.user, { displayName: form.name });

      console.log('Setting up XRPL wallet...');
      if (walletSeed) {
        setupWalletOnXRPL(walletSeed)
          .then((result) => {
            if (result.success) {
              console.log('✅ XRPL wallet setup successful:', result.address);
            } else {
              console.warn('⚠️ XRPL wallet setup failed:', result.error);
            }
          })
          .catch((error) => {
            console.warn('⚠️ XRPL setup error:', error);
          });
      } else {
        console.warn('⚠️ No wallet seed available for XRPL setup');
      }

      const verifyDoc = await getDoc(doc(db, 'users', uid));
      if (verifyDoc.exists()) {
        console.log('✅ Document verified! User data saved successfully');

        if (role === 'parent') {
          router.replace('/(parent-tabs)');
        } else {
          router.replace('/(tabs)');
        }
      } else {
        throw new Error('Failed to create user document');
      }
    } catch (e: any) {
      console.error('❌ Signup error:', e);
      console.error('Error code:', e.code);
      console.error('Error message:', e.message);

      let errorMessage = e?.message || 'Unknown error';
      if (e.code === 'auth/email-already-in-use') {
        errorMessage = 'This email is already registered. Please login instead.';
      } else if (e.code === 'auth/weak-password') {
        errorMessage = 'Password should be at least 6 characters.';
      }

      Alert.alert('Signup Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.headerRow}>
            <Text style={styles.kicker}>New account</Text>
            <View style={[styles.rolePill, role === 'parent' ? styles.roleParent : styles.roleStudent]}>
              <Text style={[styles.roleText, role === 'parent' ? styles.roleParentText : styles.roleStudentText]}>{role}</Text>
            </View>
          </View>

          <Text style={styles.title}>Create your XRPay profile</Text>
          <Text style={styles.subtitle}>We will prepare your XRPL wallet as soon as you finish.</Text>

          <View style={styles.card}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Full name</Text>
              <TextInput
                style={styles.input}
                placeholder="Jane Doe"
                placeholderTextColor="#9aa5b5"
                autoCapitalize="words"
                value={form.name}
                onChangeText={(name: string) => setForm({ ...form, name })}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="you@example.com"
                placeholderTextColor="#9aa5b5"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                textContentType="emailAddress"
                value={form.email}
                onChangeText={(email: string) => setForm({ ...form, email })}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                placeholder="At least 6 characters"
                placeholderTextColor="#9aa5b5"
                secureTextEntry
                textContentType="newPassword"
                value={form.password}
                onChangeText={(password: string) => setForm({ ...form, password })}
              />
            </View>

            <TouchableOpacity style={[styles.primaryButton, loading && styles.primaryButtonDisabled]} onPress={handleSignup} disabled={loading}>
              {loading ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.primaryButtonText}>Create account</Text>}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f4f6fb' },
  scrollContent: { padding: 24, paddingBottom: 48 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  kicker: { color: '#1b4ed7', fontWeight: '700', letterSpacing: 0.4 },
  rolePill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  roleParent: { backgroundColor: '#e8f7ff' },
  roleStudent: { backgroundColor: '#ecfdf3' },
  roleText: { fontWeight: '700', textTransform: 'capitalize' },
  roleParentText: { color: '#046aa6' },
  roleStudentText: { color: '#047857' },
  title: { marginTop: 10, fontSize: 28, fontWeight: '800', color: '#0f172a' },
  subtitle: { marginTop: 6, fontSize: 15, color: '#4b5563', lineHeight: 22 },
  card: { marginTop: 20, backgroundColor: '#ffffff', borderRadius: 16, padding: 20, shadowColor: '#0f172a', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 4 },
  inputGroup: { marginTop: 14 },
  label: { marginBottom: 8, color: '#111827', fontWeight: '600', letterSpacing: 0.2 },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#d7deea',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#f9fbff',
    color: '#0f172a',
    fontSize: 15,
  },
  primaryButton: { marginTop: 22, backgroundColor: '#1d4ed8', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  primaryButtonDisabled: { opacity: 0.7 },
  primaryButtonText: { color: '#ffffff', fontWeight: '700', fontSize: 16, letterSpacing: 0.3 },
});