import { firebaseApp } from '@/firebaseConfig';
import { xrplService } from '@/services/xrplService';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { getAuth, signOut } from 'firebase/auth';
import {
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  orderBy,
  query,
  updateDoc,
  where
} from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Button,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

interface Student {
  id: string;
  name: string;
  email: string;
  walletAddress: string;
}

interface Transaction {
  id: string;
  fromName: string;
  toName: string;
  amount: number;
  date: any;
  status: string;
}

interface ConnectionRequest {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  status: string;
  createdAt: any;
}

export default function ParentDashboard() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [parentName, setParentName] = useState('');
  const [parentWalletAddress, setParentWalletAddress] = useState('');
  const [rlusdBalance, setRlusdBalance] = useState('0.00');
  const [xrpBalance, setXrpBalance] = useState('0.00');
  const [parentWalletSeed, setParentWalletSeed] = useState('');
  
  const [pendingRequests, setPendingRequests] = useState<ConnectionRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [newStudentWallet, setNewStudentWallet] = useState('');
  const [addingStudent, setAddingStudent] = useState(false);

  useEffect(() => {
    console.log('📱 ParentDashboard screen mounted, fetching data...');
    fetchData();
    fetchPendingRequests();
  }, []);

  const fetchPendingRequests = async () => {
    try {
      const auth = getAuth(firebaseApp);
      const db = getFirestore(firebaseApp);
      const parentId = auth.currentUser?.uid;

      if (!parentId) return;

      const requestsQuery = query(
        collection(db, 'connection_requests'),
        where('parentId', '==', parentId),
        where('status', '==', 'pending')
      );

      const snapshot = await getDocs(requestsQuery);
      const requests: ConnectionRequest[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ConnectionRequest[];

      setPendingRequests(requests);
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setLoadingRequests(false);
    }
  };

  const handleApproveRequest = async (requestId: string, studentId: string) => {
    try {
      const auth = getAuth(firebaseApp);
      const db = getFirestore(firebaseApp);
      const parentId = auth.currentUser?.uid;

      if (!parentId) {
        Alert.alert('Error', 'You must be logged in');
        return;
      }

      await updateDoc(doc(db, 'connection_requests', requestId), {
        status: 'approved',
        approvedAt: new Date()
      });

      const parentRef = doc(db, 'users', parentId);
      await updateDoc(parentRef, {
        studentIds: arrayUnion(studentId)
      });

      const studentRef = doc(db, 'users', studentId);
      await updateDoc(studentRef, {
        parentIds: arrayUnion(parentId)
      });

      Alert.alert('Success', 'Student connection approved!');
      fetchPendingRequests();
      fetchData();
    } catch (error) {
      console.error('Error approving request:', error);
      Alert.alert('Error', 'Failed to approve request');
    }
  };

  const handleAddStudentByWallet = async () => {
    if (!newStudentWallet.trim()) {
      Alert.alert('Error', 'Please enter a wallet address');
      return;
    }

    if (!newStudentWallet.startsWith('r') || newStudentWallet.length < 25 || newStudentWallet.length > 35) {
      Alert.alert('Invalid Address', 'Please enter a valid XRPL wallet address');
      return;
    }

    setAddingStudent(true);
    try {
      const auth = getAuth(firebaseApp);
      const db = getFirestore(firebaseApp);
      const parentId = auth.currentUser?.uid;

      if (!parentId) {
        Alert.alert('Error', 'You must be logged in');
        return;
      }

      console.log('🔍 Searching for student with wallet:', newStudentWallet);

      const usersQuery = query(
        collection(db, 'users'),
        where('walletAddress', '==', newStudentWallet.trim()),
        where('role', '==', 'student')
      );
      const usersSnapshot = await getDocs(usersQuery);

      if (usersSnapshot.empty) {
        Alert.alert(
          'Student Not Found',
          'No student found with this wallet address. Make sure the student has signed up with this wallet.'
        );
        return;
      }

      const studentDoc = usersSnapshot.docs[0];
      const studentId = studentDoc.id;
      const studentData = studentDoc.data();

      console.log('✅ Found student:', studentData.name, '(UID:', studentId, ')');

      if (studentData.parentIds?.includes(parentId)) {
        Alert.alert('Already Connected', `You are already connected to ${studentData.name}`);
        setShowAddStudentModal(false);
        setNewStudentWallet('');
        return;
      }

      const parentRef = doc(db, 'users', parentId);
      await updateDoc(parentRef, {
        studentIds: arrayUnion(studentId)
      });

      const studentRef = doc(db, 'users', studentId);
      await updateDoc(studentRef, {
        parentIds: arrayUnion(parentId)
      });

      Alert.alert(
        'Success',
        `Successfully connected to ${studentData.name}!\n\nYou can now send them money.`
      );

      setShowAddStudentModal(false);
      setNewStudentWallet('');
      fetchData(); 
    } catch (error: any) {
      console.error('❌ Error adding student:', error);
      Alert.alert('Error', error.message || 'Failed to add student');
    } finally {
      setAddingStudent(false);
    }
  };

  const fetchData = async () => {
    try {
      const auth = getAuth(firebaseApp);
      const db = getFirestore(firebaseApp);
      const user = auth.currentUser;

      if (!user) return;

      const parentDoc = await getDoc(doc(db, 'users', user.uid));
      const parentData = parentDoc.data();

      if (parentData) {
        setParentName(parentData.name || 'Parent');
        setParentWalletAddress(parentData.walletAddress || '');
        setParentWalletSeed(parentData.walletSeed || '');
        
        if (parentData.walletAddress) {
          try {
            const liveBalance = await xrplService.getRLUSDBalance(parentData.walletAddress);
            setRlusdBalance(parseFloat(liveBalance).toFixed(2));
            console.log('💰 Live RLUSD balance:', liveBalance);
          } catch (error) {
            console.error('Error fetching RLUSD balance:', error);
            setRlusdBalance(parentData.balance || '0.00');
          }
        } else {
          setRlusdBalance(parentData.balance || '0.00');
        }
        
        setXrpBalance(parentData.xrpBalance || '0.00');
      }

      if (parentData?.studentIds && Array.isArray(parentData.studentIds)) {
        const studentsList: Student[] = [];
        for (const studentId of parentData.studentIds) {
          const studentDoc = await getDoc(doc(db, 'users', studentId));
          if (studentDoc.exists()) {
            const studentData = studentDoc.data();
            studentsList.push({
              id: studentDoc.id,
              name: studentData.name || 'Student',
              email: studentData.email || '',
              walletAddress: studentData.walletAddress || '',
            });
          }
        }
        setStudents(studentsList);
      }

      const transactionsQuery = query(
        collection(db, 'transactions'),
        where('fromId', '==', user.uid),
        orderBy('date', 'desc')
      );
      const transactionsSnapshot = await getDocs(transactionsQuery);
      const transactionsList: Transaction[] = transactionsSnapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      })) as Transaction[];
      setTransactions(transactionsList);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    await fetchPendingRequests();
    setRefreshing(false);
  };

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

  const getTotalSentThisMonth = () => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return transactions
      .filter((tx) => {
        const txDate = tx.date?.toDate ? tx.date.toDate() : new Date(tx.date);
        return txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear;
      })
      .reduce((sum, tx) => sum + (tx.amount || 0), 0)
      .toFixed(2);
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
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
      <Text style={styles.title}>Parent Dashboard</Text>

      <View style={styles.walletCard}>
        <View style={styles.walletHeader}>
          <View>
            <Text style={styles.walletTitle}>My Wallet</Text>
            <Text style={styles.walletName}>{parentName}</Text>
          </View>
          <Ionicons name="wallet" size={40} color="#007AFF" />
        </View>
        
        <View style={styles.balanceContainer}>
          <View style={styles.balanceItem}>
            <Text style={styles.balanceLabel}>RLUSD Balance</Text>
            <Text style={styles.balanceAmount}>${rlusdBalance}</Text>
          </View>
        </View>

        {parentWalletAddress && (
          <View style={styles.addressContainer}>
            <Text style={styles.addressLabel}>Wallet Address</Text>
            <Text style={styles.addressText} numberOfLines={1}>
              {parentWalletAddress}
            </Text>
            {parentWalletSeed && (
              <>
                <Text style={styles.seedLabel}>Wallet Seed</Text>
                <Text style={styles.seedText} numberOfLines={1}>
                  {parentWalletSeed}
                </Text>
              </>
            )}
          </View>
        )}
      </View>

      <View style={styles.totalCard}>
        <Ionicons name="trending-up" size={32} color="#34C759" />
        <View style={styles.totalInfo}>
          <Text style={styles.totalLabel}>Total Sent This Month</Text>
          <Text style={styles.totalAmount}>${getTotalSentThisMonth()}</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>My Students</Text>
      {students.length === 0 ? (
        <Text style={styles.noDataText}>No connected students yet</Text>
      ) : (
        students.map((student) => (
          <View key={student.id} style={styles.studentCard} testID={`student-${student.id}`}>
            <View style={styles.studentHeader}>
              <Ionicons name="person-circle" size={48} color="#007AFF" />
              <View style={styles.studentInfo}>
                <Text style={styles.studentName}>{student.name}</Text>
                <Text style={styles.studentEmail}>{student.email}</Text>
                <Text style={styles.studentWallet}>{student.walletAddress}</Text>
              </View>
            </View>

            <TouchableOpacity 
              style={styles.quickSendButton}
              onPress={() => router.push({
                pathname: '/(parent-tabs)/send',
                params: { studentId: student.id }
              })}
            >
              <Ionicons name="paper-plane" size={20} color="#fff" />
              <Text style={styles.quickSendText}>Quick Send</Text>
            </TouchableOpacity>
          </View>
        ))
      )}

      <TouchableOpacity 
        style={styles.addStudentButton}
        onPress={() => setShowAddStudentModal(true)}
      >
        <Ionicons name="add-circle" size={24} color="#007AFF" />
        <Text style={styles.addStudentText}>Add New Student</Text>
      </TouchableOpacity>

      <Modal
        visible={showAddStudentModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAddStudentModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Student by Wallet</Text>
              <TouchableOpacity onPress={() => {
                setShowAddStudentModal(false);
                setNewStudentWallet('');
              }}>
                <Ionicons name="close" size={28} color="#333" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalDescription}>
              Enter the student's XRPL wallet address to connect and start sending money.
            </Text>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Student Wallet Address</Text>
              <TextInput
                style={styles.walletInput}
                value={newStudentWallet}
                onChangeText={setNewStudentWallet}
                placeholder="rXXXXXXXXXXXXXXXXXXXXXXXXXXXXX..."
                autoCapitalize="none"
                autoCorrect={false}
                editable={!addingStudent}
              />
              <Text style={styles.inputHelper}>
                The wallet address must start with 'r' and be 25-35 characters long
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.addButton, addingStudent && styles.addButtonDisabled]}
              onPress={handleAddStudentByWallet}
              disabled={addingStudent}
            >
              {addingStudent ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="person-add" size={20} color="#fff" />
                  <Text style={styles.addButtonText}>Connect Student</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {pendingRequests.length > 0 && (
        <View style={styles.requestsContainer}>
          <Text style={styles.sectionTitle}>Pending Connection Requests</Text>
          {pendingRequests.map((request) => (
            <View key={request.id} style={styles.requestCard}>
              <View style={styles.requestInfo}>
                <Ionicons name="person-add" size={24} color="#007AFF" />
                <View style={styles.requestDetails}>
                  <Text style={styles.requestStudent}>{request.studentName}</Text>
                  <Text style={styles.requestEmail}>{request.studentEmail}</Text>
                </View>
              </View>
              <View style={styles.requestActions}>
                <TouchableOpacity
                  style={styles.approveButton}
                  onPress={() => handleApproveRequest(request.id, request.studentId)}
                >
                  <Text style={styles.approveButtonText}>Approve</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.rejectButton}
                  onPress={() => console.log('Reject', request.id)}
                >
                  <Text style={styles.rejectButtonText}>Reject</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

      <Text style={styles.sectionTitle}>Recent Activity</Text>
      {transactions.length === 0 ? (
        <Text style={styles.noDataText}>No transactions yet</Text>
      ) : (
        <View style={styles.activityCard}>
          {transactions.slice(0, 5).map((tx) => (
            <View key={tx.id} style={styles.activityItem} testID={`activity-${tx.id}`}>
              <Ionicons name="arrow-forward-circle" size={28} color="#FF9500" />
              <View style={styles.activityDetails}>
                <Text style={styles.activityStudent}>{tx.toName}</Text>
                <Text style={styles.activityDate}>
                  {tx.date?.toDate ? tx.date.toDate().toLocaleDateString() : new Date(tx.date).toLocaleDateString()}
                </Text>
              </View>
              <Text style={styles.activityAmount}>${tx.amount}</Text>
            </View>
          ))}
        </View>
      )}

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
    marginBottom: 24,
    marginTop: 12,
  },
  walletCard: {
    backgroundColor: '#007AFF',
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  walletHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  walletTitle: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
    marginBottom: 4,
  },
  walletName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  balanceContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  balanceItem: {
    flex: 1,
  },
  balanceDivider: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginHorizontal: 16,
  },
  balanceLabel: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.8,
    marginBottom: 6,
  },
  balanceAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  addressContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    padding: 12,
  },
  addressLabel: {
    fontSize: 11,
    color: '#fff',
    opacity: 0.8,
    marginBottom: 4,
  },
  addressText: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#fff',
  },
  seedLabel: {
    fontSize: 11,
    color: '#fff',
    opacity: 0.8,
    marginTop: 8,
    marginBottom: 4,
  },
  seedText: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#fff',
  },
  totalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  totalInfo: {
    flex: 1,
  },
  totalLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  totalAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#34C759',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    marginTop: 8,
  },
  studentCard: {
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
  studentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  studentEmail: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  studentWallet: {
    fontSize: 11,
    color: '#999',
    fontFamily: 'monospace',
  },
  quickSendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  quickSendText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  addStudentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 24,
    gap: 8,
    borderWidth: 2,
    borderColor: '#007AFF',
    borderStyle: 'dashed',
  },
  addStudentText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  noDataText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 20,
  },
  // New styles for connection requests
  requestsContainer: {
    marginBottom: 24,
  },
  requestCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  requestInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  requestDetails: {
    flex: 1,
  },
  requestStudent: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  requestEmail: {
    fontSize: 12,
    color: '#666',
  },
  requestActions: {
    flexDirection: 'row',
    gap: 8,
  },
  approveButton: {
    flex: 1,
    backgroundColor: '#34C759',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  approveButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  rejectButton: {
    flex: 1,
    backgroundColor: '#FF3B30',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  rejectButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  activityCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    gap: 12,
  },
  activityDetails: {
    flex: 1,
  },
  activityStudent: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  activityDate: {
    fontSize: 12,
    color: '#999',
  },
  activityAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF9500',
  },
  logoutContainer: {
    marginTop: 8,
    marginBottom: 20,
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
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
    lineHeight: 20,
  },
  inputContainer: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  walletInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    fontFamily: 'monospace',
  },
  inputHelper: {
    fontSize: 11,
    color: '#999',
    marginTop: 6,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
  },
  addButtonDisabled: {
    opacity: 0.6,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});