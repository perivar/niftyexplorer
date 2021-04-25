import getWalletDetails from './getWalletDetails';
import * as bip39 from 'bip39';

let wallet: any;

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
