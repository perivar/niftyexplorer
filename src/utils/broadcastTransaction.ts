import { from, Observable, of, range, throwError } from 'rxjs';
import { concatMap, retryWhen, delay, mergeMap, catchError, tap, repeat } from 'rxjs/operators';
import CryptoSLP from '../crypto/slp';
import CryptoNFT from '../crypto/slp/nft';
import CryptoUtil, {
  NFTChildGenesisOpReturnConfig,
  NFTGroupOpReturnConfig,
  SLPGenesisOpReturnConfig
} from '../crypto/util';

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
        case 0x81:
        case 0x91:
          switch (type) {
            case 'SEND_SLP_TOKEN':
            case 'SEND_NFT_TOKEN':
              type = 'SEND_NFT_GROUP_TOKEN';
              break;
            case 'MINT_SLP_TOKEN':
              type = 'MINT_NFT_GROUP_TOKEN';
              break;
            case 'CREATE_NFT_CHILD_TOKEN':
            case 'PREPARE_NFT_GROUP_TOKEN':
            case 'BURN_SLP_TOKEN_BALANCE':
            case 'BURN_SLP_BATON':
            case 'BURN_SLP_BATON_BALANCE':
            case 'BURN_SLP_TOKEN':
              break;
            default:
              throw new Error(`Token version '${args.version}' with type '${type}' is not supported.`);
          }
          break;
        case 0x41:
        case 0x51:
          switch (type) {
            case 'SEND_SLP_TOKEN':
            case 'SEND_NFT_TOKEN':
              type = 'SEND_NFT_CHILD_TOKEN';
              break;
            case 'BURN_SLP_TOKEN_BALANCE':
            case 'BURN_SLP_BATON':
            case 'BURN_SLP_BATON_BALANCE':
            case 'BURN_SLP_TOKEN':
              break;
            default:
              throw new Error(`Token version '${args.version}' with type '${type}' is not supported.`);
          }
          break;
        default:
          throw new Error(`Token version '${args.version}' with type '${type}' is not supported.`);
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
      (type === 'CREATE_NFT_BATCH' && 'IS_CREATING_NFT_BATCH') ||
      (type === 'CREATE_NFT_GROUP_TOKEN' && 'IS_CREATING_NFT_GROUP') ||
      (type === 'PREPARE_NFT_GROUP_TOKEN' && 'IS_PREPARING_NFT_GROUP') ||
      (type === 'CREATE_NFT_CHILD_TOKEN' && 'IS_CREATING_NFT_CHILD') ||
      (type === 'SEND_NFT_GROUP_TOKEN' && 'IS_SENDING_NFT_GROUP') ||
      (type === 'SEND_NFT_CHILD_TOKEN' && 'IS_SENDING_NFT_CHILD') ||
      (type === 'MINT_NFT_GROUP_TOKEN' && 'IS_MINTING_NFT_GROUP');

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
      case 'IS_CREATING_NFT_BATCH':
        config.tokenReceiverAddress = wallet.legacyAddress;
        config.batonReceiverAddress = config.fixedSupply === true ? null : wallet.legacyAddress;
        config.documentUri = config.docUri;
        txidStr = await NFTcreateBatch(wallet, config);
        break;
      case 'IS_CREATING_NFT_GROUP':
        config.tokenReceiverAddress = wallet.legacyAddress;
        config.batonReceiverAddress = config.fixedSupply === true ? null : wallet.legacyAddress;
        config.documentUri = config.docUri;
        txidStr = await NFTcreateGroup(wallet, config);
        break;
      case 'IS_PREPARING_NFT_GROUP':
        txidStr = await NFTsplitGroup(wallet, config);
        break;
      case 'IS_CREATING_NFT_CHILD':
        config.tokenReceiverAddress = wallet.legacyAddress;
        config.batonReceiverAddress = config.fixedSupply === true ? null : wallet.legacyAddress;
        config.documentUri = config.docUri;
        txidStr = await NFTcreateChild(wallet, config);
        break;
      case 'IS_SENDING_NFT_GROUP':
        txidStr = await NFTsendGroup(wallet, config);
        break;
      case 'IS_SENDING_NFT_CHILD':
        txidStr = await NFTsendChild(wallet, config);
        break;
      case 'IS_MINTING_NFT_GROUP':
        config.tokenReceiverAddress = wallet.legacyAddress;
        config.batonReceiverAddress = config.batonReceiverAddress || wallet.legacyAddress;
        txidStr = await NFTmintGroup(wallet, config);
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
    config.additionalTokenQty,
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
  if (config.burnBaton) {
    const txidStr = await CryptoSLP.burnMintBaton(wallet, config.tokenId, NETWORK);
    return txidStr;
  }
  const txidStr = await CryptoSLP.burnTokens(wallet, config.tokenId, config.amount, NETWORK);
  return txidStr;
};

const delayedRetry = (delayMs: number, maxRetry: number) => {
  let retries = maxRetry;

  return (src: Observable<any>) =>
    src.pipe(
      retryWhen((errors: Observable<any>) =>
        errors.pipe(
          delay(delayMs),
          mergeMap((error) => (retries-- > 0 ? of(error) : throwError('Retrying...')))
        )
      )
    );
};

