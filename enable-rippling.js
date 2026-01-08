const xrpl = require('xrpl');

async function enableRippling(issuerSeed) {
  console.log('🔗 Connecting to XRPL Testnet...');
  const client = new xrpl.Client('wss://s.altnet.rippletest.net:51233');
  await client.connect();

  try {
    const issuerWallet = xrpl.Wallet.fromSeed(issuerSeed);
    console.log('✅ Issuer wallet loaded:', issuerWallet.address);

    console.log('⚙️  Setting DefaultRipple flag...');
    
    const accountSetTx = {
      TransactionType: 'AccountSet',
      Account: issuerWallet.address,
      SetFlag: 8
    };

    const prepared = await client.autofill(accountSetTx);
    const signed = issuerWallet.sign(prepared);
    const result = await client.submitAndWait(signed.tx_blob);

    console.log('\n📋 Transaction Result:');
    console.log('Status:', result.result.meta.TransactionResult);
    console.log('Hash:', result.result.hash);

    if (result.result.meta.TransactionResult === 'tesSUCCESS') {
      console.log('\n✅ DefaultRipple enabled successfully!');
      console.log('🎉 RLUSD can now flow between holders!');
    } else {
      console.log('\n❌ Failed to enable rippling:', result.result.meta.TransactionResult);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.disconnect();
  }
}

const issuerSeed = process.argv[2];

if (!issuerSeed) {
  console.error('❌ Please provide issuer seed');
  console.log('Usage: node enable-rippling.js ISSUER_SEED');
  process.exit(1);
}

enableRippling(issuerSeed);
