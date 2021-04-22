import getWalletDetails from './getWalletDetails';
import * as bip39 from 'bip39';

let wallet: any;

// const wallet: WalletInfo = {
// 	hdNodePath: "'m/44'/145'/0'/0/0'",
// 	legacyAddress: 'NP1VCzvkzSTeFph1AW4Bs4ELz25mLPHNaZ',
// 	mnemonic: 'kiwi rescue antique kit love north right wet famous void teach shadow',
// 	privateKey: '719facd2e47a90c28d2d884e0d63d5bc419736fe84fbda843c346497435df372',
// 	privateKeyWIF: '8uYHkB5ud6dBoYUugJ6NDx4i5d4KVLinh8XeQrKmDL5wTKVANfNQ',
// 	publicKey: '03dbd7272cbb67d39d5d01d4275b75211b7c05a2d7bfe687c930adf01ba6a65217',
// 	segwitAddress: 'MWT7nzgsR57kWS88XRWVu9JBaCbQW313eP'
// };

export const getWallet = async () => {
  if (wallet) {
    return wallet;
  }
  try {
    const walletJSON = window.localStorage.getItem('wallet') || '{}';
    const walletInfo = JSON.parse(walletJSON);
    if (!walletInfo.mnemonic) {
      // error and clear locale storage
      window.localStorage.removeItem('wallet');
      return undefined;
    }
    wallet = await getWalletDetails(walletInfo);
    if (wallet) {
      window.localStorage.setItem('wallet', JSON.stringify(wallet));
      return wallet;
    }
  } catch (error) {
    console.log(error);
    return undefined;
  }
};

export const createWallet = async (importMnemonic: string) => {
  try {
    // create 128 bit BIP39 mnemonic
    const Bip39128BitMnemonic = importMnemonic ? importMnemonic : bip39.generateMnemonic();

    wallet = await getWalletDetails({ mnemonic: Bip39128BitMnemonic.toString() });
    if (wallet) {
      window.localStorage.setItem('wallet', JSON.stringify(wallet));
      return wallet;
    }
  } catch (error) {
    console.log(error);
  }
};
