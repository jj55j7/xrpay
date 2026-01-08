import { firebaseApp } from '@/firebaseConfig';
import { Ionicons } from '@expo/vector-icons';
import { getAuth, signOut } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, getFirestore, orderBy, query, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Button, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface UserData {
  name: string;
  email: string;
  walletAddress?: string;
  role?: string;
  parentIds?: string[];
}

interface Parent {
  uid: string;
  name: string;
}

interface Transaction {
  id: string;
  type: 'received' | 'sent';
  amount: number;
  fromName?: string;
  toName?: string;
  date: any;
  status: string;
  note?: string;
}

export default function ProfileScreen() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);
  const [parents, setParents] = useState<Parent[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const auth = getAuth(firebaseApp);
        const db = getFirestore(firebaseApp);
        const user = auth.currentUser;

        if (!user) {
          setLoading(false);
          return;
        }
        
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          
          if (userDoc.exists()) {
            const userData = userDoc.data() as UserData;
            setUserData(userData);
            
            const parentIds = userData.parentIds || [];
            const parentsList: Parent[] = [];
            for (const parentId of parentIds) {
              const parentDoc = await getDoc(doc(db, 'users', parentId));
              if (parentDoc.exists()) {
                parentsList.push({
                  uid: parentDoc.id,
                  name: parentDoc.data().name,
                });
              }
            }
            setParents(parentsList);
            setLoading(false);
            
            try {
              console.log('🔍 Fetching profile transactions for student:', user.uid);
              const transactionsQuery = query(
                collection(db, 'transactions'),
                where('toId', '==', user.uid),
                orderBy('date', 'desc')
              );
              const transactionsSnapshot = await getDocs(transactionsQuery);
              console.log('📊 Found', transactionsSnapshot.docs.length, 'profile transactions');
              
              const transactionsList: Transaction[] = transactionsSnapshot.docs.map((docSnap) => ({
                id: docSnap.id,
                type: 'received',
                amount: docSnap.data().amount,
                fromName: docSnap.data().fromName,
                date: docSnap.data().date,
                status: docSnap.data().status,
                note: docSnap.data().note || '',
              }));
              setTransactions(transactionsList);
            } catch (txError: any) {
              console.error('❌ Error fetching profile transactions:', txError);
              console.error('   Error code:', txError.code);
              console.error('   Error message:', txError.message);
              
              if (txError.code === 'failed-precondition' || txError.message?.includes('index')) {
                console.error('\n🔗 MISSING FIRESTORE INDEX!');
                console.error('   Create the index by clicking the link in this error:');
                console.error('   ' + txError.message);
                
                const linkMatch = txError.message?.match(/(https:\/\/console\.firebase\.google\.com\/[^\s]+)/);
                if (linkMatch) {
                  console.error('\n   Direct link: ' + linkMatch[1]);
                }
              }
            }
            return;
          } else {
            setLoading(false);
          }
        } catch (error) {
          console.error('Error fetching from Firestore:', error);
          setLoading(false);
        }
      } catch (error: any) {
        console.error('Error fetching user data:', error);
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      const auth = getAuth(firebaseApp);
      await signOut(auth);
    } catch (error: any) {
      console.error('Sign out error:', error);
    } finally {
      setSigningOut(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (!userData) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.error}>Failed to load user data</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={() => {
            setLoading(true);
            setUserData(null);
            // Trigger re-fetch
            setTimeout(() => {
              window.location.reload?.();
            }, 100);
          }}
        >
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.signOutButton}
          onPress={handleSignOut}
        >
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Transaction History</Text>

      <View style={styles.profileCard}>
        <View style={styles.avatarContainer}>
          <Ionicons name="person-circle" size={80} color="#007AFF" />
        </View>
        <Text style={styles.name}>{userData.name}</Text>
        <Text style={styles.email}>{userData.email}</Text>
        {userData.role && (
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{userData.role.toUpperCase()}</Text>
          </View>
        )}
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.sectionTitle}>Connected Parents</Text>
        {parents.length === 0 ? (
          <Text style={styles.emptyText}>No connected parents yet</Text>
        ) : (
          parents.map((parent) => (
            <View key={parent.uid} style={styles.parentItem}>
              <Ionicons name="people" size={24} color="#007AFF" />
              <View style={styles.parentInfo}>
                <Text style={styles.parentName}>{parent.name}</Text>
              </View>
            </View>
          ))
        )}
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.sectionTitle}>Transaction History</Text>
        {transactions.length === 0 ? (
          <Text style={styles.emptyText}>No transactions yet</Text>
        ) : (
          transactions.map((tx) => (
            <View key={tx.id} style={styles.transactionItem}>
              <View style={styles.transactionLeft}>
                <Ionicons 
                  name="arrow-down-circle" 
                  size={28} 
                  color="#34C759" 
                />
                <View style={styles.transactionDetails}>
                  <Text style={styles.transactionTarget}>
                    From: {tx.fromName}
                  </Text>
                  <Text style={styles.transactionDate}>{tx.date?.toDate ? tx.date.toDate().toLocaleDateString() : new Date(tx.date).toLocaleDateString()}</Text>
                  {tx.note && (
                    <Text style={styles.transactionNote}>📝 {tx.note}</Text>
                  )}
                </View>
              </View>
              <Text 
                style={[
                  styles.transactionAmount,
                  { color: '#34C759' }
                ]}
              >
                +${tx.amount}
              </Text>
            </View>
          ))
        )}
      </View>

      <View style={styles.logoutContainer}>
        <Button 
          title={signingOut ? 'Signing Out...' : 'Logout'} 
          onPress={handleSignOut}
          disabled={signingOut}
          color="#FF3B30"
        />
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
    marginTop: 12,
  },
  profileCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  roleBadge: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
  },
  roleText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    flex: 2,
  },
  parentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    gap: 12,
  },
  parentInfo: {
    flex: 1,
  },
  parentName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  parentWallet: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'monospace',
    marginBottom: 2,
  },
  parentDate: {
    fontSize: 12,
    color: '#999',
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  transactionLeft: {
    flex: 1,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  transactionDetails: {
    flex: 1,
  },
  transactionTarget: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  transactionDate: {
    fontSize: 12,
    color: '#999',
  },
  transactionNote: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 4,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  logoutContainer: {
    marginTop: 8,
    marginBottom: 20,
  },
  error: {
    fontSize: 16,
    color: '#FF3B30',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  retryText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  signOutButton: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  signOutText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingVertical: 20,
  },
});
