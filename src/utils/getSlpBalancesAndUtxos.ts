import BigNumber from 'bignumber.js';
import * as bitcoin from 'bitcoinjs-lib';
import CryptoUtil, { TokenUTXOInfo } from '../crypto/util';

const getSLPTxType = (scriptASMArray: any) => {
  if (scriptASMArray[0] !== 'OP_RETURN') {
    throw new Error('Not an OP_RETURN');
  }

  if (scriptASMArray[1] !== '534c5000') {
    throw new Error('Not a SLP OP_RETURN');
  }

  // any token version listed here will display in the portfolio
  if (
    scriptASMArray[2] !== 'OP_1' && // 0x01 = Fungible token
    scriptASMArray[2] !== 'OP_1NEGATE' && // 0x81 = NFT Group
    scriptASMArray[2] !== '41' // 0x41 = NFT Token
  ) {
    // NOTE: the lib converts hex 01 to OP_1 due to BIP62.3 enforcement
    throw new Error('Unknown token type');
  }

  const type = Buffer.from(scriptASMArray[3], 'hex').toString('ascii').toLowerCase();

  // this converts the ASM representation of the version field to a number
  const version = scriptASMArray[2] === 'OP_1' ? 0x01 : scriptASMArray[2] === '41' ? 0x41 : 0x81;

  return { txType: type, version };
};

const decodeTxOut = (txOut: any) => {
  const out = {
    tokenId: '',
    balance: new BigNumber(0, 16),
    hasBaton: false,
    version: 0
  };

  const vout = parseInt(txOut.vout, 10);

  const script = bitcoin.script.toASM(Buffer.from(txOut.tx.vout[0].scriptPubKey.hex, 'hex')).split(' ');
  const type = getSLPTxType(script);
  out.version = type.version;

  if (type.txType === 'genesis') {
    if (typeof script[9] === 'string' && script[9].startsWith('OP_')) {
      script[9] = parseInt(script[9].slice(3), 10).toString(16);
    }
    if ((script[9] === 'OP_2' && vout === 2) || parseInt(script[9], 16) === vout) {
      out.tokenId = txOut.txid;
      out.hasBaton = true;
      return out;
    }
    if (vout !== 1) {
      throw new Error('Not a SLP txout');
    }
    out.tokenId = txOut.txid;
    out.balance = new BigNumber(script[10], 16);
  } else if (type.txType === 'mint') {
    if (typeof script[5] === 'string' && script[5].startsWith('OP_')) {
      script[5] = parseInt(script[5].slice(3), 10).toString(16);
    }
    if ((script[5] === 'OP_2' && vout === 2) || parseInt(script[5], 16) === vout) {
      out.tokenId = script[4];
      out.hasBaton = true;
      return out;
    }

    if (txOut.vout !== 1) {
      throw new Error('Not a SLP txout');
    }
    out.tokenId = script[4];

    if (typeof script[6] === 'string' && script[6].startsWith('OP_')) {
      script[6] = parseInt(script[6].slice(3), 10).toString(16);
    }
    out.balance = new BigNumber(script[6], 16);
  } else if (type.txType === 'send') {
    if (script.length <= vout + 4) {
      throw new Error('Not a SLP txout');
    }

    out.tokenId = script[4];

    if (typeof script[vout + 4] === 'string' && script[vout + 4].startsWith('OP_')) {
      script[vout + 4] = parseInt(script[vout + 4].slice(3), 10).toString(16);
    }
    out.balance = new BigNumber(script[vout + 4], 16);
  } else {
    throw new Error('Invalid tx type');
  }

  return out;
};

const decodeTokenMetadata = (txDetails: any) => {
  const script = bitcoin.script.toASM(Buffer.from(txDetails.vout[0].scriptPubKey.hex, 'hex')).split(' ');

  const type = getSLPTxType(script);

  if (type.txType === 'genesis') {
    return {
      tokenId: txDetails.txid,
      symbol: Buffer.from(script[4], 'hex').toString('ascii'),
      name: Buffer.from(script[5], 'hex').toString('ascii'),
      decimals: script[8].startsWith('OP_') ? parseInt(script[8].slice(3), 10) : parseInt(script[8], 16),
      documentUri: Buffer.from(script[6], 'hex').toString('ascii'),
      documentHash: script[7].startsWith('OP_0') ? '' : script[7]
    };
  }
  throw new Error('Invalid tx type');
};

