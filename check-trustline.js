const xrpl = require('xrpl');

async function checkTrustline(walletAddress, issuerAddress) {
  console.log('🔗 Connecting to XRPL Testnet...');
  const client = new xrpl.Client('wss://s.altnet.rippletest.net:51233');
  await client.connect();

  try {
    console.log('📍 Checking trustlines for:', walletAddress);
    console.log('🏦 To issuer:', issuerAddress);
    
    const response = await client.request({
      command: 'account_lines',
      account: walletAddress,
      ledger_index: 'validated'
    });

    const trustline = response.result.lines.find(line => line.account === issuerAddress);
    
    if (trustline) {
      console.log('\n✅ Trustline found!');
      console.log('Balance:', trustline.balance);
      console.log('Limit:', trustline.limit);
      console.log('Flags:', trustline.flags);
      console.log('NoRipple:', (trustline.no_ripple === true) ? '🚫 SET (blocks rippling)' : '✅ Not set (allows rippling)');
      console.log('NoRipple Peer:', (trustline.no_ripple_peer === true) ? '🚫 SET' : '✅ Not set');
      console.log('\nFull trustline data:');
      console.log(JSON.stringify(trustline, null, 2));
    } else {
      console.log('❌ No trustline found to that issuer');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.disconnect();
  }
}

const walletAddress = process.argv[2];
const issuerAddress = process.argv[3];

if (!walletAddress || !issuerAddress) {
  console.error('❌ Please provide wallet address and issuer address');
  console.log('Usage: node check-trustline.js WALLET_ADDRESS ISSUER_ADDRESS');
  process.exit(1);
}

checkTrustline(walletAddress, issuerAddress);
