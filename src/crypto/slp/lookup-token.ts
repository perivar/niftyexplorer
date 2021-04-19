/*
  Get the token information based on the id.
*/

import CryptoUtil from '../util';

export async function lookupToken(tokenId: string, NETWORK = 'mainnet') {
  try {
    

    // network
    const slp = CryptoUtil.getSLP(NETWORK);

    // const properties = await slp.Utils.list(tokenId);
    // console.log(properties);
    // PIN: TODO - implement this?
    const properties = null;
    return properties;
  } catch (err) {
    console.error('Error in getTokenInfo: ', err);
    throw err;
  }
}