const NFTcreateBatch = async (wallet: any, config: any): Promise<string | undefined> => {
  // Generate NFT group config object
  const configGroupObj: NFTGroupOpReturnConfig = {
    name: config.name,
    ticker: config.symbol,
    documentUrl: config.docUri,
    initialQty: Number(config.initialTokenQty),
    documentHash: config.documentHash,
    mintBatonVout: config.fixedSupply === true ? null : 2 // the minting baton is always on vout 2
  };

  config.tokenId = await CryptoNFT.createNFTGroup(
    wallet,
    config.tokenReceiverAddress,
    config.batonReceiverAddress,
    configGroupObj,
    NETWORK
  );
  console.log(`Created nft group tx: ${config.tokenId}`);

  // split 18 at a time
  const splitTxId = await CryptoNFT.splitNFTGroup(
    wallet,
    config.tokenId,
    Number(config.initialTokenQty),
    config.tokenReceiverAddress,
    NETWORK
  );
  console.log(`Split nft group tx: ${splitTxId}`);

  // Generate NFT child config object
  const configObjChild: NFTChildGenesisOpReturnConfig = {
    name: config.name,
    ticker: config.symbol,
    documentUrl: config.docUri
  };

  // if more than 18 ignore, since we havent' split more than 18
  let toMintCount = Number(config.initialTokenQty);
  if (toMintCount > 18) {
    toMintCount = 18;
  }
  const childTxIds: string[] = [];
  for (let i = 0; i < toMintCount; i++) {
    const childTxId = await CryptoNFT.createNFTChild(wallet, config.tokenId, configObjChild, NETWORK);
    childTxIds.push(childTxId);
    console.log(`Created nft child: ${childTxIds[i]}`);
  }

  return config.tokenId;
};

const NFTcreateBatchRXJS = async (wallet: any, config: any): Promise<string | undefined> => {
  // Generate NFT group config object
  const configGroupObj: NFTGroupOpReturnConfig = {
    name: config.name,
    ticker: config.symbol,
    documentUrl: config.docUri,
    initialQty: Number(config.initialTokenQty),
    documentHash: config.documentHash,
    mintBatonVout: config.fixedSupply === true ? null : 2 // the minting baton is always on vout 2
  };

  return new Promise((resolve, reject) => {
    of(config)
      .pipe(
        concatMap(() => {
          return CryptoNFT.createNFTGroup(
            wallet,
            config.tokenReceiverAddress,
            config.batonReceiverAddress,
            configGroupObj,
            NETWORK
          );
        }),
        tap((res: any) => console.log(`1: ${res}`)),
        // delayedRetry(10000, 4),
        concatMap((txidStr: string) => {
          // set token id
          config.tokenId = txidStr;
          return CryptoNFT.splitNFTGroup(
            wallet,
            config.tokenId,
            Number(config.initialTokenQty),
            config.tokenReceiverAddress,
            NETWORK
          );
        }),
        tap((res: any) => console.log(`2: ${res}`)),
        concatMap(() => {
          // Generate NFT child config object
          const configObjChild: NFTChildGenesisOpReturnConfig = {
            name: config.name,
            ticker: config.symbol,
            documentUrl: config.docUri
          };
          return CryptoNFT.createNFTChild(wallet, config.tokenId, configObjChild, NETWORK);
        }),
        tap((res: any) => console.log(`3: ${res}`)),
        catchError((err) => throwError(err))
      )
      .subscribe(
        (success: any) => {
          console.log(success);
          resolve(config.tokenId);
          /* display success msg */
        },
        (errorData: any) => {
          /* display error msg */
          console.log(errorData);
          reject(Error(errorData));
        }
      );
  });
};

const NFTcreateGroup = async (wallet: any, config: any): Promise<string | undefined> => {
  // Generate NFT group config object
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

const NFTsplitGroup = async (wallet: any, config: any): Promise<string | undefined> => {
  // An initial preparation transaction is required before a new NFT can be created.
  // This ensures only 1 parent token is burned in the NFT Genesis transaction.

  const txidStr = await CryptoNFT.splitNFTGroup(
    wallet,
    config.tokenId,
    Number(config.amount),
    config.tokenReceiverAddress,
    NETWORK
  );
  return txidStr;
};

const NFTcreateChild = async (wallet: any, config: any): Promise<string | undefined> => {
  // Generate NFT child config object
  const configObjChild: NFTChildGenesisOpReturnConfig = {
    name: config.name,
    ticker: config.symbol,
    documentUrl: config.docUri
  };

  const txidStr = await CryptoNFT.createNFTChild(wallet, config.tokenId, configObjChild, NETWORK);

  return txidStr;
};

const NFTmintGroup = async (wallet: any, config: any): Promise<string | undefined> => {
  const txidStr = await CryptoNFT.mintNFTGroup(
    wallet,
    config.tokenId,
    config.additionalTokenQty,
    config.tokenReceiverAddress,
    config.batonReceiverAddress,
    NETWORK
  );

  return txidStr;
};

const NFTsendGroup = async (wallet: any, config: any): Promise<string | undefined> => {
  const txidStr = await CryptoNFT.sendChildToken(
    wallet,
    config.tokenId,
    config.amount,
    config.tokenReceiverAddress,
    NETWORK
  );
  return txidStr;
};

const NFTsendChild = async (wallet: any, config: any): Promise<string | undefined> => {
  const txidStr = await CryptoNFT.sendChildToken(
    wallet,
    config.tokenId,
    config.amount,
    config.tokenReceiverAddress,
    NETWORK
  );
  return txidStr;
};

export default broadcastTransaction;
