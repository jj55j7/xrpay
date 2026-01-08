
import { firebaseApp } from '@/firebaseConfig';
import { xrplService } from '@/services/xrplService';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { getAuth } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, getFirestore, orderBy, query, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface Transaction {
  id: string;
  amount: number;
  fromName: string;
  date: any;
  note?: string;
}

interface WalletData {
  address: string;
  balance: string;
  xrpBalance: string;
  seed: string;
}

export default function HomeScreen() {
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const auth = getAuth(firebaseApp);
      const db = getFirestore(firebaseApp);
      const user = auth.currentUser;

      if (!user) {
        setLoading(false);
        return;
      }

      // Fetch user's wallet address from users collection
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const userData = userDoc.data();
        if (userData?.walletAddress) {
          // Fetch live RLUSD balance from blockchain
          let liveBalance = userData.balance || '0.00';
          try {
            const blockchainBalance = await xrplService.getRLUSDBalance(userData.walletAddress);
            liveBalance = parseFloat(blockchainBalance).toFixed(2);
            console.log('💰 Student live RLUSD balance:', blockchainBalance);
          } catch (balanceError) {
            console.error('Error fetching RLUSD balance:', balanceError);
          }
          
          setWalletData({
            address: userData.walletAddress,
            balance: liveBalance,
            xrpBalance: userData.xrpBalance || '0.00',
            seed: userData.walletSeed || '',
          });
        }
      } catch (userError) {
        console.error('Error fetching wallet data:', userError);
      }

      // Fetch transactions received by this student
      try {
        console.log('🔍 Fetching transactions for student:', user.uid);
        console.log('   Student UID length:', user.uid.length);
        console.log('   Student UID type:', typeof user.uid);
        
        // First, let's see ALL transactions to debug
        const allTransactionsQuery = query(
          collection(db, 'transactions'),
          orderBy('date', 'desc')
        );
        const allTransactionsSnapshot = await getDocs(allTransactionsQuery);
        console.log('\n📦 All transactions in Firestore:', allTransactionsSnapshot.docs.length);
        allTransactionsSnapshot.docs.forEach((docSnap) => {
          const data = docSnap.data();
          console.log('   Doc:', docSnap.id);
          console.log('      fromId:', data.fromId, '(length:', data.fromId?.length, ')');
          console.log('      toId:', data.toId, '(length:', data.toId?.length, ')');
          console.log('      amount:', data.amount);
          console.log('      Match?', data.toId === user.uid);
        });
        
        // Now query for this specific student
        const transactionsQuery = query(
          collection(db, 'transactions'),
          where('toId', '==', user.uid),
          orderBy('date', 'desc')
        );
        const transactionsSnapshot = await getDocs(transactionsQuery);
        console.log('\n📊 Found', transactionsSnapshot.docs.length, 'transactions for this student');
        
        const transactionsList: Transaction[] = transactionsSnapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          console.log('   Transaction:', docSnap.id, '- Amount:', data.amount, 'From:', data.fromName);
          return {
            id: docSnap.id,
            amount: data.amount,
            fromName: data.fromName,
            date: data.date,
            note: data.note || '',
          };
        });
        setTransactions(transactionsList);
      } catch (txError: any) {
        console.error('❌ Error fetching transactions:', txError);
        console.error('   Error code:', txError.code);
        console.error('   Error message:', txError.message);
        
        // Check if it's a missing index error
        if (txError.code === 'failed-precondition' || txError.message?.includes('index')) {
          console.error('\n🔗 MISSING FIRESTORE INDEX!');
          console.error('   Create the index by clicking the link in this error:');
          console.error('   ' + txError.message);
          
          // Extract and show the link if available
          const linkMatch = txError.message?.match(/(https:\/\/console\.firebase\.google\.com\/[^\s]+)/);
          if (linkMatch) {
            console.error('\n   Direct link: ' + linkMatch[1]);
          }
        }
      }
    } catch (error) {
      console.error('Error in fetchData:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const getTotalReceived = () => {
    return transactions.reduce((sum, tx) => sum + (tx.amount || 0), 0).toFixed(2);
  };

  const getLastPaymentDate = () => {
    if (transactions.length === 0) return 'No payments yet';
    const date = transactions[0].date?.toDate ? transactions[0].date.toDate() : new Date(transactions[0].date);
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading wallet...</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container} 
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <Text style={styles.title}>Your Wallet</Text>

      {/* Balance Card */}
      {walletData && (
        <>
          <View style={styles.balanceCard}>
            <Text style={styles.currencyLabel}>RLUSD Balance</Text>
            <Text style={styles.balance}>${walletData.balance}</Text>
            <Text style={styles.subtext}>≈ USD</Text>
            
            <TouchableOpacity 
              style={styles.receiveButton}
              onPress={() => setShowReceiveModal(true)}
            >
              <Text style={styles.receiveButtonText}>Receive Money</Text>
            </TouchableOpacity>
          </View>

          {/* Quick Stats */}
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Ionicons name="trending-up" size={24} color="#34C759" />
              <Text style={styles.statLabel}>Total Received</Text>
              <Text style={styles.statValue}>${getTotalReceived()}</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="calendar" size={24} color="#007AFF" />
              <Text style={styles.statLabel}>Last Payment</Text>
              <Text style={styles.statValue}>{getLastPaymentDate()}</Text>
            </View>
          </View>

          {/* Recent Transactions */}
          <View style={styles.recentSection}>
            <Text style={styles.sectionTitle}>Recent Transactions</Text>
            {transactions.length === 0 ? (
              <Text style={styles.emptyText}>No transactions yet</Text>
            ) : (
              transactions.slice(0, 5).map((tx, idx) => (
                <View key={tx.id} style={styles.transactionItem} testID={`transaction-${tx.id}`}>
                  <View style={styles.transactionLeft}>
                    <Ionicons name="arrow-down-circle" size={32} color="#34C759" />
                    <View style={styles.transactionDetails}>
                      <Text style={styles.transactionFrom}>From: {tx.fromName}</Text>
                      <Text style={styles.transactionDate}>{tx.date?.toDate ? tx.date.toDate().toLocaleDateString() : new Date(tx.date).toLocaleDateString()}</Text>
                      {tx.note && (
                        <Text style={styles.transactionNote}>Note: {tx.note}</Text>
                      )}
                    </View>
                  </View>
                  <Text style={styles.transactionAmount}>+${tx.amount}</Text>
                </View>
              ))
            )}
          </View>
        </>
      )}

      {/* Receive Money Modal */}
      <Modal
        visible={showReceiveModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowReceiveModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Receive Money</Text>
              <TouchableOpacity onPress={() => setShowReceiveModal(false)}>
                <Ionicons name="close" size={28} color="#333" />
              </TouchableOpacity>
            </View>

            <View style={styles.walletAddressContainer}>
              <Text style={styles.walletAddressLabel}>Your Wallet Address</Text>
              <View style={styles.walletAddressBox}>
                <Text style={styles.walletAddress} selectable>
                  {walletData?.address}
                </Text>
              </View>
              {walletData?.seed && (
                <>
                  <Text style={styles.walletSeedLabel}>Your Wallet Seed</Text>
                  <View style={styles.walletSeedBox}>
                    <Text style={styles.walletSeed} selectable>
                      {walletData.seed}
                    </Text>
                  </View>
                </>
              )}
              <TouchableOpacity
                style={styles.copyButton}
                onPress={async () => {
                  await Clipboard.setStringAsync(walletData?.address || '');
                  Alert.alert('Copied!', 'Wallet address copied to clipboard');
                }}
              >
                <Ionicons name="copy-outline" size={20} color="#007AFF" />
                <Text style={styles.copyButtonText}>Copy Address</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.instructionsBox}>
              <Text style={styles.instructionsTitle}>💡 How to receive money:</Text>
              <Text style={styles.instructionsText}>
                1. Copy your wallet address above{`\n`}
                2. Share it with anyone who wants to send you RLUSD{`\n`}
                3. They can use "Manual Address" in the Send Money screen{`\n`}
                {`\n`}
                🔗 <Text style={styles.instructionsBold}>Want easier transfers?</Text>{`\n`}
                Go to the "Connection" tab to connect with your parents. They won't need to enter your address each time!
              </Text>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
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
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingVertical: 20,
  },
  balanceCard: {
    backgroundColor: '#007AFF',
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  currencyLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    marginBottom: 8,
  },
  balance: {
    color: '#fff',
    fontSize: 56,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtext: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    marginBottom: 20,
  },
  receiveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
    gap: 8,
  },
  receiveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    marginBottom: 4,
    textAlign: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
  },
  recentSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  transactionItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
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
  transactionFrom: {
    fontSize: 16,
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
    fontSize: 18,
    fontWeight: 'bold',
    color: '#34C759',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '90%',
    maxWidth: 500,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  walletAddressContainer: {
    marginBottom: 24,
  },
  walletAddressLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  walletAddressBox: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  walletAddress: {
    fontSize: 13,
    fontFamily: 'monospace',
    color: '#333',
    lineHeight: 20,
  },
  walletSeedLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 12,
  },
  walletSeedBox: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  walletSeed: {
    fontSize: 13,
    fontFamily: 'monospace',
    color: '#333',
    lineHeight: 20,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E3F2FD',
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 12,
    gap: 8,
  },
  copyButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  instructionsBox: {
    backgroundColor: '#FFF9E6',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FFE082',
  },
  instructionsTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#F57C00',
    marginBottom: 8,
  },
  instructionsText: {
    fontSize: 13,
    color: '#E65100',
    lineHeight: 20,
  },
  instructionsBold: {
    fontWeight: 'bold',
  },
});
