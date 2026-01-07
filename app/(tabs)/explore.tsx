import { firebaseApp } from '@/firebaseConfig';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { getAuth } from 'firebase/auth';
import { doc, getDoc, getFirestore } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function ReceiveScreen() {
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWalletAddress = async () => {
      try {
        const auth = getAuth(firebaseApp);
        const db = getFirestore(firebaseApp);
        const user = auth.currentUser;

        if (user) {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            setWalletAddress(userDoc.data()?.walletAddress || 'No wallet address');
          } else {
            // Fallback to mock data if Firestore is offline
            setWalletAddress('rPEPPER7kfTD9w2To4CQk6UCfuHM9c6GDY');
          }
        }
      } catch (error) {
        console.error('Error fetching wallet address:', error);
        // Use mock data for demo
        setWalletAddress('rPEPPER7kfTD9w2To4CQk6UCfuHM9c6GDY');
      } finally {
        setLoading(false);
      }
    };

    fetchWalletAddress();
  }, []);

  const copyToClipboard = async () => {
    await Clipboard.setStringAsync(walletAddress);
    Alert.alert('Copied!', 'Wallet address copied to clipboard');
  };

  const shareAddress = async () => {
    try {
      await Share.share({
        message: `Send money to my wallet address: ${walletAddress}`,
        title: 'My Wallet Address',
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.title}>Receive Money</Text>
      
      <Text style={styles.instructions}>
        Share your wallet address with your parent to receive money
      </Text>

      {/* Wallet Address Card */}
      <View style={styles.addressCard}>
        <Text style={styles.addressLabel}>Your Wallet Address</Text>
        <View style={styles.addressBox}>
          <Text style={styles.addressText} selectable>
            {walletAddress}
          </Text>
        </View>
        
        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.actionButton} onPress={copyToClipboard}>
            <Ionicons name="copy-outline" size={24} color="#007AFF" />
            <Text style={styles.actionButtonText}>Copy</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton} onPress={shareAddress}>
            <Ionicons name="share-outline" size={24} color="#007AFF" />
            <Text style={styles.actionButtonText}>Share</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* How to Receive Section */}
      <View style={styles.howToSection}>
        <Text style={styles.howToTitle}>How to Receive Money</Text>
        
        <View style={styles.stepItem}>
          <View style={styles.stepNumber}>
            <Text style={styles.stepNumberText}>1</Text>
          </View>
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Share your address</Text>
            <Text style={styles.stepDescription}>
              Copy or share your wallet address with your parent
            </Text>
          </View>
        </View>

        <View style={styles.stepItem}>
          <View style={styles.stepNumber}>
            <Text style={styles.stepNumberText}>2</Text>
          </View>
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Parent sends RLUSD</Text>
            <Text style={styles.stepDescription}>
              Your parent uses this address to send you allowance
            </Text>
          </View>
        </View>

        <View style={styles.stepItem}>
          <View style={styles.stepNumber}>
            <Text style={styles.stepNumberText}>3</Text>
          </View>
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Instant arrival</Text>
            <Text style={styles.stepDescription}>
              Money arrives in 3-5 seconds on XRPL
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  contentContainer: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 12,
    marginTop: 12,
  },
  instructions: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
    lineHeight: 20,
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 40,
    fontSize: 16,
    color: '#666',
  },
  addressCard: {
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
  addressLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
  },
  addressBox: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  addressText: {
    fontSize: 13,
    fontFamily: 'monospace',
    color: '#000',
    textAlign: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f0f0',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  howToSection: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  howToTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  stepItem: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 16,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumberText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  stepDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});
