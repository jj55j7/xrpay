import { firebaseApp } from '@/firebaseConfig';
import { Ionicons } from '@expo/vector-icons';
import { getAuth } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, getFirestore, orderBy, query, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface Transaction {
  id: string;
  fromName: string;
  toName: string;
  amount: number;
  date: any;
  status: string;
  hash: string;
}

interface Student {
  id: string;
  name: string;
}

export default function TransactionHistory() {
  const [filterStudent, setFilterStudent] = useState('all');
  const [filterMonth, setFilterMonth] = useState('all');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [students, setStudents] = useState<Student[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const auth = getAuth(firebaseApp);
      const db = getFirestore(firebaseApp);
      const user = auth.currentUser;

      if (!user) return;

      const parentDoc = await getDoc(doc(db, 'users', user.uid));
      const parentData = parentDoc.data();

      if (parentData?.studentIds && Array.isArray(parentData.studentIds)) {
        const studentsList: Student[] = [];
        for (const studentId of parentData.studentIds) {
          const studentDoc = await getDoc(doc(db, 'users', studentId));
          if (studentDoc.exists()) {
            studentsList.push({
              id: studentDoc.id,
              name: studentDoc.data().name,
            });
          }
        }
        setStudents(studentsList);
      }

      console.log('🔍 Fetching parent transactions for:', user.uid);
      const transactionsQuery = query(
        collection(db, 'transactions'),
        where('fromId', '==', user.uid),
        orderBy('date', 'desc')
      );
      const transactionsSnapshot = await getDocs(transactionsQuery);
      console.log('📊 Found', transactionsSnapshot.docs.length, 'parent transactions');
      
      const transactionsList: Transaction[] = transactionsSnapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        console.log('   Transaction:', docSnap.id, '- Amount:', data.amount, 'To:', data.toName);
        return {
          id: docSnap.id,
          ...data,
        } as Transaction;
      });
      setTransactions(transactionsList);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  }

  const openExplorer = (hash: string) => {
    const url = `https://testnet.xrpl.org/transactions/${hash}`;
    Linking.openURL(url).catch((err) => console.error('Failed to open URL:', err));
  };

  // Filter transactions
  const filteredTransactions = transactions.filter((tx) => {
    if (filterStudent !== 'all') {
      if (tx.toName !== filterStudent) return false;
    }

    if (filterMonth !== 'all') {
      const txDate = tx.date?.toDate ? tx.date.toDate() : new Date(tx.date);
      const txMonth = txDate.toISOString().substring(0, 7); // YYYY-MM
      if (txMonth !== filterMonth) return false;
    }

    return true;
  });

  const totalSent = filteredTransactions
    .reduce((sum, tx) => sum + (tx.amount || 0), 0)
    .toFixed(2);

  const months = Array.from(
    new Set(
      transactions.map((tx) => {
        const date = tx.date?.toDate ? tx.date.toDate() : new Date(tx.date);
        return date.toISOString().substring(0, 7);
      })
    )
  ).sort((a, b) => b.localeCompare(a));

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Transaction History</Text>

      <View style={styles.summaryCard}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Total Transactions</Text>
          <Text style={styles.summaryValue}>{filteredTransactions.length}</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Total Sent</Text>
          <Text style={styles.summaryValue}>${totalSent}</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Transactions</Text>
      {filteredTransactions.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="receipt-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>No transactions found</Text>
        </View>
      ) : (
        filteredTransactions.map((tx) => (
          <View key={tx.id} style={styles.transactionCard} testID={`transaction-${tx.id}`}>
            <View style={styles.transactionHeader}>
              <View style={styles.iconContainer}>
                <Ionicons name="arrow-forward-circle" size={32} color="#FF9500" />
              </View>
              <View style={styles.transactionInfo}>
                <Text style={styles.transactionStudent}>{tx.toName}</Text>
                <Text style={styles.transactionDate}>
                  {tx.date?.toDate ? tx.date.toDate().toLocaleDateString() : new Date(tx.date).toLocaleDateString()}
                </Text>
              </View>
              <Text style={styles.transactionAmount}>-${tx.amount}</Text>
            </View>

            <View style={styles.transactionDetails}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Status:</Text>
                <View style={styles.statusBadge}>
                  <Ionicons name="checkmark-circle" size={16} color="#34C759" />
                  <Text style={styles.statusText}>{tx.status}</Text>
                </View>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Transaction Hash:</Text>
                {tx.hash ? (
                  <TouchableOpacity 
                    style={styles.hashButton}
                    onPress={() => openExplorer(tx.hash)}
                  >
                    <Text style={styles.hashText}>{tx.hash.substring(0, 16)}...</Text>
                    <Ionicons name="open-outline" size={16} color="#007AFF" />
                  </TouchableOpacity>
                ) : (
                  <Text style={styles.hashText}>Pending...</Text>
                )}
              </View>
            </View>
          </View>
        ))
      )}

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
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
    marginTop: 12,
  },
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
  },
  summaryDivider: {
    width: 1,
    backgroundColor: '#eee',
    marginHorizontal: 16,
  },
  filtersContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  filterSection: {
    flex: 1,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  pickerContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    overflow: 'hidden',
  },
  picker: {
    height: 40,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16,
  },
  transactionCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  transactionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  transactionInfo: {
    flex: 1,
  },
  transactionStudent: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  transactionDate: {
    fontSize: 12,
    color: '#999',
  },
  transactionAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF9500',
  },
  transactionDetails: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 13,
    color: '#666',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    color: '#34C759',
    fontWeight: '600',
  },
  hashButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  hashText: {
    fontSize: 11,
    color: '#007AFF',
    fontFamily: 'monospace',
  },
});
