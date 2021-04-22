import BigNumber from 'bignumber.js';

import CryptoUtil, { TokenUTXOInfo } from '../crypto/util';

export default async (addresses: any) => {
  const NETWORK = process.env.REACT_APP_NETWORK;
  const electrumx = CryptoUtil.getElectrumX(NETWORK);
  const slp = CryptoUtil.getSLP(NETWORK);

  // first get all utxo's
  const utxos = await electrumx.getUtxos(addresses);

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
      balance: new BigNumber(tokenUtxo.value).div(Math.pow(10, tokenUtxo.decimals)),
      hasBaton: !!tokenUtxo.mintBatonVout
    };
  });

  return { tokens, nonSlpUtxos, slpUtxos };
};
