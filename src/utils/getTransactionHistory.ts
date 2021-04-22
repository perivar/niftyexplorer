import * as bitcoin from 'bitcoinjs-lib';
import chunk from 'lodash/chunk';
import CryptoUtil, { TokenUTXOInfo } from '../crypto/util';
import { getUnconfirmedTxs, getAllConfirmedSlpTxs } from './getTokenTransactionHistory';
import { isSlpTx } from './decodeRawSlpTransactions';

const getLastTxDetails = async (remainingNumberTxsDetails: any, confirmedNfyTxids: any, lastSliceSize: any) => {
  const lastNtrancationIds = (M: any, N: any, transactionIds: any) => transactionIds.map((el: any) => el.slice(M, N));
  const slicedTxids = lastNtrancationIds(lastSliceSize, lastSliceSize + remainingNumberTxsDetails, confirmedNfyTxids);
  const concatenatedTxids = slicedTxids.reduce((a: any, b: any) => a.concat(b), []);
  const uniqueTxids = Array.from(new Set(concatenatedTxids));

  const revertChunk = (chunkedArray: any) =>
    chunkedArray.reduce((unchunkedArray: any, chunk: any) => [...unchunkedArray, ...chunk], []);

  const txidChunks = chunk(uniqueTxids, 20);
  // const txidDetails = revertChunk(await Promise.all(txidChunks.map((txidChunk) => SLP.Transaction.details(txidChunk))));
  const txidDetails: any = [];
  return txidDetails;
};

export const isNfyDividens = (vout: any) => {
  const scriptASMArray = bitcoin.script.toASM(Buffer.from(vout[0].scriptPubKey.hex, 'hex')).split(' ');
  const metaData =
    scriptASMArray.length > 1 ? Buffer.from(scriptASMArray[1], 'hex').toString('ascii').split(' ') : null;
  return scriptASMArray[0] === 'OP_RETURN' && metaData && metaData[1] && metaData[1].includes('MintDividend')
    ? decodeNfyDividensMetaData(metaData)
    : false;
};

export const hasOpReturn = (vout: any) => {
  const scriptASMArray = bitcoin.script.toASM(Buffer.from(vout[0].scriptPubKey.hex, 'hex')).split(' ');

  return scriptASMArray[0] === 'OP_RETURN';
};

const decodeNfyDividensMetaData = (metaData: any) => {
  return {
    tokenId: metaData[0],
    message: metaData.length > 2 ? metaData.slice(2, metaData.length).join(' ') : ''
  };
};

