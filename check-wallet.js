// Check wallet status and balances
// Usage: node check-wallet.js YOUR_WALLET_ADDRESS

const xrpl = require('xrpl');

const RLUSD_ISSUER = 'rQhMct2fv4Vc4KRjRgMrxa8xPN9ZX91LKV';

async function checkWallet(address) {
  console.log('🔗 Connecting to XRPL Testnet...');
  const client = new xrpl.Client('wss://s.altnet.rippletest.net:51233');
  await client.connect();

  try {
    console.log('📍 Checking wallet:', address);
    console.log('');

    // Check XRP balance
    try {
      const xrpBalance = await client.getXrpBalance(address);
      console.log('✅ XRP Balance:', xrpBalance, 'XRP');
    } catch (e) {
      console.log('❌ XRP Balance: Account not found or unfunded');
    }

    // Check trustlines
    console.log('\n📋 Checking trustlines...');
    try {
      const trustlines = await client.request({
        command: 'account_lines',
        account: address,
        ledger_index: 'validated',
      });

      if (trustlines.result.lines.length === 0) {
        console.log('⚠️  No trustlines found!');
        console.log('   You need to set up RLUSD trustline first.');
        console.log('   Run: node setup-parent-wallet.js YOUR_SEED');
      } else {
        console.log('✅ Found', trustlines.result.lines.length, 'trustline(s):');
        trustlines.result.lines.forEach((line) => {
          console.log(`   - ${line.currency}: ${line.balance} (Issuer: ${line.account})`);
          if (line.currency === 'RLUSD' && line.account === RLUSD_ISSUER) {
            console.log('     ✅ This is the correct RLUSD trustline!');
          }
        });
      }
    } catch (e) {
      console.log('⚠️  Could not fetch trustlines:', e.message);
    }

    console.log('\n📊 Summary:');
    console.log('   - If you see "No trustlines", run setup script first');
    console.log('   - If trustline exists but balance is 0, get RLUSD from faucet:');
    console.log('     https://test.bithomp.com/faucet/');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.disconnect();
  }
}

// Get address from command line
const address = process.argv[2];

if (!address) {
  console.error('❌ Please provide wallet address');
  console.log('Usage: node check-wallet.js rXXXXXXXXXXXXXXXXXXX');
  process.exit(1);
}

checkWallet(address);
