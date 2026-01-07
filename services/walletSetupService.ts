//check if this automated code works if not delete 
import xrpl from 'xrpl';

const TESTNET_URL = 'wss://s.altnet.rippletest.net:51233';
const RLUSD_ISSUER = 'rHTfLCQULr4HLGnyoDKgN8jNzLGYVhth2d';
const CURRENCY_CODE_HEX = '524C555344000000000000000000000000000000'; // RLUSD in hex

/**
 * Setup a new wallet on XRPL by:
 * 1. Funding it from the testnet faucet
 * 2. Creating a trustline to the RLUSD issuer
 */
export async function setupWalletOnXRPL(walletSeed: string): Promise<{
  success: boolean;
  address: string;
  error?: string;
}> {
  const client = new xrpl.Client(TESTNET_URL);

  try {
    console.log('[Wallet Setup] Connecting to XRPL Testnet...');
    await client.connect();

    // Import the wallet using the seed
    const wallet = xrpl.Wallet.fromSeed(walletSeed);
    console.log('[Wallet Setup] Wallet address:', wallet.address);

    // Fund the wallet from testnet faucet
    console.log('[Wallet Setup] Funding wallet from faucet...');
    const fundResult = await client.fundWallet(wallet);
    console.log('[Wallet Setup] Funding successful. Balance:', fundResult.balance);

    // Create RLUSD trustline
    console.log('[Wallet Setup] Creating RLUSD trustline...');
    const trustlineResult = await client.submitAndWait(
      {
        TransactionType: 'TrustSet',
        Account: wallet.address,
        LimitAmount: {
          currency: CURRENCY_CODE_HEX,
          issuer: RLUSD_ISSUER,
          value: '999999999',
        },
      },
      { wallet }
    );

    const transactionResult = (trustlineResult.result.meta as any)?.TransactionResult;
    if (transactionResult === 'tesSUCCESS') {
      console.log('[Wallet Setup] Trustline created successfully');
      return {
        success: true,
        address: wallet.address,
      };
    } else {
      console.error('[Wallet Setup] Trustline creation failed:', transactionResult);
      return {
        success: false,
        address: wallet.address,
        error: 'Failed to create RLUSD trustline',
      };
    }
  } catch (error: any) {
    console.error('[Wallet Setup] Error:', error.message);
    return {
      success: false,
      address: '',
      error: error.message,
    };
  } finally {
    await client.disconnect();
  }
}