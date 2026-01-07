// Check account settings and flags
// Usage: node check-account-settings.js ADDRESS

const xrpl = require('xrpl');

async function checkAccount(address) {
  console.log('🔗 Connecting to XRPL Testnet...');
  const client = new xrpl.Client('wss://s.altnet.rippletest.net:51233');
  await client.connect();

  try {
    console.log('📍 Checking account:', address);
    
    const accountInfo = await client.request({
      command: 'account_info',
      account: address,
      ledger_index: 'validated'
    });

    const flags = accountInfo.result.account_data.Flags;
    
    console.log('\n📋 Account Flags (raw):', flags);
    console.log('Flags breakdown:');
    
    // Check specific flags
    const asfDefaultRipple = 0x00800000; // 8388608
    const hasDefaultRipple = (flags & asfDefaultRipple) !== 0;
    
    console.log('  - DefaultRipple:', hasDefaultRipple ? '✅ ENABLED' : '❌ DISABLED');
    console.log('  - RequireAuth:', (flags & 0x00040000) ? '✅ Yes' : '❌ No');
    console.log('  - DisallowXRP:', (flags & 0x00080000) ? '✅ Yes' : '❌ No');
    
    console.log('\n📊 Full Account Data:');
    console.log(JSON.stringify(accountInfo.result.account_data, null, 2));

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.disconnect();
  }
}

const address = process.argv[2];

if (!address) {
  console.error('❌ Please provide account address');
  console.log('Usage: node check-account-settings.js ADDRESS');
  process.exit(1);
}

checkAccount(address);
