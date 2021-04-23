import { BigNumber } from 'bignumber.js';
import CryptoUtil, { TokenUTXOInfo } from '../crypto/util';

const NETWORK = process.env.REACT_APP_NETWORK;
const electrumx = CryptoUtil.getElectrumX(NETWORK);
const slp = CryptoUtil.getSLP(NETWORK);

export const getSlpTxsByTokenId = async (legacyAddress: string, tokenId: string) => {
  const unconfirmedTransactions = await electrumx.getMempool(legacyAddress);
  const confirmedTransactions = await electrumx.getTransactions(legacyAddress);

  const allTransactions = [...unconfirmedTransactions, ...confirmedTransactions];

  const hydratedTransactions = await Promise.all(
    allTransactions.map(async (tx: any) => {
      try {
        const txidDetail = await slp.Utils.hydrateTxNoValidation(tx.tx_hash);
        return {
          ...txidDetail,
          date: new Date(txidDetail.time * 1000),
          time: txidDetail.time
        };
      } catch (err) {
        return tx;
        // console.log(err);
      }
    })
  );

  const transactions = hydratedTransactions.filter((tx: any) => {
    if (
      tx && // UTXO is associated with a token.
      tx.detail &&
      tx.detail.tokenId === tokenId // UTXO matches the token ID.
    ) {
      return true;
    }
    return false;
  });

  return transactions;
};

const getTokenTransactionHistory = async (legacyAddress: string, tokenInfo: any, tokenUtxos: any) => {
  try {
    const { tokenId } = tokenInfo;

    const history = getSlpTxsByTokenId(legacyAddress, tokenId);
    return history;
  } catch (err) {
    console.log('err', err);
    return [];
  }
};

export default getTokenTransactionHistory;
