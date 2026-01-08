const xrpl = require('xrpl');

async function createRLUSDIssuer() {
  console.log('🔗 Connecting to XRPL Testnet...');
  const client = new xrpl.Client('wss://s.altnet.rippletest.net:51233');
  await client.connect();

  try {
    console.log('🎲 Creating RLUSD Issuer Account...\n');
    
    const { wallet: issuerWallet, balance } = await client.fundWallet();
    
    console.log('✅ RLUSD Issuer Account Created!');
    console.log('   Address:', issuerWallet.address);
    console.log('   Seed:', issuerWallet.seed);
    console.log('   XRP Balance:', balance);
    
    console.log('\n📋 SAVE THESE DETAILS:');
    console.log('   RLUSD_ISSUER =', `'${issuerWallet.address}'`);
    console.log('   ISSUER_SEED =', `'${issuerWallet.seed}'`);
    
    console.log('\n✅ Setup complete!');
    console.log('📝 Next steps:');
    console.log('   1. Update services/xrplService.ts with the RLUSD_ISSUER address above');
    console.log('   2. Run setup-parent-wallet.js to create trustline');
    console.log('   3. Use issue-rlusd.js to send RLUSD tokens to your parent wallet');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.disconnect();
  }
}

createRLUSDIssuer();
