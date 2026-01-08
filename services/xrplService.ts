import { Client, Transaction, Wallet, convertStringToHex } from 'xrpl';

const CURRENCY_CODE = 'RLUSD';
const CURRENCY_CODE_HEX = convertStringToHex('RLUSD').padEnd(40, '0'); 
const CURRENCY_ISSUER = 'rHTfLCQULr4HLGnyoDKgN8jNzLGYVhth2d'; 
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

  async createWallet(): Promise<{ wallet: Wallet; balance: number }> {
    const client = await this.connect();
    const { wallet, balance } = await client.fundWallet();
    return { wallet, balance: balance || 0 };
  }

  importWallet(seed: string): Wallet {
    return Wallet.fromSeed(seed);
  }

  async setupTrustline(wallet: Wallet): Promise<any> {
    const client = await this.connect();

    const trustSetTx: Transaction = {
      TransactionType: 'TrustSet',
      Account: wallet.address,
      LimitAmount: {
        currency: CURRENCY_CODE_HEX,
        issuer: CURRENCY_ISSUER,
        value: '1000000000'
      },
      Flags: 131072 
    };

    const prepared = await client.autofill(trustSetTx);
    const signed = wallet.sign(prepared);
    const result = await client.submitAndWait(signed.tx_blob);
    
    return result;
  }

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
        currency: CURRENCY_CODE_HEX,
        issuer: CURRENCY_ISSUER,
        value: amount
      }
    };

    const prepared = await client.autofill(paymentTx);
    const signed = senderWallet.sign(prepared);
    const result = await client.submitAndWait(signed.tx_blob);
    
    return result;
  }

  async getRLUSDBalance(walletAddress: string): Promise<string> {
    try {
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
    } catch (error: any) {
      if (error.data?.error === 'actNotFound' || error.message?.includes('Account not found')) {
        console.log('Account not yet activated, returning 0 balance');
        return '0';
      }
      console.error('Error fetching RLUSD balance:', error);
      throw error;
    }
  }

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