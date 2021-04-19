/*
  Convert between address formats
*/

import CryptoUtil, { WalletInfo } from '../util';

export async function conversion(walletInfo: WalletInfo, NETWORK = 'mainnet') {
  try {
    const { mnemonic } = walletInfo;

    // network
    const network = CryptoUtil.getNetwork(NETWORK);

    // Generate an EC key pair for signing the transaction.
    const changeKeyPair = await CryptoUtil.changeAddrFromMnemonic(mnemonic, network);

    // get the legacy address
    const segwitAddress = CryptoUtil.toSegWitAddress(changeKeyPair, network);
    const legacyAddress = CryptoUtil.toLegacyAddress(changeKeyPair, network);

    console.log(`SegWit Address: ${segwitAddress}:`);
    console.log(`Legacy Address: ${legacyAddress}:`);
  } catch (err) {
    console.error('Error in conversion: ', err);
    console.log(`Error message: ${err.message}`);
    throw err;
  }
}
