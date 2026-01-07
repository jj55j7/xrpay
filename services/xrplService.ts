import { Client, Transaction, Wallet, convertStringToHex } from 'xrpl';

// Test RLUSD details - Custom token for hackathon demo
const CURRENCY_CODE = 'RLUSD';
const CURRENCY_CODE_HEX = convertStringToHex('RLUSD').padEnd(40, '0'); // Hex format for non-standard codes
const CURRENCY_ISSUER = 'rHTfLCQULr4HLGnyoDKgN8jNzLGYVhth2d'; // Your custom RLUSD issuer
const XRPL_TESTNET_URL = 'wss://s.altnet.rippletest.net:51233';

class XRPLService {
  private client: Client | null = null;

  async connect(): Promise<Client> {
    if (!this.client || !this.client.isConnected()) {
      this.client = new Client(XRPL_TESTNET_URL);
      await this.client.connect();
      console.log('Connected to XRPL Testnet');
    }
    return this.client;
  }

  async disconnect(): Promise<void> {
    if (this.client && this.client.isConnected()) {
      await this.client.disconnect();
      console.log('Disconnected from XRPL Testnet');
    }
  }

  // Create a new wallet (for new users)
  async createWallet(): Promise<{ wallet: Wallet; balance: number }> {
    const client = await this.connect();
    const { wallet, balance } = await client.fundWallet();
    return { wallet, balance: balance || 0 };
  }

  // Import wallet from seed
  importWallet(seed: string): Wallet {
    return Wallet.fromSeed(seed);
  }

  // Set up USD trustline
  async setupTrustline(wallet: Wallet): Promise<any> {
    const client = await this.connect();

    const trustSetTx: Transaction = {
      TransactionType: 'TrustSet',
      Account: wallet.address,
      LimitAmount: {
        currency: CURRENCY_CODE_HEX, // Use hex format for non-standard codes
        issuer: CURRENCY_ISSUER,
        value: '1000000000' // Large limit
      },
      Flags: 131072 // tfSetNoRipple
    };

    const prepared = await client.autofill(trustSetTx);
    const signed = wallet.sign(prepared);
    const result = await client.submitAndWait(signed.tx_blob);
    
    return result;
  }

  // Send USD payment
  async sendRLUSDPayment(
    senderWallet: Wallet,
    recipientAddress: string,
    amount: string
  ): Promise<any> {
    const client = await this.connect();

    const paymentTx: Transaction = {
      TransactionType: 'Payment',
      Account: senderWallet.address,
      Destination: recipientAddress,
      Amount: {
        currency: CURRENCY_CODE_HEX, // Use hex format for non-standard codes
        issuer: CURRENCY_ISSUER,
        value: amount
      }
    };

    const prepared = await client.autofill(paymentTx);
    const signed = senderWallet.sign(prepared);
    const result = await client.submitAndWait(signed.tx_blob);
    
    return result;
  }

  // Get USD balance
  async getRLUSDBalance(walletAddress: string): Promise<string> {
    const client = await this.connect();

    const response = await client.request({
      command: 'account_lines',
      account: walletAddress,
      ledger_index: 'validated'
    });

    const usdLine = response.result.lines.find(
      (line: any) => line.account === CURRENCY_ISSUER
    );

    return usdLine ? usdLine.balance : '0';
  }

  // Get transaction details
  async getTransaction(hash: string): Promise<any> {
    const client = await this.connect();

    const response = await client.request({
      command: 'tx',
      transaction: hash,
      binary: false
    });

    return response.result;
  }
}

export const xrplService = new XRPLService();