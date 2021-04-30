import CryptoUtil from '../crypto/util';
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
    // const { tokenId } = tokenInfo;
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
            .reduce((a: number, b: number) => a + b, 0) * -1
        );
      if (outputs.length > 1 && outputs.findIndex((element: any) => legacyAddress === element.address) !== -1) {
        return +outputs.find((element: any) => legacyAddress === element.address).amount;
      }
      return 0;
    };

    let tokenTransactionHistory: any = [];
    // const lastUnconfirmedSentTx: any = null;

    const allTxs = await getAllTxs(legacyAddress);

    if (allTxs.length > 0) {
      const decodedTxs = await decodeRawSlpTransactionsByTxs(allTxs, tokenInfo);

      tokenTransactionHistory = decodedTxs
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
          if (y.time === x.time) {
            return -1;
          }
          return y.time - x.time;
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

      const burnTxs = tokenTransactionHistory.filter((txDetail: any) => txDetail.detail.transactionType === 'BURN');

      if (burnTxs.length > 0) {
        // PIN: TODO - don't know how to get this: SLP.Utils.burnTotal?!
        // const amounts = revertChunk(await Promise.all(txIdChunks.map((txIdChunk) => SLP.Utils.burnTotal(txIdChunk))));
        const amounts: any = [];
        tokenTransactionHistory = tokenTransactionHistory.map((txDetail: any) =>
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

      if (tokenTransactionHistory.length > 1) {
        const sentTxs = tokenTransactionHistory.filter(
          (el: any) =>
            (el.balance > 0 && el.detail.transactionType === 'BURN') ||
            (el.balance <= 0 && el.detail.transactionType !== 'BURN_BATON')
        );

        if (sentTxs.length > 0) {
          const arrayUnconf = tokenTransactionHistory;
          tokenTransactionHistory = sentTxs.reduce((acc: any, cur: any, index: number, array: any) => {
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

      tokenTransactionHistory = tokenTransactionHistory
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
      /*
      lastUnconfirmedSentTx = tokenTransactionHistory
        .slice()
        .reverse()
        .find(
          (el: any) =>
            (el.balance > 0 && el.detail.transactionType === 'BURN') ||
            (el.balance <= 0 && el.detail.transactionType !== 'BURN_BATON' && el.detail.transactionType !== 'BURN_ALL')
        );
				*/
    }

    return tokenTransactionHistory;
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
