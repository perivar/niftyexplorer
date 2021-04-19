import { burnAll } from './burn-all';
import { burnTokens } from './burn-tokens';
import { getBalance } from './get-balance';
import { conversion } from './conversion';
import { createToken } from './create-token';
import { createWallet } from './create-wallet';
import { lookupToken } from './lookup-token';
import { mintToken } from './mint-token';
import { sendToken } from './send-token';

const CryptoSLP = {
  burnAll,
  burnTokens,
  getBalance,
  conversion,
  createToken,
  createWallet,
  lookupToken,
  mintToken,
  sendToken
};

export default CryptoSLP;
