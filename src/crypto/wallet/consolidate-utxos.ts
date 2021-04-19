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

    // get byte count to calculate fee. paying 1.2 sat/byte
    const byteCount = CryptoUtil.getByteCount({ P2PKH: inputs.length }, { P2PKH: 1 });
    console.log(`byteCount: ${byteCount}`);

    const niftoshisPerByte = 1.0;
    const txFee = Math.ceil(niftoshisPerByte * byteCount);
    console.log(`txFee: ${txFee}`);

    // Exit if the transaction costs too much to send.
    if (sendAmount - txFee < 0) {
      console.log("Transaction fee costs more combined UTXOs. Can't send transaction.");
      return;
    }

    // add output w/ address and amount to send
    transactionBuilder.addOutput(sendAddress, sendAmount - txFee);

    // Generate a change address from a Mnemonic of a private key.
    const changeKeyPair = await CryptoUtil.changeAddrFromMnemonic(mnemonic, network);

    // Sign the transaction with the changeKeyPair HD node.
    const redeemScript = undefined;
    inputs.forEach((input, index) => {
      transactionBuilder.sign(index, changeKeyPair, redeemScript, Transaction.SIGHASH_ALL, input.value);
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
