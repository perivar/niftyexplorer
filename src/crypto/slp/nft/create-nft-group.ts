/*
  Create a new SLP NFT Group token. Requires a wallet created with the create-wallet
  example. Also requires that wallet to have a small NFY balance.
*/

import * as bitcoin from 'bitcoinjs-lib';
import { Transaction } from 'bitcoinjs-lib';
import CryptoUtil, { NFTGroupOpReturnConfig, WalletInfo } from '../../util';

// Example SLP NFT config object for the Group
// const configObjGroup: NFTGroupOpReturnConfig = {
//   name: 'NFT Test Token',
//   ticker: 'NFTY',
//   documentUrl: 'https://www.niftycoin.org',
//   mintBatonVout: 2, // the minting baton is always on vout 2
//   initialQty: 1
// };
export async function createNFTGroup(
  walletInfo: WalletInfo,
  tokenReceiverAddress: string,
  batonReceiverAddress: string,
  configObj: NFTGroupOpReturnConfig,
  NETWORK = 'mainnet'
) {
  try {
    const { mnemonic } = walletInfo;

    if (tokenReceiverAddress === '') tokenReceiverAddress = walletInfo.legacyAddress;
    // if the batonReceiverAddress is null or undefined, dont create baton

    // network
    const electrumx = CryptoUtil.getElectrumX(NETWORK);
    const { network } = electrumx;
    const slp = CryptoUtil.getSLP(NETWORK);

    // Generate an EC key pair for signing the transaction.
    const changeKeyPair = await CryptoUtil.changeAddressFromMnemonic(mnemonic, network);

    // get the legacy address
    const legacyAddress = CryptoUtil.toLegacyAddress(changeKeyPair, network);

    // Get a UTXO to pay for the transaction.
    const utxos = await electrumx.getUtxos(legacyAddress);
    // console.log(`utxos: ${JSON.stringify(utxos, null, 2)}`)

    if (utxos.length === 0) {
      throw new Error('No UTXOs to pay for transaction! Exiting.');
    }

    // Get the biggest UTXO to pay for the transaction.
    const utxo = CryptoUtil.findBiggestUtxo(utxos);
    // console.log(`utxo: ${JSON.stringify(utxo, null, 2)}`)

    // instance of transaction builder
    const transactionBuilder = new bitcoin.TransactionBuilder(network);

    const originalAmount = utxo.value;
    const vout = utxo.tx_pos;
    const txid = utxo.tx_hash;

    // add input with txid and index of vout
    transactionBuilder.addInput(txid, vout);

    // estimate fee. paying X niftoshis/byte
    const txFee = CryptoUtil.estimateFee({ P2PKH: 1 }, { P2PKH: batonReceiverAddress ? 4 : 3 });

    // amount to send back to the sending address.
    // Subtract a dust transactions for tokens.
    let remainder = originalAmount - txFee - 546;

    // subtract another dust transaction if required (for minting baton)
    if (batonReceiverAddress) {
      remainder = remainder - 546;
    }

    // Generate the OP_RETURN entry for an SLP GENESIS transaction.
    const script = slp.NFT1.newNFTGroupOpReturn(configObj);

    // OP_RETURN needs to be the first output in the transaction.
    transactionBuilder.addOutput(script, 0);

    // Send dust transaction representing the tokens.
    transactionBuilder.addOutput(tokenReceiverAddress, 546);

    // Send dust transaction representing minting baton.
    if (batonReceiverAddress) {
      transactionBuilder.addOutput(batonReceiverAddress, 546);
    }

    // add output to send NFY remainder of UTXO.
    transactionBuilder.addOutput(legacyAddress, remainder);

    // Sign the transaction with the changeKeyPair HD node.
    transactionBuilder.sign(0, changeKeyPair, undefined, Transaction.SIGHASH_ALL, originalAmount);

    // build tx
    const tx = transactionBuilder.build();
    // output rawhex
    const hex = tx.toHex();
    // console.log(`TX hex: ${hex}`)
    // console.log(` `)

    // Broadcast transation to the network
    const txidStr = await electrumx.broadcast(hex);
    console.log('Check the status of your transaction on this block explorer:');
    CryptoUtil.transactionStatus(txidStr, NETWORK);
    return txidStr;
  } catch (err) {
    console.error('Error in createToken: ', err);
    console.log(`Error message: ${err.message}`);
    throw err;
  }
}
