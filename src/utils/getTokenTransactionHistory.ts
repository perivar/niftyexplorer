import { BigNumber } from 'bignumber.js';
import chunk from 'lodash/chunk';
import CryptoUtil, { TokenUTXOInfo } from '../crypto/util';
import { decodeRawSlpTransactionsByTxs } from './decodeRawSlpTransactions';

const NETWORK = process.env.REACT_APP_NETWORK;
const electrumx = CryptoUtil.getElectrumX(NETWORK);
const slp = CryptoUtil.getSLP(NETWORK);

export const getAllTxs = async (legacyAddress: string) => {
  // electrumx getTransactions gets all transactions, both unconfirmed and confirmed
  // unconfirmed (same as getMempool) has a tx_hash, height of 0 and a fee
  // the confirmed transactions has a tx_hash and height
  const transactionList = await electrumx.getTransactions(legacyAddress);

  const allTransactions = await Promise.all(
    transactionList.map(async (tx: any) => {
      try {
        const txidDetail = await electrumx.getTransaction(tx.tx_hash);
        return {
          ...txidDetail,
          height: tx.height,
          fee: tx.fee
        };
      } catch (err) {
        return tx;
      }
    })
  );

  return allTransactions;
};

/*
export const getUnconfirmedTxs = async (legacyAddress: string) => {
  // const lastTransactions = await SLP.Address.transactions(slpAddresses);

  const goToNextPage = (transactions: any) => {
    const confirmedTxs = transactions.map((transactionsByAddress: any) =>
      transactionsByAddress.txs.filter((tx: any) => tx.confirmations !== 0)
    );
    return Math.min(...confirmedTxs.map((txs: any) => txs.length)) === 0;
  };

  const concatenatedUniqueUnconfirmedTransactions = (transactions: any) =>
    Object.values(
      transactions
        .map((transactionsByAddress: any) => transactionsByAddress.txs.filter((tx: any) => tx.confirmations === 0))
        .reduce((a: any, b: any) => a.concat(b), [])
        .reduce((acc: any, cur: any) => ({ ...acc, ...{ [cur.txid]: cur } }), {})
    );

  const unconfirmedTxs = concatenatedUniqueUnconfirmedTransactions(lastTransactions);
  if (goToNextPage(lastTransactions)) {
    const numerOfPages = Math.max(...lastTransactions.map((transaction: any) => transaction.pagesTotal));
    for (let page = 1; page < numerOfPages; page++) {
      // const txsOnPage = await SLP.Address.transactions(legacyAddress, page);
      const txsOnPage: any = [];
      unconfirmedTxs.concat(concatenatedUniqueUnconfirmedTransactions(txsOnPage));
      if (!goToNextPage(txsOnPage)) break;
    }
  }
  return unconfirmedTxs;
};

export const getConfirmedSlpTxsByTokenId = async (legacyAddress: string, tokenId: any) => {
  // const transactions = await SLP.Utils.bulkTransactions(legacyAddress.map((address) => ({ tokenId, address })));
  const transactions: any = [];
  return transactions;
};

export const getAllConfirmedSlpTxs = async (legacyAddress: string, tokens: any) => {
  // const transactions = await SLP.Utils.bulkTransactions(
  //   tokens
  //     .map((token) => legacyAddress.map((address) => ({ tokenId: token.tokenId, address })))
  //     .reduce((a: any, b: any) => a.concat(b), [])
  // );
  const transactions: any = [];
  return transactions;
};
*/

const insert = (arr: any, index: any, newItem: any) => [...arr.slice(0, index), newItem, ...arr.slice(index)];

const mockedBurnAll = (txid: any) => ({
  txid,
  detail: { transactionType: 'BURN_ALL' },
  vin: null,
  vout: null,
  balance: null,
  confirmations: null,
  date: null,
  time: null
});

const mockedArrayBurnAll = (txid: any) => [
  {
    txid,
    detail: { transactionType: 'BURN_ALL' },
    vin: null,
    vout: null,
    balance: null,
    confirmations: null,
    date: null,
    time: null
  }
];

