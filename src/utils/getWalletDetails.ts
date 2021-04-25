import CryptoUtil from '../crypto/util';

const getWalletDetails = async (wallet: any) => {
  const NETWORK = process.env.REACT_APP_NETWORK;
  const network = CryptoUtil.getNetwork(NETWORK);

  const { mnemonic } = wallet;

  if (!mnemonic || mnemonic === '') {
    console.log('Error mnemonic is missing!');
    return undefined;
  }

  const firstExternalAddress = await CryptoUtil.changeAddressFromMnemonic(mnemonic, network);

  const segwitAddress = CryptoUtil.toSegWitAddress(firstExternalAddress, network);
  const legacyAddress = CryptoUtil.toLegacyAddress(firstExternalAddress, network);
  const privateKeyWIF = firstExternalAddress.toWIF();

  return {
    mnemonic,
    segwitAddress,
    legacyAddress,
    privateKeyWIF
  };
};

export default getWalletDetails;