const getTransactionHistory = async (cashAddresses: any, transactions: any, tokens: any) => {
  try {
    const calculateTransactionBalance = (vout: any, vin: any) => {
      const isDividends = isNfyDividens(vout);
      if (isDividends) {
        if (vout.length > 2 && cashAddresses.includes(vout[vout.length - 1].scriptPubKey.addresses[0])) {
          return {
            balance: (
              vout
                .slice(1, vout.length - 1)
                .map((element: any) => +element.value * Math.pow(10, 8))
                .reduce((a: any, b: any) => a + b, 0) *
              Math.pow(10, -8) *
              -1
            ).toFixed(8),
            type: 'MintDividend Sent',
            outputs: vout.slice(1, vout.length - 1).map((element: any) => ({
              address: element.scriptPubKey.addresses[0],
              amount: +element.value * -1
            })),

            metaData: isDividends
          };
        }

        if (
          vout.length > 2 &&
          vout
            .slice(1, vout.length - 1)
            .findIndex((element: any) => cashAddresses.includes(element.scriptPubKey.addresses[0])) !== -1
        ) {
          return {
            balance: (
              vout
                .slice(1, vout.length - 1)
                .filter((element: any) => cashAddresses.includes(element.scriptPubKey.addresses[0]))
                .map((el: any) => +el.value * Math.pow(10, 8))
                .reduce((a: any, b: any) => a + b, 0) * Math.pow(10, -8)
            ).toFixed(8),
            type: 'MintDividend Received',
            outputs: vout
              .slice(1, vout.length - 1)
              .filter((element: any) => cashAddresses.includes(element.scriptPubKey.addresses[0]))
              .map((el: any) => ({
                address: el.scriptPubKey.addresses[0],
                amount: +el.value
              })),
            metaData: isDividends
          };
        }

        if (
          vout.length > 1 &&
          vout
            .slice(1, vout.length)
            .findIndex((element: any) => cashAddresses.includes(element.scriptPubKey.addresses[0])) === -1
        ) {
          return {
            balance: (
              vout
                .slice(1, vout.length)
                .map((el: any) => +el.value * Math.pow(10, 8))
                .reduce((a: any, b: any) => a + b, 0) *
              Math.pow(10, -8) *
              -1
            ).toFixed(8),
            type: 'MintDividend Sent',
            outputs: vout.slice(1, vout.length).map((el: any) => ({
              address: el.scriptPubKey.addresses[0],
              amount: +el.value * -1
            })),
            metaData: isDividends
          };
        }

        return {
          balance: null,
          type: 'Unknown'
        };
      } else if (!hasOpReturn(vout)) {
        if (
          vout.length === 1 &&
          cashAddresses.includes(vout[0].scriptPubKey.addresses[0]) &&
          ((vin[0].addr && vin.findIndex((input: any) => !cashAddresses.includes(input.addr)) === -1) ||
            (vin[0].legacyAddress &&
              vin.findIndex((input: any) => !cashAddresses.includes(input.legacyAddress)) === -1))
        ) {
          const previousBalance = vin
            .map((input: any) => +(vin[0].valueSat ? input.valueSat : input.value))
            .filter((el: any) => el > 546)
            .reduce((a: any, b: any) => +a + +b, 0);

          return {
            balance: ((+vout[0].value * Math.pow(10, 8) - previousBalance) * Math.pow(10, -8)).toFixed(8),
            type: 'Change Received'
          };
        }
        if (vout.length === 1 && cashAddresses.includes(vout[0].scriptPubKey.addresses[0])) {
          return { balance: +vout[0].value, type: 'Received' };
        }

        if (vout.length === 1 && !cashAddresses.includes(vout[0].scriptPubKey.addresses[0])) {
          return { balance: +vout[0].value * -1, type: 'Sent' };
        }

        if (vout.length > 1 && cashAddresses.includes(vout[vout.length - 1].scriptPubKey.addresses[0])) {
          return {
            balance: (
              vout
                .slice(0, vout.length - 1)
                .map((element: any) => +element.value * Math.pow(10, 8))
                .reduce((a: any, b: any) => a + b, 0) *
              Math.pow(10, -8) *
              -1
            ).toFixed(8),
            type: 'Sent'
          };
        }

        if (
          vout.length > 1 &&
          vout
            .slice(0, vout.length - 1)
            .findIndex((element: any) => cashAddresses.includes(element.scriptPubKey.addresses[0])) !== -1
        ) {
          return {
            balance: (
              vout
                .slice(0, vout.length - 1)
                .filter((element: any) => cashAddresses.includes(element.scriptPubKey.addresses[0]))
                .map((el: any) => +el.value * Math.pow(10, 8))
                .reduce((a: any, b: any) => a + b, 0) * Math.pow(10, -8)
            ).toFixed(8),
            type: 'Received'
          };
        }

        if (
          vout.length > 1 &&
          vout.findIndex((element: any) => cashAddresses.includes(element.scriptPubKey.addresses[0])) === -1
        ) {
          return {
            balance: (
              vout.map((element: any) => +element.value * Math.pow(10, 8)).reduce((a: any, b: any) => a + b, 0) *
              Math.pow(10, -8) *
              -1
            ).toFixed(8),
            type: 'Sent'
          };
        }

        return {
          balance: null,
          type: 'Unknown'
        };
      }
      return {
        balance: null,
        type: 'Unknown'
      };
    };

    const transactionHistory: any = {
      confirmed: [],
      unconfirmed: []
    };

    // const slpAddresses = cashAddresses.map((addr) => SLP.Address.toSLPAddress(addr));
    const slpAddresses: any = [];
    const nonZeroIndexes = transactions.reduce((a: any, e: any, i: any) => {
      if (e.length > 0) a.push(i);
      return a;
    }, []);

    const unconfirmedTxs = await getUnconfirmedTxs(slpAddresses);
    const unconfirmedSlpTxids = unconfirmedTxs.filter((tx: any) => isSlpTx(tx)).map((tx: any) => tx.txid);
    transactionHistory.unconfirmed = unconfirmedTxs
      .filter((tx: any) => !isSlpTx(tx))
      .map((el: any) => ({
        txid: el.txid,
        date: new Date(),
        confirmations: el.confirmations,
        transactionBalance: calculateTransactionBalance(el.vout, el.vin)
      }));

    const unconfirmedNfyTxids = transactionHistory.unconfirmed.map((tx: any) => tx.txid);

    const confirmedSlpTxs = await getAllConfirmedSlpTxs(slpAddresses, tokens);

    const concatenatedConfirmedSlpTxids = confirmedSlpTxs
      .map((txsByAddr: any) => txsByAddr.map((tx: any) => tx.txid))
      .reduce((a: any, b: any) => a.concat(b), []);
    const confirmedSlpTxids = Array.from(new Set(concatenatedConfirmedSlpTxids));
    const slpTxids = unconfirmedSlpTxids.concat(confirmedSlpTxids);

    let remainingNumberTxsDetails = 30 - transactionHistory.unconfirmed.length;

    if (remainingNumberTxsDetails > 0) {
      const confirmedNfyTxids = Array.from({ length: nonZeroIndexes.length });
      nonZeroIndexes.forEach((e: any, i: any) => {
        confirmedNfyTxids[i] = transactions[e].filter(
          (el: any) => !slpTxids.includes(el) && !unconfirmedNfyTxids.includes(el)
        );
      });

      const txidDetails = await getLastTxDetails(remainingNumberTxsDetails, confirmedNfyTxids, 0);

      const bchTxidDetails = txidDetails.filter((detail: any) => !isSlpTx(detail)).slice(0, remainingNumberTxsDetails);

      while (
        Math.max(...confirmedNfyTxids.map((txids: any) => txids.length)) > 29 - transactionHistory.unconfirmed.length
          ? bchTxidDetails.length < 30 - transactionHistory.unconfirmed.length
          : bchTxidDetails.length < Math.max(...confirmedNfyTxids.map((txids: any) => txids.length))
      ) {
        const diff = 30 - transactionHistory.unconfirmed.length - bchTxidDetails.length;
        const details = await getLastTxDetails(diff, confirmedNfyTxids, remainingNumberTxsDetails);
        remainingNumberTxsDetails += diff;
        bchTxidDetails.concat(details.filter((detail: any) => !isSlpTx(detail)));
        if (remainingNumberTxsDetails > Math.max(...confirmedNfyTxids.map((txids: any) => txids.length)) - 1) break;
      }

      transactionHistory.confirmed = bchTxidDetails
        .sort((x: any, y: any) => y.time - x.time)
        .map((el: any) => ({
          txid: el.txid,
          date: new Date(el.time * 1000),
          confirmations: el.confirmations,
          transactionBalance: calculateTransactionBalance(el.vout, el.vin)
        }))
        .slice(0, 30 - transactionHistory.unconfirmed.length);
    }

    const { unconfirmed, confirmed } = transactionHistory;
    const history = unconfirmed.concat(confirmed);
    return {
      bchTransactions: history,
      wallets: nonZeroIndexes.map((el: any) => cashAddresses[el])
    };
  } catch (e) {
    console.log('error :', e);
    return [];
  }
};

export default getTransactionHistory;
