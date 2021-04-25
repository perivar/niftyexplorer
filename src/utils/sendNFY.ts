import Big from 'big.js';
import * as bitcoin from 'bitcoinjs-lib';
import { Transaction } from 'bitcoinjs-lib';
import CryptoUtil from '../crypto/util';
// import CryptoWallet from '../crypto/wallet';

export const SEND_NFY_ERRORS = {
  INSUFICIENT_FUNDS: 0,
  NETWORK_ERROR: 1,
  INSUFFICIENT_PRIORITY: 66, // ~insufficient fee
  DOUBLE_SPENDING: 18,
  MAX_UNCONFIRMED_TXS: 64
};
const NETWORK = process.env.REACT_APP_NETWORK;

export const DUST = 0.00005;

export const sendNFY = async (wallet: any, nonSlpUtxos: any, { addresses, values }: any): Promise<string> => {
  // ensure that we are not using an utxo which is used for SLP
  // since this will burn the token and destroy it for ever

  try {
    if (!values.length) {
      throw new Error('No values to send');
    }

    if (nonSlpUtxos.length === 0) {
      throw new Error('No UTXOs found.');
    }

    // network
    const electrumx = CryptoUtil.getElectrumX(NETWORK);
    const { network } = electrumx;

    const value: Big = values.reduce(
      (previous: number, current: number) => new Big(current).plus(previous),
      new Big(0)
    );
    const REMAINDER_ADDR = wallet.legacyAddress;

    const inputUtxos = [];

    // instance of transaction builder
    const transactionBuilder = new bitcoin.TransactionBuilder(network);

    const niftoshisToSend = CryptoUtil.toNiftoshi(value.toNumber());

    let originalAmount = new Big(0);
    let txFee = 0;
    for (let i = 0; i < nonSlpUtxos.length; i++) {
      const utxo = nonSlpUtxos[i];
      originalAmount = originalAmount.plus(utxo.value);
      const { vout } = utxo;
      const { txid } = utxo;

      // add input with txid and index of vout
      transactionBuilder.addInput(txid, vout);
      inputUtxos.push(utxo);

      // estimate fee. paying X niftoshis/byte
      txFee = CryptoUtil.estimateFee({ P2PKH: inputUtxos.length }, { P2PKH: addresses.length + 1 });

      if (originalAmount.minus(niftoshisToSend).minus(txFee).gte(0)) {
        break;
      }
    }

    // amount to send back to the remainder address.
    const remainder = Math.floor(originalAmount.minus(niftoshisToSend).minus(txFee).toNumber());
    if (remainder < 0) {
      const error: any = new Error(`Insufficient funds`);
      error.code = SEND_NFY_ERRORS.INSUFICIENT_FUNDS;
      throw error;
    }

    // add output w/ address and amount to send
    for (let i = 0; i < addresses.length; i++) {
      const address = addresses[i];
      const niftoshis = CryptoUtil.toNiftoshi(Number(values[i]));
      transactionBuilder.addOutput(address, niftoshis);
    }

    if (remainder >= CryptoUtil.toNiftoshi(DUST)) {
      transactionBuilder.addOutput(REMAINDER_ADDR, remainder);
    }

    // Generate a change address from a Mnemonic of a private key.
    const changeKeyPair = await CryptoUtil.changeAddressFromMnemonic(wallet.mnemonic, network);

    // Sign the transactions with the HD node.
    for (let i = 0; i < inputUtxos.length; i++) {
      const utxo = inputUtxos[i];
      transactionBuilder.sign(i, changeKeyPair, undefined, Transaction.SIGHASH_ALL, utxo.value);
    }

    // build tx
    const tx = transactionBuilder.build();
    // output rawhex
    const hex = tx.toHex();

    // Broadcast transation to the network
    const txidStr = await electrumx.broadcast(hex);

    const link = CryptoUtil.transactionStatus(txidStr, NETWORK);
    return link;
  } catch (err) {
    if (err.error === 'insufficient priority (code 66)') {
      err.code = SEND_NFY_ERRORS.INSUFFICIENT_PRIORITY;
    } else if (err.error === 'txn-mempool-conflict (code 18)') {
      err.code = SEND_NFY_ERRORS.DOUBLE_SPENDING;
    } else if (err.error === 'Network Error') {
      err.code = SEND_NFY_ERRORS.NETWORK_ERROR;
    } else if (err.error === 'too-long-mempool-chain, too many unconfirmed ancestors [limit: 25] (code 64)') {
      err.code = SEND_NFY_ERRORS.MAX_UNCONFIRMED_TXS;
    }
    console.log(`error: `, err);
    throw err;
  }
};

export const calcFee = (nonSlpUtxos: any) => {
  const txFee = CryptoUtil.estimateFee({ P2PKH: nonSlpUtxos.length }, { P2PKH: 2 });
  return CryptoUtil.toNiftyCoin(txFee);
};
