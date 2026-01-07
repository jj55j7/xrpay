
import { useRouter } from 'expo-router';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
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
import { firebaseApp } from '../../firebaseConfig';


export default function Login() {
  const router = useRouter();
  const [form, setForm] = useState<{ email: string; password: string }>({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    try {
      const auth = getAuth(firebaseApp);
      await signInWithEmailAndPassword(auth, form.email, form.password);
      // User is authenticated, onAuthStateChanged in root layout will handle routing
      // No manual navigation needed - let the auth listener route based on role
    } catch (e: any) {
      Alert.alert('Login Error', e?.message || 'Unknown error');
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.hero}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>XRPay</Text>
            </View>
            <Text style={styles.title}>Welcome back</Text>
            <Text style={styles.subtitle}>Sign in to keep tabs on your XRPL wallet.</Text>
            <Image source={require('../../assets/images/android-icon-foreground.png')} style={styles.heroIcon} />
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Login</Text>
            <Text style={styles.cardHint}>Use the email and password you registered with.</Text>

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
                placeholder="••••••••"
                placeholderTextColor="#9aa5b5"
                secureTextEntry
                textContentType="password"
                value={form.password}
                onChangeText={(password: string) => setForm({ ...form, password })}
              />
            </View>

            <TouchableOpacity style={[styles.primaryButton, loading && styles.primaryButtonDisabled]} onPress={handleLogin} disabled={loading}>
              {loading ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.primaryButtonText}>Sign In</Text>}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.push('/auth/RoleSelection')} style={styles.secondaryAction}>
              <Text style={styles.secondaryActionText}>Need an account? Create one</Text>
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
  hero: { alignItems: 'center', marginBottom: 20 },
  badge: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#e8f0ff', borderRadius: 999, marginBottom: 12 },
  badgeText: { color: '#1b4ed7', fontWeight: '600', letterSpacing: 0.4 },
  title: { fontSize: 30, fontWeight: '800', color: '#0f172a', textAlign: 'center' },
  subtitle: { marginTop: 8, fontSize: 15, color: '#4b5563', textAlign: 'center', lineHeight: 22 },
  heroIcon: { width: 88, height: 88, marginTop: 20 },
  card: { backgroundColor: '#ffffff', borderRadius: 16, padding: 20, shadowColor: '#0f172a', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 4 },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  cardHint: { marginTop: 6, fontSize: 14, color: '#6b7280' },
  inputGroup: { marginTop: 16 },
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
  primaryButton: { marginTop: 20, backgroundColor: '#1d4ed8', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  primaryButtonDisabled: { opacity: 0.7 },
  primaryButtonText: { color: '#ffffff', fontWeight: '700', fontSize: 16, letterSpacing: 0.3 },
  secondaryAction: { marginTop: 16, alignItems: 'center' },
  secondaryActionText: { color: '#1d4ed8', fontWeight: '600' },
});
