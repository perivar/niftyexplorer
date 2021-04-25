/*
  Consolidate all UTXOs in an address into a single UTXO
*/

import * as bitcoin from 'bitcoinjs-lib';
import { Transaction } from 'bitcoinjs-lib';
import CryptoUtil, { WalletInfo } from '../util';

export async function consolidateUtxos(walletInfo: WalletInfo, NETWORK = 'mainnet') {
  try {
    const sendAddress = walletInfo.legacyAddress;
    const { mnemonic } = walletInfo;

    // network
    const electrumx = CryptoUtil.getElectrumX(NETWORK);
    const { network } = electrumx;

    // instance of transaction builder
    const transactionBuilder = new bitcoin.TransactionBuilder(network);

    let sendAmount = 0;
    const inputs = [];

    const utxos = await electrumx.getUtxos(sendAddress);

    if (utxos.length === 0) throw new Error('No UTXOs found.');

    // Loop through each UTXO assigned to this address.
    for (let i = 0; i < utxos.length; i++) {
      const thisUtxo = utxos[i];

      inputs.push(thisUtxo);

      sendAmount += thisUtxo.value;

      // ..Add the utxo as an input to the transaction.
      transactionBuilder.addInput(thisUtxo.tx_hash, thisUtxo.tx_pos);
    }

    // estimate fee. paying X niftoshis/byte
    const txFee = CryptoUtil.estimateFee({ P2PKH: utxos.length }, { P2PKH: 1 });

    // Exit if the transaction costs too much to send.
    if (sendAmount - txFee < 0) {
      console.log("Transaction fee costs more combined UTXOs. Can't send transaction.");
      return;
    }

    // add output w/ address and amount to send
    transactionBuilder.addOutput(sendAddress, sendAmount - txFee);

    // Generate a change address from a Mnemonic of a private key.
    const changeKeyPair = await CryptoUtil.externalAddressFromMnemonic(mnemonic, network);

    // Sign the transaction with the changeKeyPair HD node.
    inputs.forEach((input, index) => {
      transactionBuilder.sign(index, changeKeyPair, undefined, Transaction.SIGHASH_ALL, input.value);
    });

    // build tx
    const tx = transactionBuilder.build();
    // output rawhex
    const hex = tx.toHex();
    // console.log(`TX hex: ${hex}`)

    // Broadcast transation to the network
    const txid = await electrumx.broadcast(hex);
    console.log(`Transaction ID: ${txid}`);
    console.log('Check the status of your transaction on this block explorer:');
    CryptoUtil.transactionStatus(txid, NETWORK);
    return txid;
  } catch (err) {
    console.log('error: ', err);
    throw err;
  }
}
