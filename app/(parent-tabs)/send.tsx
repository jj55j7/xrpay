import { firebaseApp } from '@/firebaseConfig';
import { xrplService } from '@/services/xrplService';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { getAuth } from 'firebase/auth';
import { addDoc, collection, doc, getDoc, getDocs, getFirestore, query, serverTimestamp, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Wallet } from 'xrpl';

interface Student {
  id: string;
  name: string;
  walletAddress: string;
}

const PRESET_AMOUNTS = ['50', '100', '200', '500'];

export default function SendMoney() {
  const { studentId } = useLocalSearchParams<{ studentId?: string }>();
  const [selectedStudent, setSelectedStudent] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [showStudentPicker, setShowStudentPicker] = useState(false);
  const [useManualAddress, setUseManualAddress] = useState(false);
  const [manualAddress, setManualAddress] = useState('');

  useEffect(() => {
    console.log('📱 SendMoney screen mounted, fetching students...');
    fetchStudents();
  }, []);

  useEffect(() => {
    if (studentId && students.length > 0) {
      console.log('🎯 Auto-selecting student:', studentId);
      setSelectedStudent(studentId);
    }
  }, [studentId, students]);

  const fetchStudents = async () => {
    try {
      const auth = getAuth(firebaseApp);
      const db = getFirestore(firebaseApp);
      const user = auth.currentUser;

      if (!user) {
        console.log('❌ No authenticated user');
        return;
      }

      const parentDoc = await getDoc(doc(db, 'users', user.uid));
      const parentData = parentDoc.data();

      console.log('👤 Parent data:', { 
        uid: user.uid, 
        studentIds: parentData?.studentIds,
        hasStudentIds: !!parentData?.studentIds 
      });

      if (parentData?.studentIds && Array.isArray(parentData.studentIds)) {
        console.log('📋 Found', parentData.studentIds.length, 'connected student(s)');
        
        const studentsList: Student[] = [];
        for (const studentId of parentData.studentIds) {
          const studentDoc = await getDoc(doc(db, 'users', studentId));
          if (studentDoc.exists()) {
            studentsList.push({
              id: studentDoc.id,
              name: studentDoc.data().name,
              walletAddress: studentDoc.data().walletAddress,
            });
            console.log('✅ Loaded student:', studentDoc.data().name);
          }
        }
        setStudents(studentsList);
        console.log('✅ Total students loaded:', studentsList.length);
      } else {
        console.log('⚠️  No connected students. Go to Dashboard to approve connection requests.');
      }
    } catch (error) {
      console.error('❌ Error fetching students:', error);
    }
  }

  const handlePresetAmount = (value: string) => {
    setAmount(value);
  };

  const validateAddress = (address: string): boolean => {
    if (!address || address.length < 25 || address.length > 35) return false;
    if (!address.startsWith('r')) return false;
    if (/[0OIl]/.test(address)) return false;
    return true;
  };

  const handleSend = async () => {
    let recipientAddress = '';
    let recipientName = '';

    if (useManualAddress) {
      if (!manualAddress.trim()) {
        Alert.alert('Error', 'Please enter a wallet address');
        return;
      }
      
      recipientAddress = manualAddress.trim();
      
      if (!validateAddress(recipientAddress)) {
        Alert.alert(
          'Invalid Address',
          'Please enter a valid XRPL address (starts with "r" and 25-35 characters)'
        );
        return;
      }
      
      recipientName = 'Manual Address';
    } else {
      if (!selectedStudent) {
        Alert.alert('Error', 'Please select a student');
        return;
      }
      const student = students.find((s) => s.id === selectedStudent);
      if (!student) {
        Alert.alert('Error', 'Student not found');
        return;
      }
      recipientAddress = student.walletAddress;
      recipientName = student.name;
      
      console.log('💡 Sending to connected student:');
      console.log('   selectedStudent (Firebase UID):', selectedStudent);
      console.log('   student.id:', student.id);
      console.log('   student.walletAddress:', student.walletAddress);
      console.log('   Will save toId as:', selectedStudent);
    }

    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }
    
    const displayName = useManualAddress 
      ? `${recipientAddress.substring(0, 8)}...${recipientAddress.substring(recipientAddress.length - 6)}`
      : recipientName;
    
    Alert.alert(
      'Confirm Send',
      `Send $${amount} RLUSD\n\nTo: ${displayName}${useManualAddress ? '' : `\nAddress: ${recipientAddress.substring(0, 10)}...${recipientAddress.substring(recipientAddress.length - 4)}`}\n${note ? `\nNote: ${note}` : ''}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send',
          onPress: async () => {
            setSending(true);
            try {
              const auth = getAuth(firebaseApp);
              const db = getFirestore(firebaseApp);
              const user = auth.currentUser;

              if (!user) return;

              // Get parent data
              const parentDoc = await getDoc(doc(db, 'users', user.uid));
              const parentData = parentDoc.data();

              if (!parentData?.walletSeed) {
                Alert.alert('Error', 'Parent wallet not configured');
                return;
              }

              console.log('💸 Sending RLUSD payment on blockchain...');
              const parentWallet = Wallet.fromSeed(parentData.walletSeed);
              
              const txResult = await xrplService.sendRLUSDPayment(
                parentWallet,
                recipientAddress,
                amount
              );

              console.log('✅ Payment sent! Hash:', txResult.result.hash);

              try {
                if (!useManualAddress && selectedStudent) {
                  console.log('💾 Saving transaction to Firestore...');
                  console.log('   fromId:', user.uid);
                  console.log('   toId:', selectedStudent);
                  console.log('   amount:', parseFloat(amount));
                  console.log('   note:', note || '(empty)');
                  
                  const txDoc = await addDoc(collection(db, 'transactions'), {
                    fromId: user.uid,
                    toId: selectedStudent,
                    fromName: parentData?.name || 'Unknown',
                    toName: recipientName,
                    amount: parseFloat(amount),
                    currency: 'RLUSD',
                    hash: txResult.result.hash,
                    date: serverTimestamp(),
                    status: 'completed',
                    note: note || '',
                  });
                  console.log('✅ Transaction saved with ID:', txDoc.id);
                  console.log('   Saved note field:', note || '(empty)');
                } else if (useManualAddress) {
                  console.log('💾 Saving manual address transaction to Firestore...');
                  console.log('   fromId:', user.uid);
                  console.log('   toAddress:', recipientAddress);
                  
                  let studentUid = null;
                  let studentName = 'Manual Address';
                  
                  try {
                    console.log('🔍 Searching for student with wallet:', recipientAddress);
                    const usersQuery = query(
                      collection(db, 'users'),
                      where('walletAddress', '==', recipientAddress)
                    );
                    const usersSnapshot = await getDocs(usersQuery);
                    
                    if (!usersSnapshot.empty) {
                      const studentDoc = usersSnapshot.docs[0];
                      studentUid = studentDoc.id;
                      studentName = studentDoc.data().name || 'Student';
                      console.log('✅ Found student:', studentName, '(UID:', studentUid, ')');
                    } else {
                      console.log('ℹ️ No student found with this wallet address');
                    }
                  } catch (lookupError) {
                    console.warn('⚠️ Student lookup failed:', lookupError);
                  }
                  
                  console.log('   Saving toId as:', studentUid || recipientAddress);
                  console.log('   amount:', parseFloat(amount));
                  
                  const txDoc = await addDoc(collection(db, 'transactions'), {
                    fromId: user.uid,
                    toId: studentUid || recipientAddress,
                    fromName: parentData?.name || 'Unknown',
                    toName: studentName,
                    amount: parseFloat(amount),
                    currency: 'RLUSD',
                    hash: txResult.result.hash,
                    date: serverTimestamp(),
                    status: 'completed',
                    note: note || '',
                    isManualAddress: true,
                    recipientWalletAddress: recipientAddress,
                  });
                  console.log('✅ Transaction saved with ID:', txDoc.id);
                } else {
                  console.warn('⚠️ No recipient selected, skipping Firestore save');
                }
              } catch (firestoreError: any) {
                console.error('❌ Firestore save failed:', firestoreError);
                console.error('   Error code:', firestoreError.code);
                console.error('   Error message:', firestoreError.message);
                Alert.alert(
                  'Warning',
                  'Payment sent on blockchain, but failed to save transaction record.\n\nError: ' + firestoreError.message
                );
              }
              
              Alert.alert(
                'Success',
                `$${amount} RLUSD sent successfully!\n\nTo: ${recipientAddress.substring(0, 10)}...${recipientAddress.substring(recipientAddress.length - 4)}\n\nTransaction: ${txResult.result.hash.substring(0, 12)}...`
              );
              
              setSelectedStudent('');
              setManualAddress('');
              setAmount('');
              setNote('');
            } catch (error: any) {
              console.error('❌ Send error:', error);
              
              let errorMessage = 'Failed to send payment';
              
              if (error.data?.error === 'tecNO_DST') {
                errorMessage = 'Destination account does not exist on the ledger';
              } else if (error.data?.error === 'tecNO_LINE') {
                errorMessage = 'Recipient does not have a trustline for RLUSD. They need to set up RLUSD trustline first.';
              } else if (error.data?.error === 'tecPATH_DRY') {
                errorMessage = 'Insufficient funds or no payment path available';
              } else if (error.data?.error === 'tecUNFUNDED_PAYMENT') {
                errorMessage = 'Insufficient RLUSD balance to complete payment';
              } else if (error.message) {
                errorMessage = error.message;
              }
              
              Alert.alert(
                'Payment Failed',
                errorMessage + '\n\n' + (error.data?.error_message || '')
              );
            } finally {
              setSending(false);
            }
          },
        },
      ]
    );
  };

  const selectedStudentData = students.find((s) => s.id === selectedStudent);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Send Money</Text>

      <View style={styles.toggleContainer}>
        <TouchableOpacity
          style={[styles.toggleButton, !useManualAddress && styles.toggleButtonActive]}
          onPress={() => {
            setUseManualAddress(false);
            setManualAddress('');
          }}
        >
          <Text style={[styles.toggleText, !useManualAddress && styles.toggleTextActive]}>
            Connected Students
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleButton, useManualAddress && styles.toggleButtonActive]}
          onPress={() => {
            setUseManualAddress(true);
            setSelectedStudent('');
          }}
        >
          <Text style={[styles.toggleText, useManualAddress && styles.toggleTextActive]}>
            Manual Transfer
          </Text>
        </TouchableOpacity>
      </View>

      {!useManualAddress ? (
        <>
          <View style={styles.section}>
            <Text style={styles.label}>Select Student {students.length > 0 && `(${students.length})`}</Text>
            {students.length === 0 && (
              <Text style={styles.noStudentsText}>
                No connected students. Use Manual Address for testing.
              </Text>
            )}
            <TouchableOpacity 
              style={styles.studentSelector}
              onPress={() => {
                console.log('🔘 Student selector pressed, students:', students.length);
                if (students.length > 0) {
                  console.log('✅ Opening student picker modal');
                  setShowStudentPicker(true);
                } else {
                  console.log('⚠️  No students available');
                }
              }}
              disabled={students.length === 0}
            >
              <Text style={[styles.studentSelectorText, !selectedStudentData && styles.placeholderText]}>
                {selectedStudentData?.name || 'Choose a student...'}
              </Text>
              <Ionicons name="chevron-down" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <Modal
            visible={showStudentPicker}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setShowStudentPicker(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Select Student</Text>
                  <TouchableOpacity onPress={() => setShowStudentPicker(false)}>
                    <Ionicons name="close" size={28} color="#333" />
                  </TouchableOpacity>
                </View>
                <ScrollView style={styles.studentList}>
                  {students.map((student) => (
                    <TouchableOpacity
                      key={student.id}
                      style={[
                        styles.studentOption,
                        selectedStudent === student.id && styles.studentOptionSelected
                      ]}
                      onPress={() => {
                        setSelectedStudent(student.id);
                        setShowStudentPicker(false);
                      }}
                    >
                      <View style={styles.studentOptionContent}>
                        <Ionicons name="person-circle" size={40} color="#007AFF" />
                        <View style={styles.studentOptionText}>
                          <Text style={styles.studentOptionName}>{student.name}</Text>
                          <Text style={styles.studentOptionWallet} numberOfLines={1}>
                            {student.walletAddress}
                          </Text>
                        </View>
                      </View>
                      {selectedStudent === student.id && (
                        <Ionicons name="checkmark-circle" size={24} color="#007AFF" />
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
          </Modal>
        </>
      ) : (
        <View style={styles.section}>
          <Text style={styles.label}>Recipient Wallet Address</Text>
          <TextInput
            style={styles.addressInput}
            value={manualAddress}
            onChangeText={setManualAddress}
            placeholder="rXXXXXXXXXXXXXXXXXXXXXXXXXXXXX..."
            autoCapitalize="none"
            autoCorrect={false}
            editable={!sending}
          />
          <Text style={styles.helperText}>
            Enter the recipient's XRPL wallet address to send RLUSD directly
          </Text>
        </View>
      )}

      {(selectedStudentData || (useManualAddress && manualAddress)) && (
        <View style={styles.studentInfo}>
          <Ionicons name={useManualAddress ? "wallet" : "person-circle"} size={48} color="#007AFF" />
          <View style={styles.studentDetails}>
            <Text style={styles.studentName}>
              {useManualAddress ? 'Direct Transfer' : selectedStudentData?.name}
            </Text>
            <Text style={styles.studentWallet}>
              {useManualAddress ? manualAddress : selectedStudentData?.walletAddress}
            </Text>
          </View>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.label}>Amount (RLUSD)</Text>
        <View style={styles.amountInputContainer}>
          <Text style={styles.currencySymbol}>$</Text>
          <TextInput
            style={styles.amountInput}
            value={amount}
            onChangeText={setAmount}
            placeholder="0.00"
            keyboardType="decimal-pad"
            editable={!sending}
          />
        </View>
      </View>

      <View style={styles.presetContainer}>
        {PRESET_AMOUNTS.map((preset) => (
          <TouchableOpacity
            key={preset}
            style={[
              styles.presetButton,
              amount === preset && styles.presetButtonActive,
            ]}
            onPress={() => handlePresetAmount(preset)}
            disabled={sending}
          >
            <Text
              style={[
                styles.presetText,
                amount === preset && styles.presetTextActive,
              ]}
            >
              ${preset}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Note (Optional)</Text>
        <TextInput
          style={styles.noteInput}
          value={note}
          onChangeText={setNote}
          placeholder="Add a message..."
          multiline
          numberOfLines={3}
          editable={!sending}
        />
      </View>

      {(selectedStudentData || (useManualAddress && manualAddress)) && amount && (
        <View style={styles.previewCard}>
          <Text style={styles.previewTitle}>Transaction Summary</Text>
          <View style={styles.previewRow}>
            <Text style={styles.previewLabel}>To:</Text>
            <Text style={styles.previewValue}>
              {useManualAddress ? manualAddress : selectedStudentData?.name}
            </Text>
          </View>
          <View style={styles.previewRow}>
            <Text style={styles.previewLabel}>Amount:</Text>
            <Text style={styles.previewValue}>${amount} RLUSD</Text>
          </View>
          {note && (
            <View style={styles.previewRow}>
              <Text style={styles.previewLabel}>Note:</Text>
              <Text style={styles.previewValue}>{note}</Text>
            </View>
          )}
        </View>
      )}

      <TouchableOpacity
        style={[
          styles.sendButton,
          ((!selectedStudent && !useManualAddress) || (useManualAddress && !manualAddress) || !amount || sending) && styles.sendButtonDisabled,
        ]}
        onPress={handleSend}
        disabled={(!selectedStudent && !useManualAddress) || (useManualAddress && !manualAddress) || !amount || sending}
      >
        <Ionicons name="paper-plane" size={24} color="#fff" />
        <Text style={styles.sendButtonText}>
          {sending ? 'Sending...' : 'Send Money'}
        </Text>
      </TouchableOpacity>

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
    marginBottom: 24,
    marginTop: 12,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: '#007AFF',
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  toggleTextActive: {
    color: '#fff',
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  noStudentsText: {
    fontSize: 14,
    color: '#999',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  studentSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 16,
  },
  studentSelectorText: {
    fontSize: 16,
    color: '#000',
    flex: 1,
  },
  placeholderText: {
    color: '#999',
  },
  addressInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 16,
    fontSize: 14,
    fontFamily: 'monospace',
  },
  helperText: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  studentList: {
    padding: 16,
  },
  studentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    marginBottom: 12,
  },
  studentOptionSelected: {
    backgroundColor: '#E3F2FD',
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  studentOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  studentOptionText: {
    flex: 1,
  },
  studentOptionName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  studentOptionWallet: {
    fontSize: 11,
    color: '#666',
    fontFamily: 'monospace',
  },
  studentInfo: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    gap: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  studentDetails: {
    flex: 1,
  },
  studentName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  studentWallet: {
    fontSize: 11,
    color: '#999',
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  studentBalance: {
    fontSize: 14,
    color: '#34C759',
    fontWeight: '600',
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    paddingHorizontal: 16,
  },
  currencySymbol: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#666',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 32,
    fontWeight: 'bold',
    paddingVertical: 16,
    color: '#000',
  },
  presetContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  presetButton: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  presetButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  presetText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  presetTextActive: {
    color: '#fff',
  },
  noteInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 12,
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  previewCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  previewLabel: {
    fontSize: 14,
    color: '#666',
  },
  previewValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
    shadowOpacity: 0,
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
