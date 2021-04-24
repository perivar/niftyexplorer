/*
  Create an HDNode wallet using nfy-js. The mnemonic from this wallet
  will be used by later examples.
*/

import * as bip39 from 'bip39';
import * as bip32 from 'bip32';

import CryptoUtil, { WalletInfo } from '../util';

export const createWallet = async (NETWORK: string, importMnemonic?: string): Promise<WalletInfo | undefined> => {
  try {
    const NUM_SEED_ADDRESSES = 1;
    const lang = 'english'; // default language used for mnemonic

    // network
    const network = CryptoUtil.getNetwork(NETWORK);

    // These objects used for writing wallet information out to a file.
    // let outStr = '';
    const outObj: WalletInfo = {} as WalletInfo;

    // create 128 bit BIP39 mnemonic
    const mnemonic = importMnemonic ? importMnemonic : bip39.generateMnemonic();
    console.log('BIP44 NFY Wallet');
    // outStr += 'BIP44 NFY Wallet\n';
    console.log(`128 bit ${lang} BIP39 Mnemonic: `, mnemonic);
    // outStr += `\n128 bit ${lang} BIP32 Mnemonic:\n${mnemonic}\n\n`;
    outObj.mnemonic = mnemonic;

    // root seed buffer
    const rootSeed = await bip39.mnemonicToSeed(mnemonic); // creates seed buffer

    // master HDNode
    const masterHDNode = bip32.fromSeed(rootSeed, network);

    // HDNode of BIP44 account
    console.log("BIP44 Account: \"m/44'/145'/0'\"");
    // outStr += "BIP44 Account: \"m/44'/145'/0'\"\n";

    // Generate the first seed addresses.
    for (let i = 0; i < NUM_SEED_ADDRESSES; i++) {
      // derive a SLP (Simple Ledger Protocol) address
      // Master List BIP 44 Coin Type: https://github.com/satoshilabs/slips/blob/master/slip-0044.md
      // 2	0x80000002	LTC	Litecoin
      // 145	0x80000091	BCH	Bitcoin Cash
      // 245	0x800000f5	SLP	Simple Ledger Protocol
      const childNode = masterHDNode.derivePath(`m/44'/145'/0'/0/${i}`);
      console.log(`m/44'/2'/0'/0/${i}: ${CryptoUtil.toSegWitAddress(childNode, network)}`);
      // outStr += `m/44'/2'/0'/0/${i}: ${CryptoUtil.toCashAddress(childNode, network)}\n`;

      // Save the first seed address for use in the .json output file.
      if (i === 0) {
        outObj.hdNodePath = `m/44'/145'/0'/0/${i}`;
        outObj.segwitAddress = CryptoUtil.toSegWitAddress(childNode, network);
        outObj.legacyAddress = CryptoUtil.toLegacyAddress(childNode, network);
        outObj.privateKeyWIF = childNode.toWIF();
        outObj.publicKey = CryptoUtil.toPublicKey(childNode);
        outObj.privateKey = CryptoUtil.toPrivateKeyFromWIF(outObj.privateKeyWIF, network);
      }
    }

    // Write the extended wallet information into a text file.
    // writeFile('wallet-info.txt', outStr, (err: any) => {
    //   if (err) return console.error(err);
    //   console.log('wallet-info.txt written successfully.');
    // });

    // Write out the basic information into a json file for other example apps to use.
    // writeFile('wallet.json', JSON.stringify(outObj, null, 2), (err: any) => {
    //   if (err) return console.error(err);
    //   console.log('wallet.json written successfully.');
    // });

    return outObj;
  } catch (err) {
    console.error('Error in createWallet(): ', err);
  }
};
