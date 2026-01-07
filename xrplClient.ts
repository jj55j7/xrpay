import xrpl from 'xrpl';

// XRPL Testnet endpoint
const TESTNET_URL = 'wss://s.altnet.rippletest.net:51233';

// Create and return a new XRPL client
export function getClient() {
  return new xrpl.Client(TESTNET_URL);
}

// Generate a new wallet (for demo/testing)
export function generateWallet() {
  const wallet = xrpl.Wallet.generate();
  return wallet;
}

// Import a wallet from seed
export function importWallet(seed: string) {
  return xrpl.Wallet.fromSeed(seed);
}

// Example: Send a payment (XRP or token)
export async function sendPayment({
  client,
  senderWallet,
  destination,
  amount,
  currency = 'XRP',
  issuer = undefined,
}: {
  client: xrpl.Client,
  senderWallet: xrpl.Wallet,
  destination: string,
  amount: string,
  currency?: string,
  issuer?: string,
}) {
  const payment: any = {
    TransactionType: 'Payment',
    Account: senderWallet.classicAddress,
    Amount:
      currency === 'XRP'
        ? xrpl.xrpToDrops(amount)
        : {
            currency,
            value: amount,
            issuer,
          },
    Destination: destination,
  };
  const prepared = await client.autofill(payment);
  const signed = senderWallet.sign(prepared);
  const result = await client.submitAndWait(signed.tx_blob);
  return result;
}

// Add a trustline for a token (e.g., RLUSD)
export async function addTrustline({
  client,
  wallet,
  currency,
  issuer,
  limit = '1000000',
}: {
  client: xrpl.Client,
  wallet: xrpl.Wallet,
  currency: string,
  issuer: string,
  limit?: string,
}) {
  const trustSet = {
    TransactionType: 'TrustSet',
    Account: wallet.classicAddress,
    LimitAmount: {
      currency,
      issuer,
      value: limit,
    },
  };
  const prepared = await client.autofill(trustSet);
  const signed = wallet.sign(prepared);
  const result = await client.submitAndWait(signed.tx_blob);
  return result;
}

// Get RLUSD/token balance
export async function getTokenBalance({
  client,
  address,
  currency,
  issuer,
}: {
  client: xrpl.Client,
  address: string,
  currency: string,
  issuer: string,
}) {
  const lines = await client.request({
    command: 'account_lines',
    account: address,
  });
  const line = lines.result.lines.find(
    (l: any) => l.currency === currency && l.account === issuer
  );
  return line ? line.balance : '0';
}