const getTokenTransactionHistory = async (legacyAddress: string, tokenInfo: any, tokenUtxos: any) => {
  try {
    const { tokenId } = tokenInfo;

    // const history = getSlpTxsByTokenId(legacyAddress, tokenId);
    // return history;

    const Xor = (x: boolean, y: boolean) => (x || y) && !(x && y);

    const calculateTransactionBalance = (outputs: any) => {
      if (outputs.length === 1 && legacyAddress === outputs[0].address) return +outputs[0].amount;
      if (outputs.length === 1 && !legacyAddress === outputs[0].address) return +outputs[0].amount * -1;
      if (outputs.length > 1 && legacyAddress === outputs[outputs.length - 1].address)
        return (
          outputs
            .slice(0, outputs.length - 1)
            .map((element: any) => +element.amount)
            .reduce((a: any, b: any) => a + b, 0) * -1
        );
      if (outputs.length > 1 && outputs.findIndex((element: any) => legacyAddress === element.address) !== -1)
        return +outputs.find((element: any) => legacyAddress === element.address).amount;
    };

    const tokenTransactionHistory: any = {
      confirmed: [],
      unconfirmed: [],
      lastUnconfirmedSentTx: null
    };

    const unconfirmedTxs = await getAllTxs(legacyAddress);

    if (unconfirmedTxs.length > 0) {
      const decodedTxs = await decodeRawSlpTransactionsByTxs(unconfirmedTxs, tokenInfo);

      tokenTransactionHistory.unconfirmed = decodedTxs
        .slice(0, 30)
        .map((txidDetail: any) => ({
          txid: txidDetail.txid,
          detail: txidDetail.tokenDetails,
          vin: txidDetail.vin,
          vout: txidDetail.vout,
          balance: calculateTransactionBalance(txidDetail.tokenDetails.outputs),
          confirmations: txidDetail.confirmations,
          date: new Date(txidDetail.time * 1000),
          time: txidDetail.time
        }))
        .sort((x: any, y: any) => {
          if (Xor(x.detail.transactionType === 'GENESIS', y.detail.transactionType === 'GENESIS')) {
            return +(x.detail.transactionType === 'GENESIS') - +(y.detail.transactionType === 'GENESIS');
          }
          return 1;
        })
        .map((txDetail: any) => {
          if (
            txDetail.detail.transactionType === 'SEND' &&
            txDetail.detail.outputs.length === 1 &&
            legacyAddress === txDetail.detail.outputs[0].address
          ) {
            return { ...txDetail, detail: { ...txDetail.detail, transactionType: 'BURN' } };
          }
          return txDetail;
        })
        .map((txDetail: any) => {
          if (txDetail.detail.transactionType === 'MINT' && txDetail.balance === 0) {
            return { ...txDetail, detail: { ...txDetail.detail, transactionType: 'BURN_BATON' } };
          }
          return txDetail;
        });

      const burnTxs = tokenTransactionHistory.unconfirmed.filter(
        (txDetail: any) => txDetail.detail.transactionType === 'BURN'
      );

      if (burnTxs.length > 0) {
        // const revertChunk = (chunkedArray: any) =>
        //   chunkedArray.reduce((unchunkedArray: any, chunk: any) => [...unchunkedArray, ...chunk], []);
        // const burnTxIds = burnTxs.map((txDetail: any) => txDetail.txid);
        // const txIdChunks = chunk(burnTxIds, 20);
        // PIN: TODO - don't know how to get this: SLP.Utils.burnTotal?!
        // const amounts = revertChunk(await Promise.all(txIdChunks.map((txIdChunk) => SLP.Utils.burnTotal(txIdChunk))));
        const amounts: any = [];
        tokenTransactionHistory.unconfirmed = tokenTransactionHistory.unconfirmed.map((txDetail: any) =>
          txDetail.detail.transactionType === 'BURN'
            ? {
                ...txDetail,
                detail: {
                  ...txDetail.detail,
                  burnAmount: (amounts.find((amount: any) => amount.transactionId === txDetail.txid) || {}).burnTotal
                }
              }
            : txDetail
        );
      }

      if (tokenTransactionHistory.unconfirmed.length > 1) {
        const sentTxs = tokenTransactionHistory.unconfirmed.filter(
          (el: any) =>
            (el.balance > 0 && el.detail.transactionType === 'BURN') ||
            (el.balance <= 0 && el.detail.transactionType !== 'BURN_BATON')
        );

        if (sentTxs.length > 0) {
          const arrayUnconf = tokenTransactionHistory.unconfirmed;
          tokenTransactionHistory.unconfirmed = sentTxs.reduce((acc: any, cur: any, index: number, array: any) => {
            acc[index] = [];
            const { vin } = cur;
            const txIdInVin = arrayUnconf.filter(
              (el: any) =>
                vin.filter(
                  (item: any) => item.txid === el.txid && item.vout <= el.detail.outputs.length && item.vout > 0
                ).length > 0 &&
                el.txid !== cur.txid &&
                el.detail.transactionType !== 'BURN_BATON'
            );

            if (txIdInVin.length > 0) {
              const hasSentTx = txIdInVin.findIndex(
                (el: any) =>
                  (el.balance > 0 && el.detail.transactionType === 'BURN') ||
                  (el.balance <= 0 && el.detail.transactionType !== 'BURN_BATON')
              );
              if (hasSentTx !== -1 && hasSentTx !== txIdInVin.length - 1) {
                const sentTx = txIdInVin[hasSentTx];
                txIdInVin[hasSentTx] = txIdInVin[txIdInVin.length - 1];
                txIdInVin[txIdInVin.length - 1] = sentTx;
              }

              const isCurrentElementAlreadyOnAccIndex = acc.findIndex(
                (accElArr: any) => accElArr.findIndex((accEl: any) => accEl.txid === cur.txid) !== -1
              );
              const isCurrentElementAlreadyOnAcc = isCurrentElementAlreadyOnAccIndex !== -1;
              const currentElementHasSentTxInVinIndex = acc.findIndex(
                (accElArr: any) =>
                  accElArr.findIndex((accEl: any) => accEl.txid === txIdInVin[txIdInVin.length - 1].txid) !== -1
              );
              const currentElementHasSentTxInVin = hasSentTx !== -1 && currentElementHasSentTxInVinIndex !== -1;

              if (isCurrentElementAlreadyOnAcc && currentElementHasSentTxInVin) {
                acc[isCurrentElementAlreadyOnAccIndex] = acc[isCurrentElementAlreadyOnAccIndex]
                  .concat(txIdInVin.slice(0, txIdInVin.length - 1))
                  .concat(acc[currentElementHasSentTxInVinIndex]);
                acc[currentElementHasSentTxInVinIndex] = [];
              }

              if (isCurrentElementAlreadyOnAcc && !currentElementHasSentTxInVin) {
                acc[isCurrentElementAlreadyOnAccIndex] = acc[isCurrentElementAlreadyOnAccIndex].concat(txIdInVin);
              }

              if (!isCurrentElementAlreadyOnAcc && currentElementHasSentTxInVin) {
                acc[index].push(cur);
                acc[index] = acc[index].concat(txIdInVin.slice(0, txIdInVin.length - 1));
                acc[index] = acc[index].concat(acc[currentElementHasSentTxInVinIndex]);
                acc[currentElementHasSentTxInVinIndex] = [];
              }

              if (!isCurrentElementAlreadyOnAcc && !currentElementHasSentTxInVin) {
                acc[index].push(cur);

                acc[index] = acc[index].concat(txIdInVin);
              }
            } else {
              const isCurrentElementAlreadyOnAccIndex = acc.findIndex(
                (accElArr: any) => accElArr.findIndex((accEl: any) => accEl.txid === cur.txid) !== -1
              );
              const isCurrentElementAlreadyOnAcc = isCurrentElementAlreadyOnAccIndex !== -1;
              if (!isCurrentElementAlreadyOnAcc) {
                acc[index].push(cur);
              }
            }

            if (index < array.length - 1) {
              return acc;
            }
            const accNoEmptyElements = acc.filter((el: any) => !(Array.isArray(el) && el.length === 0));
            const burnBatonTx = arrayUnconf.find((el: any) => el.detail.transactionType === 'BURN_BATON');
            if (burnBatonTx) {
              accNoEmptyElements[0].unshift(burnBatonTx);
            }

            const genesisTxIndex = accNoEmptyElements.findIndex(
              (elArr: any) => elArr.findIndex((el: any) => el.detail.transactionType === 'GENESIS') !== -1
            );
            if (genesisTxIndex !== -1 && genesisTxIndex !== accNoEmptyElements.length - 1) {
              const lastItem = accNoEmptyElements[accNoEmptyElements.length - 1];
              const genesisTx = accNoEmptyElements[genesisTxIndex];
              accNoEmptyElements[genesisTxIndex] = lastItem;
              accNoEmptyElements[accNoEmptyElements.length - 1] = genesisTx;
            }

            const remainingTxs = arrayUnconf.filter(
              (x: any) =>
                !accNoEmptyElements.reduce((a: any, b: any) => a.concat(b), []).some((e: any) => e.txid === x.txid)
            );
            if (remainingTxs.length > 0) {
              const remainingGenesis = remainingTxs.find((el: any) => el.detail.transactionType === 'GENESIS');
              if (burnBatonTx && remainingGenesis) {
                accNoEmptyElements.push([remainingGenesis]);
                accNoEmptyElements[0] = [
                  burnBatonTx,
                  ...remainingTxs.filter((el: any) => el.detail.transactionType !== 'GENESIS'),
                  ...accNoEmptyElements[0].slice(1)
                ];
              }
              if (!burnBatonTx && remainingGenesis) {
                accNoEmptyElements.push([remainingGenesis]);
                accNoEmptyElements[0] = [
                  ...remainingTxs.filter((el: any) => el.detail.transactionType !== 'GENESIS'),
                  ...accNoEmptyElements[0]
                ];
              }
              if (burnBatonTx && !remainingGenesis) {
                accNoEmptyElements[0] = [burnBatonTx, ...remainingTxs, ...accNoEmptyElements[0].slice(1)];
              }

              if (!burnBatonTx && !remainingGenesis) {
                accNoEmptyElements[0] = [...remainingTxs, ...accNoEmptyElements[0]];
              }
            }
            if (accNoEmptyElements.length > 1) {
              const newLength = accNoEmptyElements.length * 2 - 1;

              const accWithMockedBurnAll = Array.from({ length: newLength }).map((e, i) =>
                i % 2 === 0 ? accNoEmptyElements[i / 2] : mockedArrayBurnAll(`unconf-${i}-burn-all`)
              );
              return accWithMockedBurnAll.reduce((a: any, b: any) => a.concat(b), []);
            }
            return accNoEmptyElements.reduce((a: any, b: any) => a.concat(b), []);
          }, []);
        }
      }

      tokenTransactionHistory.unconfirmed = tokenTransactionHistory.unconfirmed
        .reduce((acc: any, cur: any, index: number, array: any) => {
          if (index === 0) {
            const nextSentTxIndex = array.findIndex(
              (el: any) =>
                (el.balance > 0 && el.detail.transactionType === 'BURN') ||
                (el.balance <= 0 &&
                  el.detail.transactionType !== 'BURN_BATON' &&
                  el.detail.transactionType !== 'BURN_ALL')
            );
            if (nextSentTxIndex !== -1) {
              const txIdInVin = array
                .slice(0, nextSentTxIndex + 1)
                .filter(
                  (el: any) =>
                    el.detail.transactionType !== 'BURN_ALL' &&
                    el.detail.transactionType !== 'BURN_BATON' &&
                    tokenUtxos.filter(
                      (item: any) => item.txid === el.txid && item.vout <= el.detail.outputs.length && item.vout > 0
                    ).length > 0
                );
              if (
                txIdInVin.length ===
                array
                  .slice(0, nextSentTxIndex + 1)
                  .filter(
                    (el: any) => el.detail.transactionType !== 'BURN_ALL' && el.detail.transactionType !== 'BURN_BATON'
                  ).length
              ) {
                return { result: array, lastIndex: nextSentTxIndex };
              }
              const burnAllIndexes = array.slice(0, nextSentTxIndex + 1).reduce((acc: any, cur: any, index: number) => {
                if (
                  !txIdInVin.some((e: any) => e.txid === cur.txid) &&
                  cur.detail.transactionType !== 'BURN_ALL' &&
                  cur.detail.transactionType !== 'BURN_BATON'
                ) {
                  acc.push(index);
                }
                return acc;
              }, []);

              const slicedArrayWithBurnAllItems = burnAllIndexes.reduce((acc: any, cur: any, index: number) => {
                return insert(acc, cur + index, mockedBurnAll(`unconf-${cur + index}-burn-all`));
              }, array);
              return { result: slicedArrayWithBurnAllItems, lastIndex: nextSentTxIndex };
            }
            const txIdInVin = array
              .slice(0, array.length)
              .filter(
                (el: any) =>
                  el.detail.transactionType !== 'BURN_ALL' &&
                  el.detail.transactionType !== 'BURN_BATON' &&
                  tokenUtxos.filter(
                    (item: any) => item.txid === el.txid && item.vout <= el.detail.outputs.length && item.vout > 0
                  ).length > 0
              );

            if (
              txIdInVin.length ===
              array
                .slice(0, array.length)
                .filter(
                  (el: any) => el.detail.transactionType !== 'BURN_ALL' && el.detail.transactionType !== 'BURN_BATON'
                ).length
            ) {
              return array.length > 1 ? { result: array, lastIndex: array.length - 1 } : array;
            }
            const burnAllIndexes = array.slice(0, array.length).reduce((acc: any, cur: any, index: number) => {
              if (
                !txIdInVin.some((e: any) => e.txid === cur.txid) &&
                cur.detail.transactionType !== 'BURN_ALL' &&
                cur.detail.transactionType !== 'BURN_BATON'
              ) {
                acc.push(index);
              }
              return acc;
            }, []);

            const slicedArrayWithBurnAllItems = burnAllIndexes.reduce((acc: any, cur: any, index: number) => {
              return insert(acc, cur + index, mockedBurnAll(`unconf-${cur + index}-burn-all`));
            }, array);
            return { result: slicedArrayWithBurnAllItems, lastIndex: array.length - 1 };
          }
          if (index === array.length - 1) {
            return acc.result;
          }
          return acc;
        }, [])
        .filter(
          (tx: any, index: number, array: any) =>
            !(
              tx.detail.transactionType === 'BURN_ALL' &&
              array.length > 1 &&
              array[index + 1].detail.transactionType === 'SEND' &&
              array[index + 1].detail.outputs.length &&
              array[index + 1].detail.outputs.findIndex((output: any) => legacyAddress === output.address) === -1
            )
        );
      tokenTransactionHistory.lastUnconfirmedSentTx = tokenTransactionHistory.unconfirmed
        .slice()
        .reverse()
        .find(
          (el: any) =>
            (el.balance > 0 && el.detail.transactionType === 'BURN') ||
            (el.balance <= 0 && el.detail.transactionType !== 'BURN_BATON' && el.detail.transactionType !== 'BURN_ALL')
        );
    }

    /*
    const remainingNumberTxsDetails = 30 - tokenTransactionHistory.unconfirmed.length;

    // const transactions: any = await getConfirmedSlpTxsByTokenId(legacyAddress, tokenId);
    const transactions: any = allTxs.filter((a: any) => {
      if (a.tokenId === tokenId) return true;
      return false;
    });

    if (transactions.reduce((a: any, b: any) => a.concat(b), []).length > 0 && remainingNumberTxsDetails > 0) {
      const lastNtrancations = (N: any, transactions: any) => transactions.map((el: any) => el.slice(0, N));
      const slicedTransactions = lastNtrancations(remainingNumberTxsDetails, transactions);
      const concatenatedTransactions = slicedTransactions.reduce((a: any, b: any) => a.concat(b), []);
      const uniqueTxids = [
        ...Array.from(new Set(concatenatedTransactions.map((transaction: any) => transaction.txid)))
      ];

      const revertChunk = (chunkedArray: any) =>
        chunkedArray.reduce((unchunkedArray: any, chunk: any) => [...unchunkedArray, ...chunk], []);

      const txidChunks = chunk(uniqueTxids, 20);
      // const txidDetails = revertChunk(
      //   await Promise.all(txidChunks.map((txidChunk) => SLP.Transaction.details(txidChunk)))
      // );
      const txidDetails: any = [];

      tokenTransactionHistory.confirmed = txidDetails
        .map((txidDetail: any) => ({
          txid: txidDetail.txid,
          detail: concatenatedTransactions.find((el: any) => el.txid === txidDetail.txid).tokenDetails.detail,
          vin: txidDetail.vin,
          vout: txidDetail.vout,
          balance: calculateTransactionBalance(
            concatenatedTransactions.find((el: any) => el.txid === txidDetail.txid).tokenDetails.detail.outputs
          ),
          confirmations: txidDetail.confirmations,
          date: new Date(txidDetail.time * 1000),
          time: txidDetail.time
        }))
        .sort((x: any, y: any) => {
          if (Xor(x.detail.transactionType === 'GENESIS', y.detail.transactionType === 'GENESIS')) {
            return +(x.detail.transactionType === 'GENESIS') - +(y.detail.transactionType === 'GENESIS');
          }
          if (y.time === x.time) {
            return -1;
          }
          return y.time - x.time;
        })
        .slice(0, remainingNumberTxsDetails)
        .map((txDetail: any) => {
          if (
            txDetail.detail.transactionType === 'SEND' &&
            txDetail.detail.outputs.length === 1 &&
            legacyAddress === txDetail.detail.outputs[0].address
          ) {
            return { ...txDetail, detail: { ...txDetail.detail, transactionType: 'BURN' } };
          }
          return txDetail;
        })
        .map((txDetail: any) => {
          if (txDetail.detail.transactionType === 'MINT' && txDetail.balance === 0) {
            return { ...txDetail, detail: { ...txDetail.detail, transactionType: 'BURN_BATON' } };
          }
          return txDetail;
        })
        .reduce((acc: any, cur: any, index: number, array: any) => {
          acc[index] = [];
          if (
            (index > 0 && cur.time === array[index - 1].time) ||
            (index < array.length - 1 && cur.time === array[index + 1].time)
          ) {
            const fisrtOcur = array.findIndex((el: any) => el.time === cur.time);
            acc[fisrtOcur].push(cur);
          } else {
            acc[index] = cur;
          }
          return index < array.length - 1 ? acc : acc.filter((el: any) => !(Array.isArray(el) && el.length === 0));
        }, [])
        .map((concatDetails: any, concatDetailsIndex: any) => {
          if (Array.isArray(concatDetails)) {
            const sentTxs = concatDetails.filter(
              (el: any) =>
                (el.balance > 0 && el.detail.transactionType === 'BURN') ||
                (el.balance <= 0 && el.detail.transactionType !== 'BURN_BATON')
            );

            if (sentTxs.length > 0) {
              return sentTxs.reduce((acc: any, cur: any, index: number, array: any) => {
                acc[index] = [];
                const { vin } = cur;
                const txIdInVin = concatDetails.filter(
                  (el: any) =>
                    vin.filter(
                      (item: any) => item.txid === el.txid && item.vout <= el.detail.outputs.length && item.vout > 0
                    ).length > 0 &&
                    el.txid !== cur.txid &&
                    el.detail.transactionType !== 'BURN_BATON'
                );

                if (txIdInVin.length > 0) {
                  const hasSentTx = txIdInVin.findIndex(
                    (el: any) =>
                      (el.balance > 0 && el.detail.transactionType === 'BURN') ||
                      (el.balance <= 0 && el.detail.transactionType !== 'BURN_BATON')
                  );
                  if (hasSentTx !== -1 && hasSentTx !== txIdInVin.length - 1) {
                    const sentTx = txIdInVin[hasSentTx];
                    txIdInVin[hasSentTx] = txIdInVin[txIdInVin.length - 1];
                    txIdInVin[txIdInVin.length - 1] = sentTx;
                  }

                  const isCurrentElementAlreadyOnAccIndex = acc.findIndex(
                    (accElArr: any) => accElArr.findIndex((accEl: any) => accEl.txid === cur.txid) !== -1
                  );
                  const isCurrentElementAlreadyOnAcc = isCurrentElementAlreadyOnAccIndex !== -1;
                  const currentElementHasSentTxInVinIndex = acc.findIndex(
                    (accElArr: any) =>
                      accElArr.findIndex((accEl: any) => accEl.txid === txIdInVin[txIdInVin.length - 1].txid) !== -1
                  );
                  const currentElementHasSentTxInVin = hasSentTx !== -1 && currentElementHasSentTxInVinIndex !== -1;

                  if (isCurrentElementAlreadyOnAcc && currentElementHasSentTxInVin) {
                    acc[isCurrentElementAlreadyOnAccIndex] = acc[isCurrentElementAlreadyOnAccIndex]
                      .concat(txIdInVin.slice(0, txIdInVin.length - 1))
                      .concat(acc[currentElementHasSentTxInVinIndex]);
                    acc[currentElementHasSentTxInVinIndex] = [];
                  }

                  if (isCurrentElementAlreadyOnAcc && !currentElementHasSentTxInVin) {
                    acc[isCurrentElementAlreadyOnAccIndex] = acc[isCurrentElementAlreadyOnAccIndex].concat(txIdInVin);
                  }

                  if (!isCurrentElementAlreadyOnAcc && currentElementHasSentTxInVin) {
                    acc[index].push(cur);
                    acc[index] = acc[index].concat(txIdInVin.slice(0, txIdInVin.length - 1));
                    acc[index] = acc[index].concat(acc[currentElementHasSentTxInVinIndex]);
                    acc[currentElementHasSentTxInVinIndex] = [];
                  }

                  if (!isCurrentElementAlreadyOnAcc && !currentElementHasSentTxInVin) {
                    acc[index].push(cur);

                    acc[index] = acc[index].concat(txIdInVin);
                  }
                } else {
                  const isCurrentElementAlreadyOnAccIndex = acc.findIndex(
                    (accElArr: any) => accElArr.findIndex((accEl: any) => accEl.txid === cur.txid) !== -1
                  );
                  const isCurrentElementAlreadyOnAcc = isCurrentElementAlreadyOnAccIndex !== -1;
                  if (!isCurrentElementAlreadyOnAcc) {
                    acc[index].push(cur);
                  }
                }

                if (index < array.length - 1) {
                  return acc;
                }
                const accNoEmptyElements = acc.filter((el: any) => !(Array.isArray(el) && el.length === 0));
                const burnBatonTx = concatDetails.find((el: any) => el.detail.transactionType === 'BURN_BATON');
                if (burnBatonTx) {
                  accNoEmptyElements[0].unshift(burnBatonTx);
                }

                const genesisTxIndex = accNoEmptyElements.findIndex(
                  (elArr: any) => elArr.findIndex((el: any) => el.detail.transactionType === 'GENESIS') !== -1
                );
                if (genesisTxIndex !== -1 && genesisTxIndex !== accNoEmptyElements.length - 1) {
                  const lastItem = accNoEmptyElements[accNoEmptyElements.length - 1];
                  const genesisTx = accNoEmptyElements[genesisTxIndex];
                  accNoEmptyElements[genesisTxIndex] = lastItem;
                  accNoEmptyElements[accNoEmptyElements.length - 1] = genesisTx;
                }

                const remainingTxs = concatDetails.filter(
                  (x) =>
                    !accNoEmptyElements.reduce((a: any, b: any) => a.concat(b), []).some((e: any) => e.txid === x.txid)
                );
                if (remainingTxs.length > 0) {
                  const remainingGenesis = remainingTxs.find((el: any) => el.detail.transactionType === 'GENESIS');
                  if (burnBatonTx && remainingGenesis) {
                    accNoEmptyElements.push([remainingGenesis]);
                    accNoEmptyElements[0] = [
                      burnBatonTx,
                      ...remainingTxs.filter((el: any) => el.detail.transactionType !== 'GENESIS'),
                      ...accNoEmptyElements[0].slice(1)
                    ];
                  }
                  if (!burnBatonTx && remainingGenesis) {
                    accNoEmptyElements.push([remainingGenesis]);
                    accNoEmptyElements[0] = [
                      ...remainingTxs.filter((el: any) => el.detail.transactionType !== 'GENESIS'),
                      ...accNoEmptyElements[0]
                    ];
                  }
                  if (burnBatonTx && !remainingGenesis) {
                    accNoEmptyElements[0] = [burnBatonTx, ...remainingTxs, ...accNoEmptyElements[0].slice(1)];
                  }

                  if (!burnBatonTx && !remainingGenesis) {
                    accNoEmptyElements[0] = [...remainingTxs, ...accNoEmptyElements[0]];
                  }
                }
                if (accNoEmptyElements.length > 1) {
                  const newLength = accNoEmptyElements.length * 2 - 1;

                  const accWithMockedBurnAll = Array.from({ length: newLength }).map((e, i) =>
                    i % 2 === 0 ? accNoEmptyElements[i / 2] : mockedArrayBurnAll(`${concatDetailsIndex}-${i}-burn-all`)
                  );
                  return accWithMockedBurnAll.reduce((a: any, b: any) => a.concat(b), []);
                }
                return accNoEmptyElements.reduce((a: any, b: any) => a.concat(b), []);
              }, []);
            }
            return concatDetails;
          }
          return concatDetails;
        })
        .reduce((a: any, b: any) => a.concat(b), [])
        .reduce((acc: any, cur: any, index: number, array: any) => {
          if (index === 0) {
            const nextSentTxIndex = array.findIndex(
              (el: any) =>
                (el.balance > 0 && el.detail.transactionType === 'BURN') ||
                (el.balance <= 0 &&
                  el.detail.transactionType !== 'BURN_BATON' &&
                  el.detail.transactionType !== 'BURN_ALL')
            );

            if (nextSentTxIndex !== -1) {
              const lastUtxos = transactions.lastUnconfirmedSentTx
                ? transactions.lastUnconfirmedSentTx.vin
                : tokenUtxos;

              const txIdInVin = array
                .slice(0, nextSentTxIndex + 1)
                .filter(
                  (el: any) =>
                    el.detail.transactionType !== 'BURN_ALL' &&
                    el.detail.transactionType !== 'BURN_BATON' &&
                    lastUtxos.filter(
                      (item: any) => item.txid === el.txid && item.vout <= el.detail.outputs.length && item.vout > 0
                    ).length > 0
                );

              if (
                txIdInVin.length ===
                  array
                    .slice(0, nextSentTxIndex + 1)
                    .filter(
                      (el: any) =>
                        el.detail.transactionType !== 'BURN_ALL' && el.detail.transactionType !== 'BURN_BATON'
                    ).length &&
                nextSentTxIndex !== 0
              ) {
                return { result: array, lastIndex: nextSentTxIndex };
              } else if (
                txIdInVin.length !==
                  array
                    .slice(0, nextSentTxIndex + 1)
                    .filter(
                      (el: any) =>
                        el.detail.transactionType !== 'BURN_ALL' && el.detail.transactionType !== 'BURN_BATON'
                    ).length &&
                nextSentTxIndex !== 0
              ) {
                const burnAllIndexes = array
                  .slice(0, nextSentTxIndex + 1)
                  .reduce((acc: any, cur: any, index: number) => {
                    if (
                      !txIdInVin.some((e: any) => e.txid === cur.txid) &&
                      cur.detail.transactionType !== 'BURN_ALL' &&
                      cur.detail.transactionType !== 'BURN_BATON'
                    ) {
                      acc.push(index);
                    }
                    return acc;
                  }, []);

                const slicedArrayWithBurnAllItems = burnAllIndexes.reduce((acc: any, cur: any, index: number) => {
                  return insert(acc, cur + index, mockedBurnAll(`${cur + index}-burn-all`));
                }, array);

                return { result: slicedArrayWithBurnAllItems, lastIndex: nextSentTxIndex };
              } else if (nextSentTxIndex === 0) {
                const secondNextSentTx = array
                  .slice(1, array.length)
                  .find(
                    (el: any) =>
                      (el.balance > 0 && el.detail.transactionType === 'BURN') ||
                      (el.balance <= 0 &&
                        el.detail.transactionType !== 'BURN_BATON' &&
                        el.detail.transactionType !== 'BURN_ALL')
                  );

                const secondNextSentTxIndex = array
                  .slice(1, array.length)
                  .findIndex(
                    (el: any) =>
                      (el.balance > 0 && el.detail.transactionType === 'BURN') ||
                      (el.balance <= 0 &&
                        el.detail.transactionType !== 'BURN_BATON' &&
                        el.detail.transactionType !== 'BURN_ALL')
                  );

                const isBurAllLastTx =
                  txIdInVin.length !==
                  array
                    .slice(0, nextSentTxIndex + 1)
                    .filter(
                      (el: any) =>
                        el.detail.transactionType !== 'BURN_ALL' && el.detail.transactionType !== 'BURN_BATON'
                    ).length;

                if (!isBurAllLastTx && secondNextSentTxIndex !== -1 && secondNextSentTx.time === array[0].time) {
                  return { result: array, lastIndex: secondNextSentTxIndex + 1 };
                } else if (isBurAllLastTx && secondNextSentTxIndex !== -1 && secondNextSentTx.time === array[0].time) {
                  const burnAllIndexes = array
                    .slice(0, nextSentTxIndex + 1)
                    .reduce((acc: any, cur: any, index: number) => {
                      if (
                        !txIdInVin.some((e: any) => e.txid === cur.txid) &&
                        cur.detail.transactionType !== 'BURN_ALL' &&
                        cur.detail.transactionType !== 'BURN_BATON'
                      ) {
                        acc.push(index);
                      }
                      return acc;
                    }, []);

                  const slicedArrayWithBurnAllItems = burnAllIndexes.reduce((acc: any, cur: any, index: number) => {
                    return insert(acc, cur + index, mockedBurnAll(`${cur + index}-burn-all`));
                  }, array);

                  return {
                    result: slicedArrayWithBurnAllItems,
                    lastIndex: secondNextSentTxIndex + 1
                  };
                } else if (secondNextSentTxIndex === -1) {
                  const txIdInFirstSentVin = array
                    .slice(1, array.length)
                    .filter(
                      (el: any) =>
                        el.detail.transactionType !== 'BURN_ALL' &&
                        el.detail.transactionType !== 'BURN_BATON' &&
                        array[0].vin.filter(
                          (item: any) => item.txid === el.txid && item.vout <= el.detail.outputs.length && item.vout > 0
                        ).length > 0
                    );

                  if (
                    txIdInFirstSentVin.length ===
                    array
                      .slice(1, array.length)
                      .filter(
                        (el: any) =>
                          el.detail.transactionType !== 'BURN_ALL' && el.detail.transactionType !== 'BURN_BATON'
                      ).length
                  ) {
                    return array.length > 1
                      ? {
                          result: isBurAllLastTx ? insert(array, 0, mockedBurnAll(`0-burn-all`)) : array,
                          lastIndex: array.length - 1
                        }
                      : array;
                  }
                  const burnAllIndexes = array.slice(1, array.length).reduce((acc: any, cur: any, index: number) => {
                    if (
                      !txIdInFirstSentVin.some((e: any) => e.txid === cur.txid) &&
                      cur.detail.transactionType !== 'BURN_ALL' &&
                      cur.detail.transactionType !== 'BURN_BATON'
                    ) {
                      acc.push(index + 1);
                    }
                    return acc;
                  }, []);

                  const slicedArrayWithBurnAllItems = burnAllIndexes.reduce((acc: any, cur: any, index: number) => {
                    return insert(acc, cur + index, mockedBurnAll(`${cur + index}-burn-all`));
                  }, array);
                  return {
                    result: isBurAllLastTx
                      ? insert(slicedArrayWithBurnAllItems, 0, mockedBurnAll(`0-burn-all`))
                      : slicedArrayWithBurnAllItems,
                    lastIndex: array.length - 1
                  };
                } else if (secondNextSentTxIndex !== -1 && secondNextSentTx.time !== array[0].time) {
                  const txIdInFirstSentVin = array
                    .slice(1, secondNextSentTxIndex + 1)
                    .filter(
                      (el: any) =>
                        el.detail.transactionType !== 'BURN_ALL' &&
                        el.detail.transactionType !== 'BURN_BATON' &&
                        array[0].vin.filter(
                          (item: any) => item.txid === el.txid && item.vout <= el.detail.outputs.length && item.vout > 0
                        ).length > 0
                    );

                  if (
                    txIdInFirstSentVin.length ===
                    array
                      .slice(1, secondNextSentTxIndex + 1)
                      .filter(
                        (el: any) =>
                          el.detail.transactionType !== 'BURN_ALL' && el.detail.transactionType !== 'BURN_BATON'
                      ).length
                  ) {
                    return {
                      result: isBurAllLastTx ? insert(array, 0, mockedBurnAll(`0-burn-all`)) : array,
                      lastIndex: secondNextSentTxIndex + 1
                    };
                  }
                  const burnAllIndexes = array
                    .slice(1, secondNextSentTxIndex + 1)
                    .reduce((acc: any, cur: any, itemIndex: any) => {
                      if (
                        !txIdInFirstSentVin.some((e: any) => e.txid === cur.txid) &&
                        cur.detail.transactionType !== 'BURN_ALL' &&
                        cur.detail.transactionType !== 'BURN_BATON'
                      ) {
                        acc.push(itemIndex + 1);
                      }
                      return acc;
                    }, []);

                  const slicedArrayWithBurnAllItems = burnAllIndexes.reduce(
                    (accItem: any, curItem: any, itemIndex: any) => {
                      return insert(accItem, curItem + itemIndex, mockedBurnAll(`${curItem + itemIndex}-burn-all`));
                    },
                    array
                  );
                  return {
                    result: isBurAllLastTx
                      ? insert(slicedArrayWithBurnAllItems, 0, mockedBurnAll(`0-burn-all`))
                      : slicedArrayWithBurnAllItems,
                    lastIndex: secondNextSentTxIndex + 1
                  };
                }
                return { result: array, lastIndex: array.length - 1 };
              }
              return { result: array, lastIndex: array.length - 1 };
            }
            const lastUtxos = transactions.lastUnconfirmedSentTx ? transactions.lastUnconfirmedSentTx.vin : tokenUtxos;

            const txIdInVin = array
              .slice(0, array.length)
              .filter(
                (el: any) =>
                  el.detail.transactionType !== 'BURN_ALL' &&
                  el.detail.transactionType !== 'BURN_BATON' &&
                  lastUtxos.filter(
                    (item: any) => item.txid === el.txid && item.vout <= el.detail.outputs.length && item.vout > 0
                  ).length > 0
              );

            if (
              txIdInVin.length ===
              array
                .slice(0, array.length)
                .filter(
                  (el: any) => el.detail.transactionType !== 'BURN_ALL' && el.detail.transactionType !== 'BURN_BATON'
                ).length
            ) {
              return array.length > 1 ? { result: array, lastIndex: array.length - 1 } : array;
            }
            const burnAllIndexes = array.slice(0, array.length).reduce((acc: any, cur: any, index: number) => {
              if (
                !txIdInVin.some((e: any) => e.txid === cur.txid) &&
                cur.detail.transactionType !== 'BURN_ALL' &&
                cur.detail.transactionType !== 'BURN_BATON'
              ) {
                acc.push(index);
              }
              return acc;
            }, []);

            const slicedArrayWithBurnAllItems = burnAllIndexes.reduce((acc: any, cur: any, index: number) => {
              return insert(acc, cur + index, mockedBurnAll(`${cur + index}-burn-all`));
            }, array);
            return { result: slicedArrayWithBurnAllItems, lastIndex: array.length - 1 };
          }
          if (index === acc.lastIndex && acc.lastIndex !== array.length - 1) {
            const nextSentTx = array
              .slice(index + 1)
              .find(
                (el: any) =>
                  (el.balance > 0 && el.detail.transactionType === 'BURN') ||
                  (el.balance <= 0 &&
                    el.detail.transactionType !== 'BURN_BATON' &&
                    el.detail.transactionType !== 'BURN_ALL')
              );

            const nextSentTxIndex = array
              .slice(index + 1)
              .findIndex(
                (el: any) =>
                  (el.balance > 0 && el.detail.transactionType === 'BURN') ||
                  (el.balance <= 0 &&
                    el.detail.transactionType !== 'BURN_BATON' &&
                    el.detail.transactionType !== 'BURN_ALL')
              );

            if (nextSentTx && nextSentTx.time === array[acc.lastIndex].time) {
              return { result: acc.result, lastIndex: nextSentTxIndex + index + 1 };
            }

            if (nextSentTxIndex !== -1 && nextSentTx.time !== array[acc.lastIndex].time) {
              const txIdInVin = array
                .slice(index + 1, nextSentTxIndex + index + 2)
                .filter(
                  (el: any) =>
                    el.detail.transactionType !== 'BURN_ALL' &&
                    el.detail.transactionType !== 'BURN_BATON' &&
                    array[acc.lastIndex].vin.filter(
                      (item: any) => item.txid === el.txid && item.vout <= el.detail.outputs.length && item.vout > 0
                    ).length > 0
                );

              if (
                txIdInVin.length ===
                array
                  .slice(index + 1, nextSentTxIndex + index + 2)
                  .filter(
                    (el: any) => el.detail.transactionType !== 'BURN_ALL' && el.detail.transactionType !== 'BURN_BATON'
                  ).length
              ) {
                return { result: acc.result, lastIndex: nextSentTxIndex + index + 1 };
              }
              const numberBurnAlls =
                acc.result.filter((e: any) => e.detail.transactionType === 'BURN_ALL').length -
                array.filter((e: any) => e.detail.transactionType === 'BURN_ALL').length;

              const burnAllIndexes = array
                .slice(index + 1, nextSentTxIndex + index + 2)
                .reduce((acc: any, cur: any, itemIndex: any) => {
                  if (
                    !txIdInVin.some((e: any) => e.txid === cur.txid) &&
                    cur.detail.transactionType !== 'BURN_ALL' &&
                    cur.detail.transactionType !== 'BURN_BATON'
                  ) {
                    acc.push(itemIndex + index + 1);
                  }
                  return acc;
                }, []);
              const slicedArrayWithBurnAllItems = burnAllIndexes.reduce(
                (accItem: any, curItem: any, itemIndex: any) => {
                  return insert(
                    accItem,
                    curItem + itemIndex + numberBurnAlls,
                    mockedBurnAll(`${curItem + itemIndex}-burn-all`)
                  );
                },
                acc.result
              );
              return {
                result: slicedArrayWithBurnAllItems,
                lastIndex: nextSentTxIndex + index + 1
              };
            }
            const txIdInVin = array
              .slice(index + 1)
              .filter(
                (el: any) =>
                  el.detail.transactionType !== 'BURN_ALL' &&
                  el.detail.transactionType !== 'BURN_BATON' &&
                  array[acc.lastIndex].vin.filter(
                    (item: any) => item.txid === el.txid && item.vout <= el.detail.outputs.length && item.vout > 0
                  ).length > 0
              );

            if (
              txIdInVin.length ===
              array
                .slice(index + 1)
                .filter(
                  (el: any) => el.detail.transactionType !== 'BURN_ALL' && el.detail.transactionType !== 'BURN_BATON'
                ).length
            ) {
              return { result: acc.result, lastIndex: array.length - 1 };
            }
            const burnAllIndexes = array.slice(index + 1).reduce((acc: any, cur: any, itemIndex: any) => {
              if (
                !txIdInVin.some((e: any) => e.txid === cur.txid) &&
                cur.detail.transactionType !== 'BURN_ALL' &&
                cur.detail.transactionType !== 'BURN_BATON'
              ) {
                acc.push(itemIndex + index + 1);
              }
              return acc;
            }, []);

            const numberBurnAlls =
              acc.result.filter((e: any) => e.detail.transactionType === 'BURN_ALL').length -
              array.filter((e: any) => e.detail.transactionType === 'BURN_ALL').length;

            const slicedArrayWithBurnAllItems = burnAllIndexes.reduce((accItem: any, curItem: any, itemIndex: any) => {
              return insert(
                accItem,
                curItem + itemIndex + numberBurnAlls,
                mockedBurnAll(`${curItem + itemIndex}-burn-all`)
              );
            }, acc.result);
            return { result: slicedArrayWithBurnAllItems, lastIndex: array.length - 1 };
          }
          if (index === array.length - 1) {
            return acc.result;
          }
          return acc;
        }, [])
        .filter(
          (tx: any, index: number, array: any) =>
            !(
              tx.detail.transactionType === 'BURN_ALL' &&
              array.length > 1 &&
              array[index + 1].detail.transactionType === 'SEND' &&
              array[index + 1].detail.outputs.length &&
              array[index + 1].detail.outputs.findIndex((output: any) => legacyAddress === output.address) === -1
            )
        );

      const burnTxs = tokenTransactionHistory.confirmed.filter(
        (txDetail: any) => txDetail.detail.transactionType === 'BURN'
      );

      if (burnTxs.length > 0) {
        const revertChunk = (chunkedArray: any) =>
          chunkedArray.reduce((unchunkedArray: any, chunk: any) => [...unchunkedArray, ...chunk], []);
        const burnTxIds = burnTxs.map((txDetail: any) => txDetail.txid);
        const txIdChunks = chunk(burnTxIds, 20);
        // const amounts = revertChunk(await Promise.all(txIdChunks.map((txIdChunk) => SLP.Utils.burnTotal(txIdChunk))));
        const amounts: any = [];
        tokenTransactionHistory.confirmed = tokenTransactionHistory.confirmed.map((txDetail: any) =>
          txDetail.detail.transactionType === 'BURN'
            ? {
                ...txDetail,
                detail: {
                  ...txDetail.detail,
                  burnAmount: (amounts.find((amount: any) => amount.transactionId === txDetail.txid) || {}).burnTotal
                }
              }
            : txDetail
        );
      }
    }
		*/

    const { unconfirmed, confirmed } = tokenTransactionHistory;
    const tokenHistory = unconfirmed.concat(confirmed);

    return tokenHistory;
  } catch (err) {
    console.log('err', err);
    return [];
  }
};

export const getAllTransactionsHydrated = async (legacyAddress: string) => {
  // electrumx getTransactions gets all transactions, both unconfirmed and confirmed
  // unconfirmed (same as getMempool) has a tx_hash, height of 0 and a fee
  // the confirmed transactions has a tx_hash and height
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

export default getTokenTransactionHistory;
