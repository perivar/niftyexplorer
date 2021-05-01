/*
An initial preparation transaction is required before a new NFT can be created. 
This ensures only 1 parent token is burned in the NFT Genesis transaction.
After this is transaction is broadcast you can proceed to fill out the NFT details 
and then click 'Create NFT'
@see 
https://github.com/simpleledger/Electron-Cash-SLP/blob/master/electroncash_gui/qt/slp_create_token_genesis_dialog.py#L399
https://github.com/simpleledger/Electron-Cash-SLP/blob/master/electroncash/slp.py#L467
https://slp.dev/packages/slp-mdm.js/#send
*/
import * as bitcoin from 'bitcoinjs-lib';
import { Transaction } from 'bitcoinjs-lib';
import CryptoUtil, { WalletInfo } from '../../util';

export async function prepareNFTGroup(
  walletInfo: WalletInfo,
  tokenId: string,
  tokenQty: number,
  tokenReceiverAddress = '',
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

    // get the legacy address
    const legacyAddress = CryptoUtil.toLegacyAddress(changeKeyPair, network);

    // Get UTXOs held by this address.
    const utxos = await electrumx.getUtxos(legacyAddress);
    // console.log(`utxos: ${JSON.stringify(utxos, null, 2)}`);

    if (utxos.length === 0) throw new Error('No UTXOs to spend! Exiting.');

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

    // Filter out the token UTXOs that match the user-provided token ID.
    tokenUtxos = tokenUtxos.filter((utxo: any) => {
      if (
        utxo && // UTXO is associated with a token.
        utxo.tokenId === tokenId && // UTXO matches the token ID.
        utxo.utxoType === 'token' && // UTXO is not a minting baton.
        utxo.tokenType === 129 // UTXO is for an NFT Group
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
    const nfyUtxo = CryptoUtil.findBiggestUtxo(nfyUtxos);
    // console.log(`nfyUtxo: ${JSON.stringify(nfyUtxo, null, 2)}`);

    // After this is transaction is broadcast you can proceed to fill out the
    // NFT details and then click 'Create NFT'.")

    let sendQtyArray: number[] = [];
    if (tokenQty < 19) {
      sendQtyArray = [tokenQty];
    } else if (tokenQty >= 19) {
      sendQtyArray = [18];
      sendQtyArray.push(tokenQty - 18);
    }

    const slpSendObj = slp.NFT1.generateNFTGroupSendManyOpReturn(tokenUtxos, sendQtyArray);
    const slpData = slpSendObj.script;
    // console.log(`slpOutputs: ${slpSendObj.outputs}`);

    // BEGIN transaction construction.

    // instance of transaction builder
    const transactionBuilder = new bitcoin.TransactionBuilder(network);

    // Add the NFY UTXO as input to pay for the transaction.
    const originalAmount = nfyUtxo.value;
    transactionBuilder.addInput(nfyUtxo.tx_hash, nfyUtxo.tx_pos);

    // add each token UTXO as an input.
    for (let i = 0; i < tokenUtxos.length; i++) {
      transactionBuilder.addInput(tokenUtxos[i].tx_hash, tokenUtxos[i].tx_pos);
    }

    // estimate fee. paying X niftoshis/byte
    const txFee = CryptoUtil.estimateFee({ P2PKH: tokenUtxos.length + 1 }, { P2PKH: slpSendObj.outputs + 2 });

    // amount to send back to the sending address. It's the original amount - 1 sat/byte for tx size
    let remainder = originalAmount - txFee - 546;

    // subtract dust transactions if required
    for (let i = 1; i < slpSendObj.outputs; i++) {
      remainder = remainder - 546;
    }

    if (remainder < 1) {
      throw new Error('Selected UTXO does not have enough niftoshis');
    }
    // console.log(`remainder: ${remainder}`)

    // Add OP_RETURN as first output.
    transactionBuilder.addOutput(slpData, 0);

    // Send the token back to the same wallet if the user hasn't specified a
    // different address.
    if (tokenReceiverAddress === '') tokenReceiverAddress = walletInfo.legacyAddress;

    // Send dust transaction representing tokens being sent.
    transactionBuilder.addOutput(tokenReceiverAddress, 546);

    // Return any token change back to the sender.
    for (let i = 1; i < slpSendObj.outputs; i++) {
      transactionBuilder.addOutput(legacyAddress, 546);
    }

    // Last output: send the NFY change back to the wallet.
    transactionBuilder.addOutput(legacyAddress, remainder);

    // Sign the transaction with the private key for the NFY UTXO paying the fees.
    transactionBuilder.sign(0, changeKeyPair, undefined, Transaction.SIGHASH_ALL, originalAmount);

    // Sign each token UTXO being consumed.
    for (let i = 0; i < tokenUtxos.length; i++) {
      const thisUtxo = tokenUtxos[i];
      transactionBuilder.sign(1 + i, changeKeyPair, undefined, Transaction.SIGHASH_ALL, thisUtxo.value);
    }

    // build tx
    const tx = transactionBuilder.build();

    // output rawhex
    const hex = tx.toHex();
    // console.log(`Transaction raw hex: `, hex)

    // END transaction construction.

    // Broadcast transation to the network
    const txidStr = await electrumx.broadcast(hex);
    console.log(`Transaction ID: ${txidStr}`);

    console.log('Check the status of your transaction on this block explorer:');
    CryptoUtil.transactionStatus(txidStr, NETWORK);
    return txidStr;
  } catch (err) {
    console.error('Error in prepareGroupToken: ', err);
    console.log(`Error message: ${err.message}`);
    throw err;
  }
}
