import CryptoSLP from '../crypto/slp';
import CryptoUtil, { SLPGenesisOpReturnConfig } from '../crypto/util';

// network
const NETWORK = process.env.REACT_APP_NETWORK;
const electrumx = CryptoUtil.getElectrumX(NETWORK);
// const { network } = electrumx;
// const slp = CryptoUtil.getSLP(NETWORK);

const broadcastTransaction = async (wallet: any, type: string, { ...args }) => {
  try {
    // check supported token versions
    if (args.version) {
      switch (args.version) {
        case 0x01:
          break;
        case 0x41:
        case 0x81:
          throw new Error('NFT token types are not yet supported.');
        default:
          throw new Error(`Token type ${args.version} is not supported.`);
      }
    }

    const TRANSACTION_TYPE =
      (type === 'CREATE_SLP_TOKEN' && 'IS_CREATING') ||
      (type === 'MINT_SLP_TOKEN' && 'IS_MINTING') ||
      (type === 'SEND_SLP_TOKEN' && 'IS_SENDING') ||
      (type === 'BURN_SLP_TOKEN_BALANCE' && 'IS_BURNING') ||
      (type === 'BURN_SLP_BATON' && 'IS_BURNING') ||
      (type === 'BURN_SLP_BATON_BALANCE' && 'IS_BURNING') ||
      (type === 'BURN_SLP_TOKEN' && 'IS_BURNING');

    const config = args;
    config.nfyChangeReceiverAddress = wallet.legacyAddress;
    config.fundingWif = wallet.privateKeyWIF;
    config.fundingAddress = wallet.legacyAddress;

    let hex: string | undefined = '';

    switch (TRANSACTION_TYPE) {
      case 'IS_CREATING':
        config.tokenReceiverAddress = wallet.legacyAddress;
        config.batonReceiverAddress = config.fixedSupply === true ? null : wallet.legacyAddress;
        config.decimals = config.decimals || 0;
        config.documentUri = config.docUri;
        hex = await TokenType1create(wallet, config);
        break;
      case 'IS_MINTING':
        config.tokenReceiverAddress = wallet.legacyAddress;
        config.batonReceiverAddress = config.batonReceiverAddress || wallet.legacyAddress;
        hex = await TokenType1mint(wallet, config);
        break;
      case 'IS_SENDING':
        hex = await TokenType1send(wallet, config);
        break;
      case 'IS_BURNING':
        hex = await TokenType1burn(wallet, config);
        break;
      default:
        break;
    }

    // Broadcast transation to the network
    if (!hex || hex === '') {
      throw new Error('No transactions generated!');
    }

    const txidStr = await electrumx.broadcast(hex);
    const link = CryptoUtil.transactionStatus(txidStr, NETWORK);
    return link;
  } catch (err) {
    const message = err.message || err.error || JSON.stringify(err);
    console.error(`Error in createToken: `, err);
    console.log(`Error message: ${message}`);
    throw err;
  }
};

const TokenType1create = async (wallet: any, config: any): Promise<string | undefined> => {
  // Generate SLP config object
  const configObj: SLPGenesisOpReturnConfig = {
    name: config.name,
    ticker: config.symbol,
    documentUrl: config.docUri,
    decimals: config.decimals,
    initialQty: config.initialTokenQty,
    documentHash: config.documentHash,
    mintBatonVout: 2 // the minting baton is always on vout 2
  };

  const hex = await CryptoSLP.createToken(
    wallet,
    config.tokenReceiverAddress,
    config.batonReceiverAddress,
    configObj,
    NETWORK
  );

  return hex;
};

const TokenType1mint = async (wallet: any, config: any): Promise<string | undefined> => {
  const hex = await CryptoSLP.mintToken(
    wallet,
    config.tokenId,
    config.amount,
    config.tokenReceiverAddress,
    config.batonReceiverAddress,
    NETWORK
  );

  return hex;
};

const TokenType1send = async (wallet: any, config: any): Promise<string | undefined> => {
  const hex = await CryptoSLP.sendToken(wallet, config.tokenId, config.amount, config.tokenReceiverAddress, NETWORK);
  return hex;
};

const TokenType1burn = async (wallet: any, config: any): Promise<string | undefined> => {
  const hex = await CryptoSLP.burnTokens(wallet, config.tokenId, config.amount, NETWORK);
  return hex;
};

export default broadcastTransaction;
