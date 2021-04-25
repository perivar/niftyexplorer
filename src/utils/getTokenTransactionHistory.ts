import { BigNumber } from 'bignumber.js';
import CryptoUtil, { TokenUTXOInfo } from '../crypto/util';

export const getAllTransactionsHydrated = async (legacyAddress: string) => {
  const NETWORK = process.env.REACT_APP_NETWORK;
  const electrumx = CryptoUtil.getElectrumX(NETWORK);
  const slp = CryptoUtil.getSLP(NETWORK);

  // electrumx getTransactions gets all transactions, both unconfirmed and confirmed
  // unconfirmed (same as getMempool) has a tx_hash, height of 0 and a fee
  // the confirmed has a tx_hash and height
  const allTransactions = await electrumx.getTransactions(legacyAddress);

  const hydratedTransactions = await Promise.all(
    allTransactions.map(async (tx: any) => {
      try {
        const txidDetail = await slp.Utils.hydrateTxNoValidation(tx.tx_hash, legacyAddress);
        return {
          ...txidDetail,
          date: txidDetail.time ? new Date(txidDetail.time * 1000) : new Date(),
          time: txidDetail.time ? txidDetail.time : ''
        };
      } catch (err) {
        return tx;
        // console.log(err);
      }
    })
  );

  return hydratedTransactions;
};

export const getSlpTxsByTokenId = async (legacyAddress: string, tokenId: string) => {
  const hydratedTransactions = await getAllTransactionsHydrated(legacyAddress);

  const transactions = hydratedTransactions.filter((tx: any) => {
    if (
      tx &&
      tx.detail &&
      tx.detail.tokenId === tokenId // tx matches the token ID.
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
