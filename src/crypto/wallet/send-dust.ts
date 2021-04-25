/*
  Some applications use dust (547 sats) as a signal on the blockchain. This
  example will generate any number of dust outputs and send them to an address.
*/

import * as bitcoin from 'bitcoinjs-lib';
import { Transaction } from 'bitcoinjs-lib';
import CryptoUtil, { WalletInfo } from '../util';

export async function sendDust(walletInfo: WalletInfo, numOutputs: number, receiverAddress = '', NETWORK = 'mainnet') {
  try {
    const sendAddress = walletInfo.legacyAddress;
    const { mnemonic } = walletInfo;

    // network
    const electrumx = CryptoUtil.getElectrumX(NETWORK);
    const { network } = electrumx;

    // Get the balance of the sending address.
    const balance = await electrumx.getBalance(sendAddress);

    // Exit if the balance is zero.
    if (balance <= 0.0) {
      console.log('Balance of sending address is zero. Exiting.');
    }

    // Send the NFY back to the same wallet address.
    if (receiverAddress === '') receiverAddress = sendAddress;

    // Convert to a legacy address (needed to build transactions).
    // const sendAddress = CryptoUtil.toLegacyAddress(sendAddress)
    // const receiverAddress = CryptoUtil.toLegacyAddress(receiverAddress)

    // Get UTXOs held by the address.
    // https://developer.niftycoin.org/mastering-bitcoin-cash/4-transactions/
    const utxos = await electrumx.getUtxos(sendAddress);
    // console.log(`utxos: ${JSON.stringify(utxos, null, 2)}`)

    if (utxos.length === 0) throw new Error('No UTXOs found.');

    // console.log(`u: ${JSON.stringify(u, null, 2)}`
    const utxo = CryptoUtil.findBiggestUtxo(utxos);
    console.log(`utxo: ${JSON.stringify(utxo, null, 2)}`);

    // Ensure there is enough NFY to generate the desired number of dust.
    const outNFY = 546 * numOutputs + 500;
    if (utxo.value < outNFY) {
      throw new Error('Not enough niftoshis to send desired number of dust outputs.');
    }

    // instance of transaction builder
    const transactionBuilder = new bitcoin.TransactionBuilder(network);

    // Essential variables of a transaction.
    const originalAmount = utxo.value;
    const vout = utxo.tx_pos;
    const txid = utxo.tx_hash;

    // add input with txid and index of vout
    transactionBuilder.addInput(txid, vout);

    // estimate fee. paying X niftoshis/byte
    const txFee = CryptoUtil.estimateFee({ P2PKH: 1 }, { P2PKH: numOutputs + 1 });

    // Calculate the amount to put into each new UTXO.
    const changeNfy = originalAmount - txFee - numOutputs * 546;

    if (changeNfy < 546) {
      throw new Error('Not enough NFY to complete transaction!');
    }

    // add outputs w/ address and amount to send
    for (let i = 0; i < numOutputs; i++) {
      transactionBuilder.addOutput(receiverAddress, 546);
    }

    // Add change
    transactionBuilder.addOutput(sendAddress, changeNfy);

    // Generate a change address from a Mnemonic of a private key.
    const changeKeyPair = await CryptoUtil.externalAddressFromMnemonic(mnemonic, network);

    // Sign the transaction with the changeKeyPair HD node.
    transactionBuilder.sign(0, changeKeyPair, undefined, Transaction.SIGHASH_ALL, originalAmount);

    // build tx
    const tx = transactionBuilder.build();
    // output rawhex
    const hex = tx.toHex();
    // console.log(`TX hex: ${hex}`)

    // Broadcast transation to the network
    const txidStr = await electrumx.broadcast(hex);

    console.log(`Transaction ID: ${txidStr}`);
    console.log('Check the status of your transaction on this block explorer:');
    CryptoUtil.transactionStatus(txidStr, NETWORK);
    return txidStr;
  } catch (err) {
    console.log('error: ', err);
    throw err;
  }
}
