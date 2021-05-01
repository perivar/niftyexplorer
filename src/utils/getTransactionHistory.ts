import * as bitcoin from 'bitcoinjs-lib';
import { getAllTxs } from './getTokenTransactionHistory';
import { hasOpReturn, isSlpTx } from './decodeRawSlpTransactions';

export const isNfyDividens = (vout: any) => {
  const scriptASMArray = bitcoin.script.toASM(Buffer.from(vout[0].scriptPubKey.hex, 'hex')).split(' ');
  const metaData =
    scriptASMArray.length > 1 ? Buffer.from(scriptASMArray[1], 'hex').toString('ascii').split(' ') : null;
  return scriptASMArray[0] === 'OP_RETURN' && metaData && metaData[1] && metaData[1].includes('MintDividend')
    ? decodeNfyDividensMetaData(metaData)
    : false;
};

const decodeNfyDividensMetaData = (metaData: any) => {
  return {
    tokenId: metaData[0],
    message: metaData.length > 2 ? metaData.slice(2, metaData.length).join(' ') : ''
  };
};

const getTransactionHistory = async (legacyAddress: string, tokens: any) => {
  try {
    const calculateTransactionBalance = (vout: any, vin: any) => {
      const isDividends = isNfyDividens(vout);
      if (isDividends) {
        if (vout.length > 2 && legacyAddress === vout[vout.length - 1].scriptPubKey.addresses[0]) {
          return {
            balance: (
              vout
                .slice(1, vout.length - 1)
                .map((element: any) => +element.value * Math.pow(10, 8))
                .reduce((a: number, b: number) => a + b, 0) *
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
                .reduce((a: number, b: number) => a + b, 0) * Math.pow(10, -8)
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
                .reduce((a: number, b: number) => a + b, 0) *
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
            .reduce((a: number, b: number) => +a + +b, 0);

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
                .reduce((a: number, b: number) => a + b, 0) *
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
                .reduce((a: number, b: number) => a + b, 0) * Math.pow(10, -8)
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
              vout.map((element: any) => +element.value * Math.pow(10, 8)).reduce((a: number, b: number) => a + b, 0) *
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

    const allTxs = await getAllTxs(legacyAddress);
    const transactionHistory = allTxs
      .filter((tx: any) => !isSlpTx(tx))
      .map((el: any) => ({
        txid: el.txid,
        date: new Date(el.time * 1000),
        confirmations: el.confirmations,
        transactionBalance: calculateTransactionBalance(el.vout, el.vin)
      }));

    return { nfyTransactions: transactionHistory };
  } catch (e) {
    console.log('error :', e);
    return [];
  }
};

export default getTransactionHistory;
