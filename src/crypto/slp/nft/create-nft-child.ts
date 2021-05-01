/*
  Create a new NFT Child SLP token. Requires:
  - a wallet created with the create-wallet example.
  - wallet to have a small NFY balance.
  - At least one NFT Group token needs to have been created with the
    create-nft-group example.
*/

import * as bitcoin from 'bitcoinjs-lib';
import CryptoUtil, { NFTChildGenesisOpReturnConfig, WalletInfo } from '../../util';

import { Transaction } from 'bitcoinjs-lib';

// Example SLP NFT config object for the child (the actual token)
// const configObjChild: NFTChildGenesisOpReturnConfig = {
//   name: 'NFT Test Token Child',
//   ticker: 'NFTY0001',
//   documentUrl: 'https://www.niftycoin.org'
// };
export async function createNFTChild(
  walletInfo: WalletInfo,
  tokenId: string,
  configObj: NFTChildGenesisOpReturnConfig,
  NETWORK = 'mainnet'
) {
  try {
    const { mnemonic } = walletInfo;

    // network
    const electrumx = CryptoUtil.getElectrumX(NETWORK);
    const { network } = electrumx;
    const slp = CryptoUtil.getSLP(NETWORK);

    // Generate an EC key pair for signing the transaction.
    const changeKeyPair = await CryptoUtil.changeAddressFromMnemonic(mnemonic, network);

    // get the cash address
    const legacyAddress = CryptoUtil.toLegacyAddress(changeKeyPair, network);

    // Get a UTXO to pay for the transaction.
    const utxos = await electrumx.getUtxos(legacyAddress);
    // console.log(`utxos: ${JSON.stringify(utxos, null, 2)}`);

    if (utxos.length === 0) {
      throw new Error('No UTXOs to pay for transaction! Exiting.');
    }

    // Identify the SLP token UTXOs.
    let tokenUtxos = await slp.Utils.tokenUtxoDetails(utxos);
    // console.log(`tokenUtxos: ${JSON.stringify(tokenUtxos, null, 2)}`);

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
        utxo.utxoType === 'token' // UTXO is not a minting baton.
      ) {
        return true;
      }
      return false;
    });
    // console.log(`tokenUtxos: ${JSON.stringify(tokenUtxos, null, 2)}`);

    if (tokenUtxos.length === 0) {
      throw new Error('No token UTXOs for the specified token could be found.');
    }

    // Get the biggest UTXO to pay for the transaction.
    const utxo = CryptoUtil.findBiggestUtxo(utxos);
    // console.log(`utxo: ${JSON.stringify(utxo, null, 2)}`)

    // instance of transaction builder
    const transactionBuilder = new bitcoin.TransactionBuilder(network);

    const originalAmount = utxo.value;
    const vout = utxo.tx_pos;
    const txid = utxo.tx_hash;

    // add the NFT Group UTXO as an input. This NFT Group token must be burned
    // to create a Child NFT, as per the spec.
    transactionBuilder.addInput(tokenUtxos[0].tx_hash, tokenUtxos[0].tx_pos);

    // add input with txid and index of vout
    transactionBuilder.addInput(txid, vout);

    // estimate fee. paying X niftoshis/byte
    const txFee = CryptoUtil.estimateFee({ P2PKH: 2 }, { P2PKH: 3 });

    // amount to send back to the sending address.
    // subtract one dust transactions for tokens. (not a baton)
    const remainder = originalAmount - 546 * 1 - txFee;

    // Generate the OP_RETURN entry for an SLP GENESIS transaction.
    const script = slp.NFT1.generateNFTChildGenesisOpReturn(configObj);

    // OP_RETURN needs to be the first output in the transaction.
    transactionBuilder.addOutput(script, 0);

    // Send dust transaction representing the tokens.
    transactionBuilder.addOutput(legacyAddress, 546);

    // Note! A NFT Child Token (i.e. the actual token) does not include a minting baton
    // transactionBuilder.addOutput(legacyAddress, 546);

    // add output to send NFY remainder of UTXO.
    transactionBuilder.addOutput(legacyAddress, remainder);

    // Sign the Token UTXO for the NFT Group token that will be burned in this
    // transaction.
    transactionBuilder.sign(0, changeKeyPair, undefined, Transaction.SIGHASH_ALL, 546);

    // Sign the input for the UTXO paying for the TX.
    transactionBuilder.sign(1, changeKeyPair, undefined, Transaction.SIGHASH_ALL, originalAmount);

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
    console.error('Error in createNFTChild: ', err);
    console.log(`Error message: ${err.message}`);
    throw err;
  }
}
