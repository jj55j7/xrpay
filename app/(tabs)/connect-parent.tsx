import { firebaseApp } from '@/firebaseConfig';
import { getAuth } from 'firebase/auth';
import { addDoc, collection, getDocs, getFirestore, query, where } from 'firebase/firestore';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

export default function ConnectParentScreen() {
  const [parentEmail, setParentEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const sendConnectionRequest = async () => {
    if (!parentEmail.trim()) {
      Alert.alert('Error', 'Please enter parent email');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const auth = getAuth(firebaseApp);
      const db = getFirestore(firebaseApp);
      const studentId = auth.currentUser?.uid;

      if (!studentId) {
        Alert.alert('Error', 'You must be logged in');
        return;
      }

      // 1. Check if parent exists
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', parentEmail.trim().toLowerCase()));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        Alert.alert('Error', 'No parent found with this email');
        return;
      }

      const parentDoc = querySnapshot.docs[0];
      const parentData = parentDoc.data();

      // 2. Check if parent has correct role
      if (parentData.role !== 'parent') {
        Alert.alert('Error', 'This user is not registered as a parent');
        return;
      }

      // 3. Check if connection already exists
      const existingConnections = await getDocs(
        query(collection(db, 'connection_requests'), 
          where('studentId', '==', studentId),
          where('parentId', '==', parentDoc.id),
          where('status', 'in', ['pending', 'approved'])
        )
      );

      if (!existingConnections.empty) {
        Alert.alert('Info', 'Connection request already sent');
        return;
      }

      // 4. Create connection request
      await addDoc(collection(db, 'connection_requests'), {
        studentId,
        parentId: parentDoc.id,
        studentEmail: auth.currentUser?.email,
        parentEmail: parentEmail.trim().toLowerCase(),
        status: 'pending', // pending, approved, rejected
        createdAt: new Date(),
        studentName: auth.currentUser?.displayName || 'Student'
      });

      setMessage('✅ Connection request sent! Parent needs to approve.');
      setParentEmail('');
      
      Alert.alert('Success', 'Connection request sent! Parent will receive notification.');

    } catch (error) {
      console.error('Error sending request:', error);
      Alert.alert('Error', 'Failed to send connection request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Connect with Parent</Text>
      
      <View style={styles.benefitsBox}>
        <Text style={styles.benefitsTitle}>✨ Why Connect?</Text>
        <Text style={styles.benefitsText}>
          • Parents can send money without typing your wallet address each time{`\n`}
          • Easier and faster transactions{`\n`}
          • View transaction history together
        </Text>
      </View>
      
      <Text style={styles.description}>
        Enter your parent's email address to send a connection request.
        They'll approve it in their app, and you'll be linked.
      </Text>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Parent Email</Text>
        <TextInput
          style={styles.input}
          placeholder="parent@example.com"
          value={parentEmail}
          onChangeText={setParentEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          editable={!loading}
        />
      </View>

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={sendConnectionRequest}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Send Connection Request</Text>
        )}
      </TouchableOpacity>

      {message ? (
        <View style={styles.messageContainer}>
          <Text style={styles.messageText}>{message}</Text>
        </View>
      ) : null}

      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>👉 Don't want to connect?</Text>
        <Text style={styles.infoText}>
          No problem! Go to the Wallet tab and tap "Receive Money" to get your wallet address. 
          Share it with your parents for manual transfers.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 12,
    marginTop: 12,
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
    lineHeight: 20,
  },
  benefitsBox: {
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  benefitsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 8,
  },
  benefitsText: {
    fontSize: 13,
    color: '#1B5E20',
    lineHeight: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  messageContainer: {
    backgroundColor: '#e8f5e9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  messageText: {
    color: '#34C759',
    fontSize: 14,
    textAlign: 'center',
  },
  infoBox: {
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 16,
    marginTop: 24,
    borderWidth: 1,
    borderColor: '#90CAF9',
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1976D2',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#0D47A1',
    lineHeight: 20,
  },
});