// Clear NoRipple flag from issuer's side of trustlines
// Usage: node clear-no-ripple.js ISSUER_SEED HOLDER_ADDRESS

const xrpl = require('xrpl');

async function clearNoRipple(issuerSeed, holderAddress) {
  console.log('🔗 Connecting to XRPL Testnet...');
  const client = new xrpl.Client('wss://s.altnet.rippletest.net:51233');
  await client.connect();

  try {
    const issuerWallet = xrpl.Wallet.fromSeed(issuerSeed);
    console.log('✅ Issuer wallet loaded:', issuerWallet.address);
    console.log('🎯 Clearing NoRipple for holder:', holderAddress);

    // Convert RLUSD to hex
    const currencyHex = Buffer.from('RLUSD', 'utf-8').toString('hex').toUpperCase().padEnd(40, '0');

    // Set trustline from issuer's side with ClearNoRipple flag
    const trustSetTx = {
      TransactionType: 'TrustSet',
      Account: issuerWallet.address,
      LimitAmount: {
        currency: currencyHex,
        issuer: holderAddress,
        value: '0' // Issuer sets 0 limit to the holder
      },
      Flags: 262144 // tfClearNoRipple
    };

    console.log('📤 Submitting TrustSet with ClearNoRipple flag...');
    const prepared = await client.autofill(trustSetTx);
    const signed = issuerWallet.sign(prepared);
    const result = await client.submitAndWait(signed.tx_blob);

    console.log('\n📋 Transaction Result:');
    console.log('Status:', result.result.meta.TransactionResult);
    console.log('Hash:', result.result.hash);

    if (result.result.meta.TransactionResult === 'tesSUCCESS') {
      console.log('\n✅ NoRipple cleared successfully!');
      console.log('🎉 Rippling should now work for this trustline!');
    } else {
      console.log('\n❌ Failed:', result.result.meta.TransactionResult);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.data) {
      console.log('Error details:', error.data);
    }
  } finally {
    await client.disconnect();
  }
}

const issuerSeed = process.argv[2];
const holderAddress = process.argv[3];

if (!issuerSeed || !holderAddress) {
  console.error('❌ Please provide issuer seed and holder address');
  console.log('Usage: node clear-no-ripple.js ISSUER_SEED HOLDER_ADDRESS');
  process.exit(1);
}

clearNoRipple(issuerSeed, holderAddress);
