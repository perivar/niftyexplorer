/*
  Create an HDNode wallet using nfy-js. The mnemonic from this wallet
  will be used in the other examples.
*/

import * as bip39 from 'bip39';
import * as bip32 from 'bip32';

import CryptoUtil, { WalletInfo } from '../util';

export const createWallet = async (NETWORK: string, importMnemonic?: string): Promise<WalletInfo | undefined> => {
  try {
    const NUM_SEED_ADDRESSES = 1;
    const lang = 'english'; // default language used for mnemonic

    const outObj: WalletInfo = {} as WalletInfo;

    // network
    const network = CryptoUtil.getNetwork(NETWORK);

    // create 128 bit BIP39 mnemonic
    const mnemonic = importMnemonic ? importMnemonic : bip39.generateMnemonic();
    console.log('BIP44 NFY Wallet');
    console.log(`128 bit ${lang} BIP39 Mnemonic: `, mnemonic);
    outObj.mnemonic = mnemonic;

    // root seed buffer
    const rootSeed = await bip39.mnemonicToSeed(mnemonic); // creates seed buffer

    // master HDNode
    const masterHDNode = bip32.fromSeed(rootSeed, network);

    // HDNode of BIP44 account
    // const account = masterHDNode.derivePath("m/44'/245'/0'");
    // console.log("BIP44 Account: \"m/44'/245'/0'\"");

    // Generate the first seed addresses.
    for (let i = 0; i < NUM_SEED_ADDRESSES; i++) {
      // derive a SLP (Simple Ledger Protocol) address
      // Master List BIP 44 Coin Type: https://github.com/satoshilabs/slips/blob/master/slip-0044.md
      // 2	0x80000002	LTC	Litecoin
      // 145	0x80000091	BCH	Bitcoin Cash
      // 245	0x800000f5	SLP	Simple Ledger Protocol
      const childNode = masterHDNode.derivePath(`m/44'/245'/0'/0/${i}`);
      console.log(`m/44'/245'/0'/0/${i}: ${CryptoUtil.toSegWitAddress(childNode, network)}`);

      if (i === 0) {
        outObj.segwitAddress = CryptoUtil.toSegWitAddress(childNode, network);
        outObj.legacyAddress = CryptoUtil.toLegacyAddress(childNode, network);
        outObj.privateKeyWIF = childNode.toWIF();
      }
    }

    return outObj;
  } catch (err) {
    console.error('Error in createWallet: ', err);
    console.log(`Error message: ${err.message}`);
    throw err;
  }
};
