// Check transaction details
// Usage: node check-transaction.js TX_HASH

const xrpl = require('xrpl');

async function checkTransaction(txHash) {
  console.log('🔗 Connecting to XRPL Testnet...');
  const client = new xrpl.Client('wss://s.altnet.rippletest.net:51233');
  await client.connect();

  try {
    console.log('🔍 Looking up transaction:', txHash);
    
    const response = await client.request({
      command: 'tx',
      transaction: txHash,
      binary: false
    });

    console.log('\n📋 Transaction Details:');
    console.log('Status:', response.result.meta.TransactionResult);
    console.log('Type:', response.result.TransactionType);
    console.log('From:', response.result.Account);
    console.log('To:', response.result.Destination);
    
    if (response.result.Amount) {
      if (typeof response.result.Amount === 'string') {
        console.log('Amount:', xrpl.dropsToXrp(response.result.Amount), 'XRP');
      } else {
        console.log('Amount:', response.result.Amount.value, response.result.Amount.currency);
        console.log('Issuer:', response.result.Amount.issuer);
      }
    }
    
    console.log('\n📊 Full Result:');
    console.log(JSON.stringify(response.result, null, 2));

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.data) {
      console.log('Error details:', error.data);
    }
  } finally {
    await client.disconnect();
  }
}

const txHash = process.argv[2];

if (!txHash) {
  console.error('❌ Please provide transaction hash');
  console.log('Usage: node check-transaction.js TX_HASH');
  process.exit(1);
}

checkTransaction(txHash);
