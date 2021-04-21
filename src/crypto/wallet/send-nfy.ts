/*
  Send 1000 niftoshis to receiverAddress.
*/

import * as bitcoin from 'bitcoinjs-lib';
import { Transaction } from 'bitcoinjs-lib';
import CryptoUtil, { WalletInfo } from '../util';

export async function sendNFY(
  walletInfo: WalletInfo,
  receiverAddress: string,
  niftoshisToSend: number,
  NETWORK = 'mainnet'
) {
  try {
    const sendAddress = walletInfo.legacyAddress;
    const { mnemonic } = walletInfo;

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

    // If the user fails to specify a reciever address, just send the NFY back
    // to the origination address, so the example doesn't fail.
    if (receiverAddress === '') receiverAddress = sendAddress;

    console.log(`Sender Legacy Address: ${sendAddress}`);
    console.log(`Receiver Legacy Address: ${receiverAddress}`);

    // Get UTXOs held by the address.
    // https://developer.niftycoin.org/mastering-bitcoin-cash/4-transactions/
    const utxos = await electrumx.getUtxos(sendAddress);
    // console.log(`utxos: ${JSON.stringify(utxos, null, 2)}`);

    if (utxos.length === 0) throw new Error('No UTXOs found.');

    // console.log(`u: ${JSON.stringify(u, null, 2)}`
    const utxo = CryptoUtil.findBiggestUtxo(utxos);
    // console.log(`utxo: ${JSON.stringify(utxo, null, 2)}`);

    // instance of transaction builder
    const transactionBuilder = new bitcoin.TransactionBuilder(network);

    // Essential variables of a transaction.
    const originalAmount = utxo.value;
    const vout = utxo.tx_pos;
    const txid = utxo.tx_hash;

    // add input with txid and index of vout
    transactionBuilder.addInput(txid, vout);

    // estimate fee. paying X niftoshis/byte
    const txFee = CryptoUtil.estimateFee({ P2PKH: 1 }, { P2PKH: 2 });

    // amount to send back to the sending address.
    // It's the original amount - 1 sat/byte for tx size
    const remainder = originalAmount - niftoshisToSend - txFee;

    if (remainder < 0) {
      throw new Error('Not enough NFY to complete transaction!');
    }

    // add output w/ address and amount to send
    transactionBuilder.addOutput(receiverAddress, niftoshisToSend);
    transactionBuilder.addOutput(sendAddress, remainder);

    // Generate a change address from a Mnemonic of a private key.
    const changeKeyPair = await CryptoUtil.changeAddrFromMnemonic(mnemonic, network);

    // Sign the transaction with the changeKeyPair HD node.
    const redeemScript = undefined;
    transactionBuilder.sign(0, changeKeyPair, redeemScript, Transaction.SIGHASH_ALL, originalAmount);

    // build tx
    const tx = transactionBuilder.build();
    // output rawhex
    const hex = tx.toHex();
    // console.log(`TX hex: ${hex}`);

    // Broadcast transation to the network
    const txidStr = await electrumx.broadcast(hex);
    console.log(`Transaction ID: ${txidStr}`);
    console.log('Check the status of your transaction on this block explorer:');
    CryptoUtil.transactionStatus(txidStr, NETWORK);
    return txidStr;
  } catch (err) {
    console.log('error: ', err);
    return err;
  }
}