export default async (address: string) => {
  const NETWORK = process.env.REACT_APP_NETWORK;
  const electrumx = CryptoUtil.getElectrumX(NETWORK);
  const slp = CryptoUtil.getSLP(NETWORK);

  // first get all utxo's
  const utxos = await electrumx.getUtxos(address);

  // then identify the SLP token UTXOs.
  const tokenUtxos = await slp.Utils.tokenUtxoDetails(utxos);

  const nonSlpUtxos = tokenUtxos.filter((tokenUtxo: TokenUTXOInfo) => !tokenUtxo.isValid && tokenUtxo.value !== 546);
  const slpUtxos = tokenUtxos.filter((tokenUtxo: TokenUTXOInfo) => !!tokenUtxo.isValid);
  const tokens = slpUtxos.map((tokenUtxo) => {
    return {
      tokenId: tokenUtxo.tokenId,
      info: {
        tokenId: tokenUtxo.tokenId,
        symbol: tokenUtxo.tokenTicker,
        name: tokenUtxo.tokenName,
        decimals: tokenUtxo.decimals,
        documentUri: tokenUtxo.tokenDocumentUrl,
        documentHash: tokenUtxo.tokenDocumentHash
      },
      balance: tokenUtxo.tokenQty ? new BigNumber(tokenUtxo.tokenQty).div(Math.pow(10, tokenUtxo.decimals)) : 0,
      hasBaton: !!tokenUtxo.mintBatonVout || tokenUtxo.utxoType === 'minting-baton',
      version: tokenUtxo.tokenType,
      utxoType: tokenUtxo.utxoType,
      txid: tokenUtxo.txid,
      vout: tokenUtxo.vout
    };
  });

  // filter out tokens with balance === undefined
  // tokens = tokens.filter((token: any) => token.balance !== undefined);

  /*
  // Loop through each element in the array and validate the input before
  // further processing.
  utxos = slp.Utils.fixFields(utxos);

  // add tx details
  const utxoDetails = await Promise.all(
    utxos.map(async (tx: any) => {
      try {
        return await electrumx.getTransaction(tx.tx_hash);
      } catch (err) {
        return tx;
      }
    })
  );

  const tokensByTxId: any = {};
  utxos.forEach((utxo: any, i: number) => {
    utxo.tx = utxoDetails[i];
    try {
      utxo.slpData = decodeTxOut(utxo);
      let token = tokensByTxId[utxo.slpData.tokenId];
      if (token) {
        token.balance = token.balance.plus(utxo.slpData.balance);
        token.hasBaton = token.hasBaton || utxo.slpData.hasBaton;
      } else {
        // token = utxo.slpData;
        token = utxo;
        tokensByTxId[utxo.slpData.tokenId] = token;
      }
    } catch (error) {
      console.log(error);
    }
  });

  // fix token info and balance if needed
  let tokens = Object.values(tokensByTxId);
  tokens = tokens
    .filter((token: any, i: number) => {
      const { tx } = tokensByTxId[token.slpData.tokenId];
      try {
        token.slpData.info = decodeTokenMetadata(tx);
        token.slpData.balance = token.slpData.balance.div(Math.pow(10, token.slpData.info.decimals));
        return true;
      } catch (error) {
        console.log(error);
      }
      return false;
    })
    .sort((t1: any, t2: any) => t1.slpData.info.name.localeCompare(t2.slpData.info.name));

  tokens = tokens.map((token: any) => token.slpData);

  const nonSlpUtxos = utxos.filter((utxo: any) => !utxo.slpData && utxo.value !== 546);
  const slpUtxos = utxos.filter((utxo: any) => !!utxo.slpData);
*/

  return { tokens, nonSlpUtxos, slpUtxos };
};
