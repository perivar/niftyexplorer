/*
  Create a new SLP token. Requires a wallet created with the create-wallet
  example. Also requires that wallet to have a small NFY balance.
*/

import * as bitcoin from 'bitcoinjs-lib';
import { Transaction } from 'bitcoinjs-lib';
import CryptoUtil, { SLPGenesisOpReturnConfig, WalletInfo } from '../util';

export async function createToken(walletInfo: WalletInfo, NETWORK = 'mainnet') {
  try {
    const { mnemonic } = walletInfo;

    // network
    const electrumx = CryptoUtil.getElectrumX(NETWORK);
    const { network } = electrumx;
    const slp = CryptoUtil.getSLP(NETWORK);

    // Generate an EC key pair for signing the transaction.
    const changeKeyPair = await CryptoUtil.changeAddrFromMnemonic(mnemonic, network);

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
    console.log(`utxo: ${JSON.stringify(utxo, null, 2)}`);

    // instance of transaction builder
    const transactionBuilder = new bitcoin.TransactionBuilder(network);

    const originalAmount = utxo.value;
    const vout = utxo.tx_pos;
    const txid = utxo.tx_hash;

    // add input with txid and index of vout
    transactionBuilder.addInput(txid, vout);

    // Set the transaction fee. Manually set for ease of example.
    const txFee = 550;

    // amount to send back to the sending address.
    // Subtract two dust transactions for minting baton and tokens.
    const remainder = originalAmount - 546 * 2 - txFee;

    // Generate SLP config object
    const configObj: SLPGenesisOpReturnConfig = {
      name: 'SLP Test Token',
      ticker: 'SLPTEST',
      documentUrl: 'https://www.niftycoin.org',
      decimals: 8,
      initialQty: 100,
      documentHash: '',
      mintBatonVout: 2 // the minting baton is always on vout 2
    };

    // Generate the OP_RETURN entry for an SLP GENESIS transaction.
    const script = slp.TokenType1.generateGenesisOpReturn(configObj);

    // OP_RETURN needs to be the first output in the transaction.
    transactionBuilder.addOutput(script, 0);

    // Send dust transaction representing the tokens.
    transactionBuilder.addOutput(legacyAddress, 546);

    // Send dust transaction representing minting baton.
    transactionBuilder.addOutput(legacyAddress, 546);

    // add output to send NFY remainder of UTXO.
    transactionBuilder.addOutput(legacyAddress, remainder);

    // Sign the transaction with the changeKeyPair HD node.
    const redeemScript = undefined;
    transactionBuilder.sign(0, changeKeyPair, redeemScript, Transaction.SIGHASH_ALL, originalAmount);

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
  } catch (err) {
    console.error('Error in createToken: ', err);
  }
}
