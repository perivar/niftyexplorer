import * as bip32 from 'bip32';
import * as bip39 from 'bip39';
import CryptoUtil from '../crypto/util';

const getWalletDetails = async (wallet: any) => {
  const NETWORK = process.env.REACT_APP_NETWORK;
  const { mnemonic } = wallet;

  if (!mnemonic || mnemonic === '') {
    console.log('Error mnemonic is missing!');
    return undefined;
  }

  // network
  const network = CryptoUtil.getNetwork(NETWORK);

  // root seed buffer
  const rootSeed = await bip39.mnemonicToSeed(mnemonic); // creates seed buffer

  // master HDNode
  const masterHDNode = bip32.fromSeed(rootSeed, network);

  const segwitAddress = CryptoUtil.toSegWitAddress(masterHDNode, network);
  const legacyAddress = CryptoUtil.toLegacyAddress(masterHDNode, network);
  const privateKeyWIF = masterHDNode.toWIF();

  return {
    mnemonic,
    segwitAddress,
    legacyAddress,
    privateKeyWIF
  };
};

export default getWalletDetails;
