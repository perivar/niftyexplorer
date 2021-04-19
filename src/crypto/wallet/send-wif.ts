/*
  Same as send-nfy example, except this uses a WIF instead of a mnemonic to
  sign the transaction.
  Send 1000 niftoshis to receiverAddress.
*/

import * as bitcoin from 'bitcoinjs-lib';
import { Transaction } from 'bitcoinjs-lib';
import CryptoUtil, { WalletInfo } from '../util';

export async function sendWIF(
  walletInfo: WalletInfo,
  receiverAddress: string,
  niftoshisToSend: number,
  NETWORK = 'mainnet'
) {
  try {
    const sendAddress = walletInfo.legacyAddress;
    const SEND_WIF = walletInfo.privateKeyWIF;

    // If the user fails to specify a reciever address, just send the NFY back
    // to the origination address, so the example doesn't fail.
    if (receiverAddress === '') receiverAddress = sendAddress;

    // network
    const electrumx = CryptoUtil.getElectrumX(NETWORK);
    const { network } = electrumx;

    // Get the balance of the sending address.
    const balance = await electrumx.getBalance(sendAddress);
    console.log(`balance: ${JSON.stringify(balance, null, 2)}`);
    console.log(`Balance of sending address ${sendAddress} is ${balance} NFY.`);

    // Exit if the balance is zero.
    if (balance <= 0.0) {
      console.log('Balance of sending address is zero. Exiting.');
    }

    console.log(`Sender Legacy Address: ${sendAddress}`);
    console.log(`Receiver Legacy Address: ${receiverAddress}`);

    const balance2 = await electrumx.getBalance(receiverAddress);
    console.log(`Balance of recieving address ${receiverAddress} is ${balance2} NFY.`);

    const utxos = await electrumx.getUtxos(sendAddress);
    // console.log('utxos: ', utxos)

    if (utxos.length === 0) throw new Error('No UTXOs found.');

    const utxo = CryptoUtil.findBiggestUtxo(utxos);
    // console.log(`utxo: ${JSON.stringify(utxo, null, 2)}`)

    // instance of transaction builder
    const transactionBuilder = new bitcoin.TransactionBuilder(network);

    const originalAmount = utxo.value;
    const vout = utxo.tx_pos;
    const txid = utxo.tx_hash;

    // add input with txid and index of vout
    transactionBuilder.addInput(txid, vout);

    // get byte count to calculate fee. paying 1.2 sat/byte
    const byteCount = CryptoUtil.getByteCount({ P2PKH: 1 }, { P2PKH: 2 });
    console.log(`byteCount: ${byteCount}`);
    const niftoshisPerByte = 1.0;
    const txFee = Math.floor(niftoshisPerByte * byteCount);
    // console.log(`txFee: ${txFee}`)

    // amount to send back to the sending address.
    // It's the original amount - 1 sat/byte for tx size
    const remainder = originalAmount - niftoshisToSend - txFee;

    // add output w/ address and amount to send
    transactionBuilder.addOutput(receiverAddress, niftoshisToSend);
    transactionBuilder.addOutput(sendAddress, remainder);

    const changeKeyPair = bitcoin.ECPair.fromWIF(SEND_WIF, network);

    // Sign the transaction with the changeKeyPair HD node.
    const redeemScript = undefined;
    transactionBuilder.sign(0, changeKeyPair, redeemScript, Transaction.SIGHASH_ALL, originalAmount);
    // transactionBuilder.sign(0, keyPair);

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
