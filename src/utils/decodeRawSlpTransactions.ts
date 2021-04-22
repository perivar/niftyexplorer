import chunk from 'lodash/chunk';
import BigNumber from 'bignumber.js';
import * as bitcoin from 'bitcoinjs-lib';

export const isSlpTx = (txDetail: any) => {
  const scriptASMArray = bitcoin.script.toASM(Buffer.from(txDetail.vout[0].scriptPubKey.hex, 'hex')).split(' ');
  if (
    scriptASMArray[0] !== 'OP_RETURN' ||
    scriptASMArray[1] !== '534c5000' ||
    (scriptASMArray[2] !== '1' && scriptASMArray[2] !== 'OP_1NEGATE' && scriptASMArray[2] !== '41')
  ) {
    return false;
  }

  return true;
};

const revertChunk = (chunkedArray: any) =>
  chunkedArray.reduce((unchunkedArray: any, chunk: any) => [...unchunkedArray, ...chunk], []);

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
          // address: SLP.Address.toSLPAddress(txDetail.vout[1].scriptPubKey.addresses[0]),
          amount: new BigNumber(script[10], 16).div(Math.pow(10, decimals))
        }
      ];
    } else if (tokenDetails.transactionType === 'MINT') {
      tokenDetails.info = {
        tokenId: script[4]
      };
      tokenDetails.outputs = [
        {
          // address: SLP.Address.toSLPAddress(txDetail.vout[1].scriptPubKey.addresses[0]),
          rawAmount: new BigNumber(script[6], 16)
        }
      ];
    } else if (tokenDetails.transactionType === 'SEND') {
      tokenDetails.info = {
        tokenId: script[4]
      };
      tokenDetails.outputs = script.slice(5, script.length).map((rawBalance, index) => ({
        // address: SLP.Address.toSLPAddress(txDetail.vout[index + 1].scriptPubKey.addresses[0]),
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
    const tokenIdChunks = chunk(
      Array.from(new Set(slpTxidDetails.map((detail: any) => detail.tokenDetails.info.tokenId))),
      20
    );
    // const tokensInfo = revertChunk(
    //   await Promise.all(tokenIdChunks.map((tokenIdChunk) => SLP.Utils.tokenStats(tokenIdChunk)))
    // );
    const tokensInfo: any = [];

    return slpTxidDetails.map((detail: any) => {
      const tokenInfo = tokensInfo.find((info: any) => info.id === detail.tokenDetails.info.tokenId);
      if (detail.tokenDetails.transactionType !== 'GENESIS') {
        const { decimals, symbol } = tokenInfo;
        return {
          ...detail,
          tokenDetails: {
            ...detail.tokenDetails,
            symbol,
            info: { ...detail.tokenDetails.info, ...tokenInfo },
            outputs: detail.tokenDetails.outputs.map((output: any) => ({
              ...output,
              amount: output.rawAmount.div(Math.pow(10, decimals))
            }))
          }
        };
      }
      return detail;
    });
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

export const decodeRawSlpTrasactionsByTxids = async (txids: any, tokenInfo: any = null) => {
  const txidChunks = chunk(txids, 20);
  // const txidDetails = revertChunk(await Promise.all(txidChunks.map((txidChunk) => SLP.Transaction.details(txidChunk))));
  const txidDetails = {};
  return handleTxs(txidDetails, tokenInfo);
};

export const decodeRawSlpTransactionsByTxs = async (txs: any, tokenInfo = null) => await handleTxs(txs, tokenInfo);
