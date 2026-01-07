// Issue RLUSD tokens from issuer to a recipient
// Usage: node issue-rlusd.js ISSUER_SEED RECIPIENT_ADDRESS AMOUNT

const xrpl = require('xrpl');

async function issueRLUSD(issuerSeed, recipientAddress, amount) {
  console.log('🔗 Connecting to XRPL Testnet...');
  const client = new xrpl.Client('wss://s.altnet.rippletest.net:51233');
  await client.connect();

  try {
    // Load issuer wallet
    const issuerWallet = xrpl.Wallet.fromSeed(issuerSeed);
    console.log('✅ Issuer loaded:', issuerWallet.address);
    console.log('📤 Issuing', amount, 'RLUSD to:', recipientAddress);

    // Send RLUSD payment from issuer to recipient
    // Convert "RLUSD" to hex format
    const currencyHex = Buffer.from('RLUSD', 'utf-8').toString('hex').toUpperCase().padEnd(40, '0');
    
    const payment = {
      TransactionType: 'Payment',
      Account: issuerWallet.address,
      Destination: recipientAddress,
      Amount: {
        currency: currencyHex,
        issuer: issuerWallet.address,
        value: amount
      }
    };

    console.log('\n💸 Submitting payment transaction...');
    const prepared = await client.autofill(payment);
    const signed = issuerWallet.sign(prepared);
    const result = await client.submitAndWait(signed.tx_blob);

    if (result.result.meta.TransactionResult === 'tesSUCCESS') {
      console.log('✅ RLUSD issued successfully!');
      console.log('Transaction hash:', result.result.hash);
      console.log(`\n🎉 ${recipientAddress} now has ${amount} RLUSD!`);
    } else {
      console.log('❌ Transaction failed:', result.result.meta.TransactionResult);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    
    if (error.message.includes('tecNO_LINE')) {
      console.log('\n⚠️  ERROR: Recipient must create trustline first!');
      console.log('   Run: node setup-parent-wallet.js RECIPIENT_SEED');
      console.log('   Or: node setup-student-wallet.js RECIPIENT_SEED');
    }
  } finally {
    await client.disconnect();
  }
}

// Get arguments
const issuerSeed = process.argv[2];
const recipientAddress = process.argv[3];
const amount = process.argv[4] || '1000';

if (!issuerSeed || !recipientAddress) {
  console.error('❌ Missing arguments');
  console.log('Usage: node issue-rlusd.js ISSUER_SEED RECIPIENT_ADDRESS AMOUNT');
  console.log('Example: node issue-rlusd.js sEdXXX... rPt6YFj... 1000');
  process.exit(1);
}

issueRLUSD(issuerSeed, recipientAddress, amount);
