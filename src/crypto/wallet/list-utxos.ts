/*
  List the UTXOs associated with the NFY address in the wallet.
*/

import CryptoUtil, { WalletInfo } from '../util';

// Get the balance of the wallet.
export async function listUtxos(walletInfo: WalletInfo, NETWORK = 'mainnet') {
  try {
    const electrumx = CryptoUtil.getElectrumX(NETWORK);

    // first get NFY balance
    const balance = await electrumx.getBalance(walletInfo.legacyAddress);
    console.log(`Balance associated with ${walletInfo.legacyAddress}: ${balance}`);

    // get utxos
    const utxos = await electrumx.getUtxos(walletInfo.legacyAddress);
    if (utxos.length === 0) throw new Error('No UTXOs found.');

    // find biggest
    const utxo = CryptoUtil.findBiggestUtxo(utxos);
    // console.log(`UTXOs associated with ${walletInfo.legacyAddress}:`);
    // console.log(JSON.stringify(utxo, null, 2));
    return utxo;
  } catch (err) {
    console.error('Error in listUtxos: ', err);
    throw err;
  }
}
