import * as bitcoin from 'bitcoinjs-lib';
import CryptoUtil, { SlpTokenData } from '../crypto/util';
import { getAllTransactionsHydrated } from './getTokenTransactionHistory';

const NETWORK = process.env.REACT_APP_NETWORK;
// const electrumx = CryptoUtil.getElectrumX(NETWORK);
const slp = CryptoUtil.getSLP(NETWORK);

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
        message: [isSLP.txType ?? '', isSLP.ticker ?? '', isSLP.name ?? '', isSLP.documentUri ?? ''].join(',')
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

  const metaData = decodeOpReturn(vout);

  return {
    balance: metaData ? { metaData } : null,
    type: 'Unknown'
  };
};

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

const hasOpReturn = (vout: any): boolean => {
  const scriptASMArray = bitcoin.script.toASM(Buffer.from(vout[0].scriptPubKey.hex, 'hex')).split(' ');
  return scriptASMArray[0] === 'OP_RETURN';
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

const getTransactionHistory = async (legacyAddress: string, tokens: any) => {
  try {
    const hydratedTransactions = await getAllTransactionsHydrated(legacyAddress);

    //  decode vout[] script
    const decodedTxs = hydratedTransactions.map((tx: any) => {
      try {
        return {
          txid: tx.txid,
          date: new Date(tx.time * 1000),
          time: tx.time,
          confirmations: tx.confirmations,
          transactionBalance: calculateTransactionBalance(tx, legacyAddress)
        };
      } catch (err) {
        console.log(err);
      }
    });

    return { nfyTransactions: decodedTxs };
  } catch (e) {
    console.log('error :', e);
    return [];
  }
};

export default getTransactionHistory;
