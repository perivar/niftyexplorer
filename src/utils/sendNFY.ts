import { add } from 'lodash';
import CryptoUtil from '../crypto/util';
import CryptoWallet from '../crypto/wallet';
const NETWORK = process.env.REACT_APP_NETWORK;

export const sendNFY = async (
  wallet: any,
  utxos: any,
  { addresses, values, encodedOpReturn }: any,
  callbackTxId: any
): Promise<string> => {
  const niftoshisToSend = Math.floor(values[0] * 100000000);
  const tx = CryptoWallet.sendNFY(wallet, addresses[0], niftoshisToSend, NETWORK);
  return `https://explorer.niftycoin.org/tx/${tx}`;
};

export const calcFee = (utxos: any) => {
  const txFee = CryptoUtil.estimateFee({ P2PKH: utxos.length }, { P2PKH: 2 });
  return txFee / 100000000;
};
