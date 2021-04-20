import getWalletDetails from './getWalletDetails';
import * as bip39 from 'bip39';

let wallet: any;

export const getWallet = () => {
  if (wallet) {
    return wallet;
  }

  try {
    wallet = getWalletDetails(JSON.parse(window.localStorage.getItem('wallet') || ''));
    window.localStorage.setItem('wallet', JSON.stringify(wallet));
  } catch (error) {
    console.log(error);
  }
  return wallet;
};

export const createWallet = (importMnemonic: string) => {
  // create 128 bit BIP39 mnemonic
  const Bip39128BitMnemonic = importMnemonic ? importMnemonic : bip39.generateMnemonic();

  const wallet = getWalletDetails({ mnemonic: Bip39128BitMnemonic.toString() });

  window.localStorage.setItem('wallet', JSON.stringify(wallet));
  return wallet;
};
