/*
  Consolidate all UTXOs of size 546 sats or smaller into
  a single UTXO.
*/

import * as bitcoin from 'bitcoinjs-lib';
import { Transaction } from 'bitcoinjs-lib';
import CryptoUtil, { WalletInfo } from '../util';

export async function consolidateDust(walletInfo: WalletInfo, NETWORK = 'mainnet') {
  try {
    const sendAddress = walletInfo.legacyAddress;
    const { mnemonic } = walletInfo;

    // network
    const electrumx = CryptoUtil.getElectrumX(NETWORK);
    const { network } = electrumx;

    // instance of transaction builder
    const transactionBuilder = new bitcoin.TransactionBuilder(network);

    const dust = 546;
    let sendAmount = 0;
    const inputs = [];

    const utxos = await electrumx.getUtxos(sendAddress);

    if (utxos.length === 0) throw new Error('No UTXOs found.');

    // Loop through each UTXO assigned to this address.
    for (let i = 0; i < utxos.length; i++) {
      const thisUtxo = utxos[i];

      // If the UTXO is dust...
      if (thisUtxo.value <= dust) {
        inputs.push(thisUtxo);

        sendAmount += thisUtxo.value;

        // ..Add the utxo as an input to the transaction.
        transactionBuilder.addInput(thisUtxo.tx_hash, thisUtxo.tx_pos);
      }
    }

    if (inputs.length === 0) {
      console.log('No dust found in the wallet address.');
      return;
    }

    // estimate fee. paying X niftoshis/byte
    const txFee = CryptoUtil.estimateFee({ P2PKH: utxos.length }, { P2PKH: 1 });

    // Exit if the transaction costs too much to send.
    if (sendAmount - txFee < 0) {
      console.log("Transaction fee costs more combined dust. Can't send transaction.");
      return;
    }

    // add output w/ address and amount to send
    transactionBuilder.addOutput(sendAddress, sendAmount - txFee);

    // Generate a change address from a Mnemonic of a private key.
    const changeKeyPair = await CryptoUtil.changeAddrFromMnemonic(mnemonic, network);

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
    const sendRawTransaction = await electrumx.broadcast(hex);
    console.log(`Transaction ID: ${sendRawTransaction}`);
    console.log('Check the status of your transaction on this block explorer:');
    CryptoUtil.transactionStatus(sendRawTransaction, NETWORK);
  } catch (err) {
    console.log('error: ', err);
    throw err;
  }
}
