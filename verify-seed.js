const { Wallet } = require('xrpl');

const seed = process.argv[2];

if (!seed) {
  console.log('Usage: node verify-seed.js <seed>');
  process.exit(1);
}

try {
  const wallet = Wallet.fromSeed(seed);
  console.log('✅ Valid seed!');
  console.log('Address:', wallet.address);
  console.log('Public Key:', wallet.publicKey);
  console.log('Private Key:', wallet.privateKey);
  console.log('Seed:', wallet.seed);
} catch (error) {
  console.log('❌ Invalid seed');
  console.log('Error:', error.message);
  process.exit(1);
}
