import CryptoSLP from '../crypto/slp';
import CryptoNFT from '../crypto/slp/nft';
import CryptoUtil, { NFTGroupOpReturnConfig, SLPGenesisOpReturnConfig } from '../crypto/util';

// network
const NETWORK = process.env.REACT_APP_NETWORK;
// const electrumx = CryptoUtil.getElectrumX(NETWORK);
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
          throw new Error('NFT token types are not yet supported.');
        case 0x81:
          type = type === 'SEND_SLP_TOKEN' ? 'SEND_NFT_GROUP_TOKEN' : '';
          break;
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
      (type === 'BURN_SLP_TOKEN' && 'IS_BURNING') ||
      (type === 'CREATE_NFT_GROUP_TOKEN' && 'IS_CREATING_NFT_GROUP') ||
      (type === 'SEND_NFT_GROUP_TOKEN' && 'IS_SENDING_NFT_GROUP');

    const config = args;
    config.nfyChangeReceiverAddress = wallet.legacyAddress;
    config.fundingWif = wallet.privateKeyWIF;
    config.fundingAddress = wallet.legacyAddress;

    let txidStr: string | undefined = '';

    switch (TRANSACTION_TYPE) {
      case 'IS_CREATING':
        config.tokenReceiverAddress = wallet.legacyAddress;
        config.batonReceiverAddress = config.fixedSupply === true ? null : wallet.legacyAddress;
        config.decimals = config.decimals || 0;
        config.documentUri = config.docUri;
        txidStr = await TokenType1create(wallet, config);
        break;
      case 'IS_MINTING':
        config.tokenReceiverAddress = wallet.legacyAddress;
        config.batonReceiverAddress = config.batonReceiverAddress || wallet.legacyAddress;
        txidStr = await TokenType1mint(wallet, config);
        break;
      case 'IS_SENDING':
        txidStr = await TokenType1send(wallet, config);
        break;
      case 'IS_BURNING':
        txidStr = await TokenType1burn(wallet, config);
        break;
      case 'IS_CREATING_NFT_GROUP':
        config.tokenReceiverAddress = wallet.legacyAddress;
        config.batonReceiverAddress = config.fixedSupply === true ? null : wallet.legacyAddress;
        config.documentUri = config.docUri;
        txidStr = await NFTcreateGroup(wallet, config);
        break;
      case 'IS_SENDING_NFT_GROUP':
        txidStr = await NFT1sendGroup(wallet, config);
        break;
      default:
        break;
    }

    // Broadcast transation to the network
    if (!txidStr || txidStr === '') {
      throw new Error('No transactions generated!');
    }

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
    mintBatonVout: config.fixedSupply === true ? null : 2 // the minting baton is always on vout 2
  };

  const txidStr = await CryptoSLP.createToken(
    wallet,
    config.tokenReceiverAddress,
    config.batonReceiverAddress,
    configObj,
    NETWORK
  );

  return txidStr;
};

const TokenType1mint = async (wallet: any, config: any): Promise<string | undefined> => {
  const txidStr = await CryptoSLP.mintToken(
    wallet,
    config.tokenId,
    config.amount,
    config.tokenReceiverAddress,
    config.batonReceiverAddress,
    NETWORK
  );

  return txidStr;
};

const TokenType1send = async (wallet: any, config: any): Promise<string | undefined> => {
  const txidStr = await CryptoSLP.sendToken(
    wallet,
    config.tokenId,
    config.amount,
    config.tokenReceiverAddress,
    NETWORK
  );
  return txidStr;
};

const TokenType1burn = async (wallet: any, config: any): Promise<string | undefined> => {
  const txidStr = await CryptoSLP.burnTokens(wallet, config.tokenId, config.amount, NETWORK);
  return txidStr;
};

const NFTcreateGroup = async (wallet: any, config: any): Promise<string | undefined> => {
  // Generate NFT config object
  const configObj: NFTGroupOpReturnConfig = {
    name: config.name,
    ticker: config.symbol,
    documentUrl: config.docUri,
    initialQty: Number(config.initialTokenQty),
    documentHash: config.documentHash,
    mintBatonVout: config.fixedSupply === true ? null : 2 // the minting baton is always on vout 2
  };

  const txidStr = await CryptoNFT.createNFTGroup(
    wallet,
    config.tokenReceiverAddress,
    config.batonReceiverAddress,
    configObj,
    NETWORK
  );

  return txidStr;
};

const NFT1sendGroup = async (wallet: any, config: any): Promise<string | undefined> => {
  // An initial preparation transaction is required before a new NFT can be created.
  // This ensures only 1 parent token is burned in the NFT Genesis transaction.

  const txidStr = await CryptoNFT.prepareNFTGroup(
    wallet,
    config.tokenId,
    Number(config.amount),
    config.tokenReceiverAddress,
    NETWORK
  );
  return txidStr;
};

export default broadcastTransaction;
