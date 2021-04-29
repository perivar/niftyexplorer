import * as bitcoin from 'bitcoinjs-lib';
// import chunk from 'lodash/chunk';
import CryptoUtil, { SlpTokenData } from '../crypto/util';
import { getAllTxs } from './getTokenTransactionHistory';
import { isSlpTx } from './decodeRawSlpTransactions';
// import { getAllTransactionsHydrated } from './getTokenTransactionHistory';

const NETWORK = process.env.REACT_APP_NETWORK;
// const electrumx = CryptoUtil.getElectrumX(NETWORK);
const slp = CryptoUtil.getSLP(NETWORK);

/*
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
*/

export const isNfyDividens = (vout: any) => {
  const scriptASMArray = bitcoin.script.toASM(Buffer.from(vout[0].scriptPubKey.hex, 'hex')).split(' ');
  const metaData =
    scriptASMArray.length > 1 ? Buffer.from(scriptASMArray[1], 'hex').toString('ascii').split(' ') : null;
  return scriptASMArray[0] === 'OP_RETURN' && metaData && metaData[1] && metaData[1].includes('MintDividend')
    ? decodeNfyDividensMetaData(metaData)
    : false;
};

const hasOpReturn = (vout: any): boolean => {
  const scriptASMArray = bitcoin.script.toASM(Buffer.from(vout[0].scriptPubKey.hex, 'hex')).split(' ');
  return scriptASMArray[0] === 'OP_RETURN';
};

const decodeNfyDividensMetaData = (metaData: any) => {
  return {
    tokenId: metaData[0],
    message: metaData.length > 2 ? metaData.slice(2, metaData.length).join(' ') : ''
  };
};

