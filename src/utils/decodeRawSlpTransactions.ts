// import chunk from 'lodash/chunk';
import BigNumber from 'bignumber.js';
import * as bitcoin from 'bitcoinjs-lib';
import CryptoUtil, { SlpTokenData } from '../crypto/util';

const NETWORK = process.env.REACT_APP_NETWORK;
// const electrumx = CryptoUtil.getElectrumX(NETWORK);
const slp = CryptoUtil.getSLP(NETWORK);

export const isSlpTx = (txDetail: any) => {
  const scriptASMArray = bitcoin.script.toASM(Buffer.from(txDetail.vout[0].scriptPubKey.hex, 'hex')).split(' ');
  if (
    scriptASMArray[0] !== 'OP_RETURN' ||
    scriptASMArray[1] !== '534c5000' ||
    (scriptASMArray[2] !== 'OP_1' && scriptASMArray[2] !== 'OP_1NEGATE' && scriptASMArray[2] !== '41')
  ) {
    return false;
  }

  return true;
};

export const hasOpReturn = (vout: any): boolean => {
  const scriptASMArray = bitcoin.script.toASM(Buffer.from(vout[0].scriptPubKey.hex, 'hex')).split(' ');
  return scriptASMArray[0] === 'OP_RETURN';
};

// method that checks whether the second element contains the text SLP
// if so it returns the actual metadata, otherwise false
export const checkSLPTransaction = (txDetails: any): boolean | SlpTokenData => {
  const { vout } = txDetails;
  const scriptASMArray = bitcoin.script.toASM(Buffer.from(vout[0].scriptPubKey.hex, 'hex')).split(' ');
  const metaData =
    scriptASMArray.length > 1 ? Buffer.from(scriptASMArray[1], 'hex').toString('ascii').split(' ') : null;
  return scriptASMArray[0] === 'OP_RETURN' && metaData && metaData[0] && metaData[0].includes('SLP')
    ? decodeSLPMetaData(txDetails)
    : false;
};

const decodeSLPMetaData = (txDetails: any): SlpTokenData => {
  return slp.Utils.decodeTxData(txDetails);
};

// generic method that decodes op return to ascii
export const decodeOpReturnToAscii = (vout: any): any => {
  const scriptASMArray = bitcoin.script.toASM(Buffer.from(vout[0].scriptPubKey.hex, 'hex')).split(' ');
  const decoded: any = [];
  if (scriptASMArray.length > 1) {
    scriptASMArray.map((asm: any) => {
      try {
        let ascii = Buffer.from(asm, 'hex').toString('ascii').trim();
        ascii = ascii.replace(/[^\x20-\x7E]+/g, '');
        if (ascii !== '') decoded.push(ascii);
      } catch (error) {
        // ignore
      }
    });
  }
  const metaData = decoded.join(' ');
  return scriptASMArray[0] === 'OP_RETURN' && metaData;
};

const decodeTokenDetails = (txDetail: any) => {
  const script = bitcoin.script.toASM(Buffer.from(txDetail.vout[0].scriptPubKey.hex, 'hex')).split(' ');

  const tokenDetails: any = {
    isSlpTxid: false,
    transactionType: '',
    info: {},
    outputs: [],
    symbol: ''
  };
  const isSlp = isSlpTx(txDetail);

  if (isSlp === true) {
    tokenDetails.isSlpTxid = true;
    tokenDetails.transactionType = Buffer.from(script[3], 'hex').toString('ascii').toUpperCase();

    if (tokenDetails.transactionType === 'GENESIS') {
      const decimals = script[8].startsWith('OP_') ? parseInt(script[8].slice(3), 10) : parseInt(script[8], 16);
      tokenDetails.info = {
        tokenId: txDetail.txid,
        symbol: Buffer.from(script[4], 'hex').toString('ascii'),
        name: Buffer.from(script[5], 'hex').toString('ascii'),
        decimals,
        documentUri: Buffer.from(script[6], 'hex').toString('ascii'),
        documentHash: script[7].startsWith('OP_0') ? '' : script[7]
      };
      tokenDetails.symbol = Buffer.from(script[4], 'hex').toString('ascii');
      tokenDetails.outputs = [
        {
          address: txDetail.vout[1].scriptPubKey.addresses[0],
          amount: new BigNumber(script[10], 16).div(Math.pow(10, decimals))
        }
      ];
    } else if (tokenDetails.transactionType === 'MINT') {
      tokenDetails.info = {
        tokenId: script[4]
      };
      tokenDetails.outputs = [
        {
          address: txDetail.vout[1].scriptPubKey.addresses[0],
          rawAmount: new BigNumber(script[6], 16)
        }
      ];
    } else if (tokenDetails.transactionType === 'SEND') {
      tokenDetails.info = {
        tokenId: script[4]
      };
      tokenDetails.outputs = script.slice(5, script.length).map((rawBalance, index) => ({
        address: txDetail.vout[index + 1].scriptPubKey.addresses[0],
        rawAmount: new BigNumber(rawBalance, 16)
      }));
    }
    return tokenDetails;
  }
  return false;
};

const handleTxs = async (txidDetails: any, tokenInfo: any) => {
  const slpTxidDetails: any = txidDetails
    .map((txDetail: any) => ({
      ...txDetail,
      tokenDetails: decodeTokenDetails(txDetail)
    }))
    .filter((detail: any) => detail.tokenDetails !== false);

  if (slpTxidDetails.lenght === 0) return [];
  if (tokenInfo === null || (tokenInfo || {}).tokenId === undefined) {
    // TODO: PIN - how to deal with a missing tokenInfo or tokenId  without the SLP DB?
    // for now - ignore
  }

  const decodedTxs = slpTxidDetails
    .filter((detail: any) => detail.tokenDetails.info.tokenId === tokenInfo.tokenId)
    .map((tokenTxDetail: any) => {
      if (tokenTxDetail.tokenDetails.transactionType !== 'GENESIS') {
        const { decimals, symbol } = tokenInfo;
        return {
          ...tokenTxDetail,
          tokenDetails: {
            ...tokenTxDetail.tokenDetails,
            symbol,
            info: { ...tokenTxDetail.tokenDetails.info, ...tokenInfo },
            outputs: tokenTxDetail.tokenDetails.outputs.map((output: any) => ({
              ...output,
              amount: output.rawAmount.div(Math.pow(10, decimals))
            }))
          }
        };
      }
      return tokenTxDetail;
    });
  return decodedTxs;
};

export const decodeRawSlpTransactionsByTxs = async (txs: any, tokenInfo = null) => {
  return await handleTxs(txs, tokenInfo);
};
