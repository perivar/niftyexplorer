/*
  Check the balance of the root address of an HD node wallet generated
  with the create-wallet example.
*/

import CryptoUtil, { WalletInfo } from '../util';

// Get the balance of the wallet.
export async function getBalance(walletInfo: WalletInfo, NETWORK = 'mainnet') {
  try {
    // network
    const electrumx = CryptoUtil.getElectrumX(NETWORK);

    // first get NFY balance
    const balance = await electrumx.getBalance(walletInfo.legacyAddress);
    console.log('NFY Balance information:');
    console.log(JSON.stringify(balance, null, 2));
    return balance;
  } catch (err) {
    console.error('Error in getBalance: ', err);
    throw err;
  }
}
