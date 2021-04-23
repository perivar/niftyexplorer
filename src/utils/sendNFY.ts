const NETWORK = process.env.REACT_APP_NETWORK;

export const sendNFY = async (
  wallet: any,
  { addresses, values, encodedOpReturn }: any,
  callbackTxId: any
): Promise<string> => {
  return 'not implemented';
};

export const calcFee = (utxos: any) => {
  const txFee = 10;
  return txFee;
};