const getTransactionHistory = async (legacyAddress: any, tokens: any) => {
  try {
    /*
    const hydratedTransactions = await getAllTransactionsHydrated(legacyAddress);

    //  decode vout[] script
    const decodedTxs = hydratedTransactions.map((tx: any) => {
      try {
        return {
          txid: tx.txid,
          date: tx.time ? new Date(tx.time * 1000) : new Date(),
          time: tx.time,
          confirmations: tx.confirmations ? tx.confirmations : 'Not yet confirmed',
          transactionBalance: calculateTransactionBalance(tx, legacyAddress)
        };
      } catch (err) {
        console.log(err);
      }
    });

    return { nfyTransactions: decodedTxs };
*/

    const calculateTransactionBalance = (vout: any, vin: any) => {
      const isDividends = isNfyDividens(vout);
      if (isDividends) {
        if (vout.length > 2 && legacyAddress === vout[vout.length - 1].scriptPubKey.addresses[0]) {
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
            .findIndex((element: any) => legacyAddress === element.scriptPubKey.addresses[0]) !== -1
        ) {
          return {
            balance: (
              vout
                .slice(1, vout.length - 1)
                .filter((element: any) => legacyAddress === element.scriptPubKey.addresses[0])
                .map((el: any) => +el.value * Math.pow(10, 8))
                .reduce((a: any, b: any) => a + b, 0) * Math.pow(10, -8)
            ).toFixed(8),
            type: 'MintDividend Received',
            outputs: vout
              .slice(1, vout.length - 1)
              .filter((element: any) => legacyAddress === element.scriptPubKey.addresses[0])
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
            .findIndex((element: any) => legacyAddress === element.scriptPubKey.addresses[0]) === -1
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
          legacyAddress === vout[0].scriptPubKey.addresses[0] &&
          ((vin[0].addr && vin.findIndex((input: any) => !legacyAddress === input.addr) === -1) ||
            (vin[0].legacyAddress && vin.findIndex((input: any) => !legacyAddress === input.legacyAddress) === -1))
        ) {
          const previousBalance = vin
            .map((input: any) => +input.value)
            .filter((el: any) => el > 546)
            .reduce((a: any, b: any) => +a + +b, 0);

          return {
            balance: ((+vout[0].value * Math.pow(10, 8) - previousBalance) * Math.pow(10, -8)).toFixed(8),
            type: 'Change Received'
          };
        }
        if (vout.length === 1 && legacyAddress === vout[0].scriptPubKey.addresses[0]) {
          return { balance: +vout[0].value, type: 'Received' };
        }

        if (vout.length === 1 && !legacyAddress === vout[0].scriptPubKey.addresses[0]) {
          return { balance: +vout[0].value * -1, type: 'Sent' };
        }

        if (vout.length > 1 && legacyAddress === vout[vout.length - 1].scriptPubKey.addresses[0]) {
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
            .findIndex((element: any) => legacyAddress === element.scriptPubKey.addresses[0]) !== -1
        ) {
          return {
            balance: (
              vout
                .slice(0, vout.length - 1)
                .filter((element: any) => legacyAddress === element.scriptPubKey.addresses[0])
                .map((el: any) => +el.value * Math.pow(10, 8))
                .reduce((a: any, b: any) => a + b, 0) * Math.pow(10, -8)
            ).toFixed(8),
            type: 'Received'
          };
        }

        if (
          vout.length > 1 &&
          vout.findIndex((element: any) => legacyAddress === element.scriptPubKey.addresses[0]) === -1
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

    // const slpAddresses = legacyAddress.map((addr) => SLP.Address.toSLPAddress(addr));
    // const slpAddresses: any = [];
    // const nonZeroIndexes = transactions.reduce((a: any, e: any, i: any) => {
    //   if (e.length > 0) a.push(i);
    //   return a;
    // }, []);

    // const unconfirmedTxs = await getUnconfirmedTxs(slpAddresses);
    const unconfirmedTxs = await getAllTxs(legacyAddress);
    // const unconfirmedSlpTxids = unconfirmedTxs.filter((tx: any) => isSlpTx(tx)).map((tx: any) => tx.txid);
    transactionHistory.unconfirmed = unconfirmedTxs
      .filter((tx: any) => !isSlpTx(tx))
      .map((el: any) => ({
        txid: el.txid,
        date: new Date(el.time * 1000),
        confirmations: el.confirmations,
        transactionBalance: calculateTransactionBalance(el.vout, el.vin)
      }));

    /*
    const unconfirmedNfyTxids = transactionHistory.unconfirmed.map((tx: any) => tx.txid);

    // const confirmedSlpTxs = await getAllConfirmedSlpTxs(slpAddresses, tokens);

    // const concatenatedConfirmedSlpTxids = confirmedSlpTxs
    //   .map((txsByAddr: any) => txsByAddr.map((tx: any) => tx.txid))
    //   .reduce((a: any, b: any) => a.concat(b), []);
    // const confirmedSlpTxids = Array.from(new Set(concatenatedConfirmedSlpTxids));
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
		*/

    const { unconfirmed, confirmed } = transactionHistory;
    const history = unconfirmed.concat(confirmed);
    return {
      nfyTransactions: history
      // wallets: nonZeroIndexes.map((el: any) => legacyAddress[el])
    };
  } catch (e) {
    console.log('error :', e);
    return [];
  }
};

/*
const calculateTransactionBalance = (tx: any, legacyAddress: string) => {
  const { vout } = tx;
  const { vin } = tx;

  const isSLP: any = isSLPTransaction(tx);
  if (isSLP) {
    // transactionBalance.metaData.tokenId
    // transactionBalance.metaData.message

    slp.Utils.setQuantityIfSend(isSLP, tx, legacyAddress);

    return {
      type: 'SLP',
      balance: isSLP.qty,
      metaData: {
        tokenId: isSLP.tokenId,
        tokenType:
          isSLP.tokenType === 129
            ? 'NFT Group'
            : isSLP.tokenType === 65
            ? 'NFT Child'
            : isSLP.tokenType === 1
            ? 'SLP Token'
            : `Unknown type: ${isSLP.tokenType}`,
        message: [isSLP.transactionType ?? '', isSLP.ticker ?? '', isSLP.name ?? '', isSLP.documentUri ?? ''].join(',')
      }
    };
  } else if (!hasOpReturn(vout)) {
    if (
      // PIN TODO - this will never hit with electrumx that doesn't have these attributes added to vin and vout
      vout.length === 1 &&
      legacyAddress === vout[0].scriptPubKey.addresses[0] &&
      ((vin[0].addr && vin.findIndex((input: any) => !legacyAddress === input.addr) === -1) ||
        (vin[0].legacyAddress && vin.findIndex((input: any) => !legacyAddress === input.legacyAddress) === -1))
    ) {
      const previousBalance = vin
        .map((input: any) => +input.value)
        .filter((el: number) => el > 546)
        .reduce((a: any, b: any) => +a + +b, 0);

      return {
        balance: ((+vout[0].value * Math.pow(10, 8) - previousBalance) * Math.pow(10, -8)).toFixed(8),
        type: 'Change Received'
      };
    }
    if (vout.length === 1 && legacyAddress === vout[0].scriptPubKey.addresses[0]) {
      return { balance: +vout[0].value, type: 'Received' };
    }

    if (vout.length === 1 && !legacyAddress === vout[0].scriptPubKey.addresses[0]) {
      return { balance: +vout[0].value * -1, type: 'Sent' };
    }

    if (vout.length > 1 && legacyAddress === vout[vout.length - 1].scriptPubKey.addresses[0]) {
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
        .findIndex((element: any) => legacyAddress === element.scriptPubKey.addresses[0]) !== -1
    ) {
      return {
        balance: (
          vout
            .slice(0, vout.length - 1)
            .filter((element: any) => legacyAddress === element.scriptPubKey.addresses[0])
            .map((el: any) => +el.value * Math.pow(10, 8))
            .reduce((a: any, b: any) => a + b, 0) * Math.pow(10, -8)
        ).toFixed(8),
        type: 'Received'
      };
    }

    if (
      vout.length > 1 &&
      vout.findIndex((element: any) => legacyAddress === element.scriptPubKey.addresses[0]) === -1
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

  const metaData = decodeOpReturn(vout);

  return {
    balance: metaData ? { metaData } : null,
    type: 'Unknown'
  };
};
*/

export const isSLPTransaction = (tx: any): boolean | SlpTokenData => {
  const { vout } = tx;
  const scriptASMArray = bitcoin.script.toASM(Buffer.from(vout[0].scriptPubKey.hex, 'hex')).split(' ');
  const metaData =
    scriptASMArray.length > 1 ? Buffer.from(scriptASMArray[1], 'hex').toString('ascii').split(' ') : null;
  return scriptASMArray[0] === 'OP_RETURN' && metaData && metaData[0] && metaData[0].includes('SLP')
    ? decodeSLPMetaData(tx)
    : false;
};

const decodeSLPMetaData = (tx: any): SlpTokenData => {
  return slp.Utils.decodeTxData(tx);
};

const decodeOpReturn = (vout: any): any => {
  const scriptASMArray = bitcoin.script.toASM(Buffer.from(vout[0].scriptPubKey.hex, 'hex')).split(' ');
  const decoded: any = [];
  if (scriptASMArray.length > 1) {
    scriptASMArray.map((asm: any) => {
      try {
        const ascii = Buffer.from(asm, 'hex').toString('ascii').trim();
        if (ascii !== '') decoded.push(ascii);
      } catch (error) {
        // ignore
      }
    });
  }
  const metaData = decoded.join(',');

  return scriptASMArray[0] === 'OP_RETURN' && metaData;
};

export default getTransactionHistory;
