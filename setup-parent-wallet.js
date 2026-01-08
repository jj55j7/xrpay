const xrpl = require('xrpl');

async function setupWallet(seedFromArgs, rlusdIssuer) {
  console.log('🔗 Connecting to XRPL Testnet...');
  const client = new xrpl.Client('wss://s.altnet.rippletest.net:51233');
  await client.connect();

  try {
    const wallet = xrpl.Wallet.fromSeed(seedFromArgs);
    console.log('✅ Loaded wallet:', wallet.address);

    let balance = '0';
    let accountExists = false;
    
    try {
      balance = await client.getXrpBalance(wallet.address);
      accountExists = true;
      console.log('💰 Current XRP Balance:', balance);
    } catch (error) {
      if (error.data?.error === 'actNotFound') {
        console.log('ℹ️ Account not yet activated on ledger');
        accountExists = false;
      } else {
        throw error;
      }
    }

    if (!accountExists || parseFloat(balance) < 10) {
      console.log('💸 Funding wallet from testnet faucet...');
      const fundResult = await client.fundWallet(wallet);
      console.log('✅ Wallet funded!');
      console.log('   Balance:', fundResult.balance);
      balance = fundResult.balance;
    }

    console.log('🔗 Setting up RLUSD trustline to issuer:', rlusdIssuer);
    
    const currencyHex = Buffer.from('RLUSD', 'utf-8').toString('hex').toUpperCase().padEnd(40, '0');
    console.log('   Currency hex:', currencyHex);
    
    const trustlineResult = await client.submitAndWait(
      {
        TransactionType: 'TrustSet',
        Account: wallet.address,
        LimitAmount: {
          currency: currencyHex,
          issuer: rlusdIssuer,
          value: '999999999',
        },
      },
      { wallet }
    );

    if (trustlineResult.result.meta.TransactionResult === 'tesSUCCESS') {
      console.log('✅ RLUSD trustline created!');
      console.log('Transaction hash:', trustlineResult.result.hash);
    } else {
      console.log('❌ Trustline failed:', trustlineResult.result.meta.TransactionResult);
    }

    console.log('\n📊 Checking balances...');
    const balances = await client.request({
      command: 'account_lines',
      account: wallet.address,
      ledger_index: 'validated',
    });

    const rlusdLine = balances.result.lines.find(
      (line) => line.account === rlusdIssuer
    );

    if (rlusdLine) {
      console.log('✅ RLUSD Balance:', rlusdLine.balance);
    } else {
      console.log('⚠️  RLUSD trustline ready (balance: 0)');
    }

    console.log('\n✅ Wallet setup complete!');
    console.log('🎯 Ready to receive RLUSD from issuer!');
    console.log('\n📝 Next step:');
    console.log(`   node issue-rlusd.js ISSUER_SEED ${wallet.address} 1000`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.disconnect();
  }
}

const seed = process.argv[2];
const issuer = process.argv[3];

if (!seed || !issuer) {
  console.error('❌ Please provide wallet seed AND issuer address');
  console.log('Usage: node setup-parent-wallet.js WALLET_SEED RLUSD_ISSUER_ADDRESS');
  console.log('Example: node setup-parent-wallet.js sEdSKaCy... rIssuerAddr...');
  process.exit(1);
}

setupWallet(seed, issuer);

