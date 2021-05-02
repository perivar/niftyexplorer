/*
  Mint a NFT Group tokens.
*/

import * as bitcoin from 'bitcoinjs-lib';
import { Transaction } from 'bitcoinjs-lib';
import CryptoUtil, { WalletInfo } from '../../util';

export async function mintNFTGroup(
  walletInfo: WalletInfo,
  tokenId: string,
  tokenQty: number, // The quantity of new tokens to mint.
  tokenReceiverAddress: string,
  batonReceiverAddress: string,
  NETWORK = 'mainnet'
) {
  try {
    // Defaults to sending the token back to the same wallet if the user hasn't specified a
    // different address.

    const { mnemonic } = walletInfo;

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

    // Identify the SLP token UTXOs.
    let tokenUtxos = await slp.Utils.tokenUtxoDetails(utxos);
    // console.log(`tokenUtxos: ${JSON.stringify(tokenUtxos, null, 2)}`)

    // Filter out the non-SLP token UTXOs.
    const nfyUtxos = utxos.filter((utxo: any, index: number) => {
      const tokenUtxo = tokenUtxos[index];
      if (!tokenUtxo.isValid) {
        return true;
      }
      return false;
    });
    // console.log(`nfyUTXOs: ${JSON.stringify(nfyUtxos, null, 2)}`);

    if (nfyUtxos.length === 0) {
      throw new Error('Wallet does not have a NFY UTXO to pay miner fees.');
    }

    // Filter out the token UTXOs that match the user-provided token ID
    // and contain the minting baton.
    tokenUtxos = tokenUtxos.filter((utxo: any) => {
      if (
        utxo && // UTXO is associated with a token.
        utxo.tokenId === tokenId && // UTXO matches the token ID.
        utxo.utxoType === 'minting-baton' && // UTXO is not a minting baton.
        utxo.tokenType === 129 // UTXO is for NFT Group
      ) {
        return true;
      }
      return false;
    });
    // console.log(`tokenUtxos: ${JSON.stringify(tokenUtxos, null, 2)}`);

    if (tokenUtxos.length === 0) {
      throw new Error('No token UTXOs for the specified token could be found.');
    }

    // Choose a UTXO to pay for the transaction.
    const utxo = CryptoUtil.findBiggestUtxo(nfyUtxos);
    // console.log(`nfyUtxo: ${JSON.stringify(nfyUtxo, null, 2)}`);

    // instance of transaction builder
    const transactionBuilder = new bitcoin.TransactionBuilder(network);

    const originalAmount = utxo.value;
    const vout = utxo.tx_pos;
    const txid = utxo.tx_hash;

    // add input to pay for the transaction.
    transactionBuilder.addInput(txid, vout);

    // add the mint baton as an input.
    transactionBuilder.addInput(tokenUtxos[0].tx_hash, tokenUtxos[0].tx_pos);

    // estimate fee. paying X niftoshis/byte
    const txFee = CryptoUtil.estimateFee({ P2PKH: 2 }, { P2PKH: 4 });

    // amount to send back to the sending address.
    // Subtract two dust transactions for minting baton and tokens.
    const remainder = originalAmount - 546 * 2 - txFee;

    // Generate the SLP OP_RETURN.
    const script = slp.NFT1.mintNFTGroupOpReturn(tokenUtxos, tokenQty);

    // OP_RETURN needs to be the first output in the transaction.
    transactionBuilder.addOutput(script, 0);

    // Send the token back to the same wallet if the user hasn't specified a
    // different address.
    if (tokenReceiverAddress === '') tokenReceiverAddress = walletInfo.legacyAddress;

    // Send the minting baton  to the same wallet if the user hasn't specified a
    // different address.
    if (batonReceiverAddress === '') batonReceiverAddress = walletInfo.legacyAddress;

    // Send dust transaction representing the new tokens.
    transactionBuilder.addOutput(tokenReceiverAddress, 546);

    // Send dust transaction representing minting baton.
    transactionBuilder.addOutput(batonReceiverAddress, 546);

    // add output to send NFY remainder of UTXO.
    transactionBuilder.addOutput(legacyAddress, remainder);

    // Sign the transaction for the UTXO input that pays for the transaction..
    transactionBuilder.sign(0, changeKeyPair, undefined, Transaction.SIGHASH_ALL, originalAmount);

    // Sign the Token UTXO minting baton input
    transactionBuilder.sign(1, changeKeyPair, undefined, Transaction.SIGHASH_ALL, 546);

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
    console.error('Error in mintNFTGroup: ', err);
    console.log(`Error message: ${err.message}`);
    throw err;
  }
}
