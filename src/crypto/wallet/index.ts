import { getBalance } from './get-balance';
import { consolidateDust } from './consolidate-dust';
import { consolidateUtxos } from './consolidate-utxos';
import { createWallet } from './create-wallet';
import { listUtxos } from './list-utxos';
import { sendAll } from './send-all';
import { sendDust } from './send-dust';
import { sendNFY } from './send-nfy';
import { sendWIF } from './send-wif';
import { splitUtxo } from './split-utxo';

const CryptoWallet = {
  getBalance,
  consolidateDust,
  consolidateUtxos,
  createWallet,
  listUtxos,
  sendAll,
  sendDust,
  sendNFY,
  sendWIF,
  splitUtxo
};

export default CryptoWallet;
