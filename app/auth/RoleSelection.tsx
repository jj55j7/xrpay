import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function RoleSelection() {
  const router = useRouter();
  const cards = useMemo(
    () => [
      {
        role: 'parent',
        title: 'Parent',
        description: 'Fund, monitor, and approve your student wallet activity.',
        badge: 'Guardian',
        accent: '#0ea5e9',
      },
      {
        role: 'student',
        title: 'Student',
        description: 'Spend with oversight and track XRPL balances in one place.',
        badge: 'Learner',
        accent: '#22c55e',
      },
    ],
    [],
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>XRPay</Text>
          </View>
          <Text style={styles.title}>Choose your role</Text>
          <Text style={styles.subtitle}>Pick the experience that matches how you use the XRPay student wallet.</Text>
        </View>

        <View style={styles.cardGrid}>
          {cards.map((item) => (
            <TouchableOpacity
              key={item.role}
              activeOpacity={0.9}
              style={[styles.card, { borderColor: item.accent }]}
              onPress={() => router.push({ pathname: '/auth/Signup', params: { role: item.role } })}
            >
              <View style={[styles.cardBadge, { backgroundColor: `${item.accent}12` }]}>
                <Text style={[styles.cardBadgeText, { color: item.accent }]}>{item.badge}</Text>
              </View>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardDescription}>{item.description}</Text>
              <View style={styles.cardCTA}>
                <Text style={[styles.cardCTAText, { color: item.accent }]}>Continue</Text>
                <Text style={[styles.cardCTACaret, { color: item.accent }]}>{'>'}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f4f6fb' },
  container: { flex: 1, padding: 24 },
  header: { alignItems: 'center', marginBottom: 24 },
  badge: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#e8f0ff', borderRadius: 999, marginBottom: 12 },
  badgeText: { color: '#1b4ed7', fontWeight: '600', letterSpacing: 0.4 },
  title: { fontSize: 28, fontWeight: '800', color: '#0f172a', textAlign: 'center' },
  subtitle: { marginTop: 8, fontSize: 15, color: '#4b5563', textAlign: 'center', lineHeight: 22 },
  cardGrid: { gap: 14 },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    shadowColor: '#0f172a',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  cardBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, marginBottom: 10 },
  cardBadgeText: { fontWeight: '700', letterSpacing: 0.2 },
  cardTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  cardDescription: { marginTop: 6, fontSize: 14, color: '#4b5563', lineHeight: 21 },
  cardCTA: { marginTop: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', gap: 6 },
  cardCTAText: { fontWeight: '700', fontSize: 15 },
  cardCTACaret: { fontWeight: '800', fontSize: 18 },
});
