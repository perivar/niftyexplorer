import * as bitcoin from 'bitcoinjs-lib';
import { toBitcoinJS } from './nfy';

const network = toBitcoinJS();

export const generateWallet = () => {
  const keyPair = bitcoin.ECPair.makeRandom({ network });
  const publicKey = keyPair.publicKey.toString('hex');
  const address = bitcoin.payments.p2pkh({ pubkey: keyPair.publicKey, network });
  const wif = keyPair.toWIF();
  const privateKey = bitcoin.ECPair.fromWIF(wif, network);
  console.log(`Public: ${publicKey} \nPrivate: ${privateKey} \nAddress: ${address} \nWIF: ${wif}`);
};
