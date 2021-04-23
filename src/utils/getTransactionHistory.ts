import * as bitcoin from 'bitcoinjs-lib';
import CryptoUtil, { TokenUTXOInfo } from '../crypto/util';

const getTransactionHistory = async (legacyAddress: string, transactions: any, tokens: any) => {
  try {
    return [];
  } catch (e) {
    console.log('error :', e);
    return [];
  }
};

export default getTransactionHistory;
