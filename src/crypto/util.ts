/*
utility file for certain .js operations used in applications/wallet
*/

import * as bitcoin from 'bitcoinjs-lib';
import * as bip39 from 'bip39';
import * as bip32 from 'bip32';
import { Network } from 'bitcoinjs-lib';
import { toBitcoinJS } from './niftycoin/nfy';
import { NiftyCoinExplorer } from './NiftyCoinExplorer';
import { NiftyCoinElectrumX } from './NiftyCoinElectrumX';
import { CryptoLibConfig, SLP } from './lib/slp';

export interface WalletInfo {
  hdNodePath: string;
  segwitAddress: string;
  legacyAddress: string;
  mnemonic: string;

  // from original wallet interface
  privateKey: string;
  publicKey: string;
  privateKeyWIF: string;
}

export interface UTXOInfo {
  value: number; // in niftoshis
  tx_pos: number;
  tx_hash: string;
}

export interface TokenUTXOInfo extends UTXOInfo {
  txid: string;
  vout: any;
  transactionType: string;

  // token
  mintBatonVout: number | null;
  isValid: boolean | null;
  tokenType: string;
  utxoType: string;
  tokenQty: any; // number and string?
  tokenId: string;
  tokenTicker: string;
  tokenName: string;
  tokenDocumentUrl: string;
  tokenDocumentHash: string;
  decimals: number;
}

export interface SlpToken {
  tokenType: string;
  transactionType: string;
  tokenId: string;
}

export interface SlpTokenGenesis extends SlpToken {
  ticker: string;
  name: string;
  documentUri: string;
  documentHash: string;
  decimals: number;
  mintBatonVout: number | null;
  qty: string;
}

export interface SlpTokenMint extends SlpToken {
  mintBatonVout: number | null;
  qty: string;
}

export interface SlpTokenSend extends SlpToken {
  amounts: string;
}

export type SlpTokenData = SlpTokenGenesis | SlpTokenMint | SlpTokenSend;

export interface NFTGroupOpReturnConfig {
  documentHash?: string;
  mintBatonVout?: number | null;
  ticker: string;
  name: string;
  documentUrl: string;
  initialQty: number;
}

export interface SLPGenesisOpReturnConfig {
  documentHash?: string;
  mintBatonVout?: number | null;
  ticker: string;
  name: string;
  documentUrl: string;
  initialQty: number;
  decimals: number;
}

export interface NFTChildGenesisOpReturnConfig {
  documentHash?: string;
  ticker: string;
  name: string;
  documentUrl: string;
}

// see slp types here from https://github.com/simpleledger/slpjs/blob/master/lib/slp.ts

// displays link to either the nfy mainnet or tnfy testnet for transactions
function transactionStatus(txidStr: string, NETWORK = 'mainnet'): string {
  let link;
  if (NETWORK === `mainnet`) {
    link = `https://explorer.niftycoin.org/tx/${txidStr}`;
  } else {
    link = `https://testexplorer.niftycoin.org/tx/${txidStr}`;
  }
  console.log(link);
  return link;
}

// bchaddrjs-slp
// toLegacyAddress('qph5kuz78czq00e3t85ugpgd7xmer5kr7c5f6jdpwk') // 1B9UNtBfkkpgt8kVbwLN9ktE62QKnMbDzR
// toCashAddress('1B9UNtBfkkpgt8kVbwLN9ktE62QKnMbDzR') // bitcoincash:qph5kuz78czq00e3t85ugpgd7xmer5kr7c5f6jdpwk
// toSlpAddress('1B9UNtBfkkpgt8kVbwLN9ktE62QKnMbDzR') // simpleledger:qph5kuz78czq00e3t85ugpgd7xmer5kr7ccj3fcpsg

function toSegWitAddress(keyPair: any, network: any): string {
  const { address } = bitcoin.payments.p2sh({
    redeem: bitcoin.payments.p2wpkh({ pubkey: keyPair.publicKey, network }),
    network
  });
  return address ? address : '';
}

function toLegacyAddress(keyPair: any, network: any): string {
  const { address } = bitcoin.payments.p2pkh({ pubkey: keyPair.publicKey, network });
  return address ? address : '';
}

function toKeyPairFromWIF(privateKeyWIF: string, network: any): any {
  const keyPair = bitcoin.ECPair.fromWIF(privateKeyWIF, network);
  return keyPair;
}

function toPublicKey(keyPair: any): string {
  const publicKey = keyPair.publicKey.toString('hex');
  return publicKey ? publicKey : '';
}

function toPrivateKeyFromWIF(privateKeyWIF: string, network: any): string {
  const keyPair = toKeyPairFromWIF(privateKeyWIF, network);
  const privateKey = keyPair.privateKey.toString('hex');
  return privateKey ? privateKey : '';
}

// Usage:
// getByteCount({'MULTISIG-P2SH:2-4':45},{'P2PKH':1}) Means "45 inputs of P2SH Multisig and 1 output of P2PKH"
// getByteCount({'P2PKH':1,'MULTISIG-P2SH:2-3':2},{'P2PKH':2}) means "1 P2PKH input and 2 Multisig P2SH (2 of 3) inputs along with 2 P2PKH outputs"
function getByteCount(inputs: any, outputs: any): number {
  let totalWeight = 0;
  let hasWitness = false;
  let inputCount = 0;
  let outputCount = 0;

  // assumes compressed pubkeys in all cases.
  const types: any = {
    inputs: {
      'MULTISIG-P2SH': 49 * 4,
      'MULTISIG-P2WSH': 6 + 41 * 4,
      'MULTISIG-P2SH-P2WSH': 6 + 76 * 4,
      P2PKH: 148 * 4,
      P2WPKH: 108 + 41 * 4,
      'P2SH-P2WPKH': 108 + 64 * 4
    },
    outputs: {
      P2SH: 32 * 4,
      P2PKH: 34 * 4,
      P2WPKH: 31 * 4,
      P2WSH: 43 * 4
    }
  };

  function checkUInt53(n: number) {
    if (n < 0 || n > Number.MAX_SAFE_INTEGER || n % 1 !== 0) throw new RangeError('value out of range');
  }

  function varIntLength(number: number) {
    checkUInt53(number);
    return number < 0xfd ? 1 : number <= 0xffff ? 3 : number <= 0xffffffff ? 5 : 9;
  }

  Object.keys(inputs).forEach(function (key) {
    checkUInt53(inputs[key]);
    if (key.slice(0, 8) === 'MULTISIG') {
      // ex. "MULTISIG-P2SH:2-3" would mean 2 of 3 P2SH MULTISIG
      const keyParts = key.split(':');
      if (keyParts.length !== 2) throw new Error(`invalid input: ${key}`);
      const newKey = keyParts[0];
      const mAndN = keyParts[1].split('-').map(function (item) {
        return parseInt(item);
      });

      totalWeight += types.inputs[newKey] * inputs[key];
      const multiplyer = newKey === 'MULTISIG-P2SH' ? 4 : 1;
      totalWeight += (73 * mAndN[0] + 34 * mAndN[1]) * multiplyer * inputs[key];
    } else {
      totalWeight += types.inputs[key] * inputs[key];
    }
    inputCount += inputs[key];
    if (key.indexOf('W') >= 0) hasWitness = true;
  });

  Object.keys(outputs).forEach(function (key) {
    checkUInt53(outputs[key]);
    totalWeight += types.outputs[key] * outputs[key];
    outputCount += outputs[key];
  });

  if (hasWitness) totalWeight += 2;

  totalWeight += 8 * 4;
  totalWeight += varIntLength(inputCount) * 4;
  totalWeight += varIntLength(outputCount) * 4;

  return Math.ceil(totalWeight / 4);
}

function estimateFee(inputs: any, outputs: any): number {
  // read from environment, default to 1.2 nifthishis per byte
  const niftoshisPerByte = Number(process.env.REACT_APP_NIFTOSHIS_PER_BYTE_FEE) || 1.2;

  // estimate byte count to calculate fee. paying X sat/byte
  const byteCount = getByteCount(inputs, outputs);
  console.log(`Transaction byte count: ${byteCount}`);
  const txFee = Math.floor(niftoshisPerByte * byteCount);
  console.log(`Transaction fee: ${txFee}`);
  return txFee;
}

// Generate an external change address from a Mnemonic of a private key.
async function changeAddressFromMnemonic(mnemonic: string, network: Network) {
  const USE_BTC_ADDRESS_PATH = process.env.REACT_APP_USE_BTC_ADDRESS_PATH === 'true';

  // root seed buffer
  const rootSeed = await bip39.mnemonicToSeed(mnemonic); // creates seed buffer

  // master HDNode
  const masterHDNode = bip32.fromSeed(rootSeed, network);

  // HDNode of BIP44 account
  // Master List BIP 44 Coin Type: https://github.com/satoshilabs/slips/blob/master/slip-0044.md
  // 2	0x80000002	LTC	Litecoin
  // 145	0x80000091	BCH	Bitcoin Cash
  // 245	0x800000f5	SLP	Simple Ledger Protocol

  // BIP44 - Multi-account hierarchy for deterministic wallets
  // BIP44,  is based on BIP32. BIP44 dictates the derivation path:
  // m / purpose' / coin_type' / account' / change / address_index

  let account: any;
  if (USE_BTC_ADDRESS_PATH) {
    // the first wallet used for testing used a HD node path for BCH Bitcoin Cash
    account = masterHDNode.derivePath("m/44'/145'/0'");
  } else {
    account = masterHDNode.derivePath("m/44'/2'/0'");
  }

  // derive the first external HDNode address which is going to spend utxo
  const changeAddress = account.derivePath('0/0');
  return changeAddress;
}

// Returns the utxo with the biggest balance from an array of utxos.
function findBiggestUtxo(utxos: UTXOInfo[]): UTXOInfo {
  let largestAmount = 0;
  let largestIndex = 0;

  for (let i = 0; i < utxos.length; i++) {
    const thisUtxo = utxos[i];
    // console.log(`thisUTXO: ${JSON.stringify(thisUtxo, null, 2)}`);

    // TODO: Validate the UTXO data with the full node and check if it has been spent?

    if (thisUtxo.value > largestAmount) {
      largestAmount = thisUtxo.value;
      largestIndex = i;
    }
  }

  // lookup
  const found = utxos[largestIndex];
  return found;
}

// Returns true if user-provided cash address matches the correct network,
// mainnet or testnet. If NETWORK env var is not defined, it returns false.
// This prevent a common user-error issue that is easy to make: passing a
// testnet address into rest.niftycoin.org or passing a mainnet address into
// trest.niftycoin.org.
function validateNetwork(addr: string) {
  try {
    // const network = process.env.NETWORK;

    // Return false if NETWORK is not defined.
    // if (!network || network === '') {
    //   console.log('Warning: NETWORK environment variable is not defined!');
    //   return false;
    // }

    // // Convert the user-provided address to a cashaddress, for easy detection
    // // of the intended network.
    // const cashAddr = this.bchjs.Address.toCashAddress(addr);

    // // Return true if the network and address both match testnet
    // const addrIsTest = this.bchjs.Address.isTestnetAddress(cashAddr);
    // if (network === 'testnet' && addrIsTest) return true;

    // // Return true if the network and address both match mainnet
    // const addrIsMain = this.bchjs.Address.isMainnetAddress(cashAddr);
    // if (network === 'mainnet' && addrIsMain) return true;

    // disabled for now, TODO: PIN - fix
    return true;
    // return false;
  } catch (err) {
    console.log('Error in validateNetwork()');
    return false;
  }
}

// Error messages returned by a full node can be burried pretty deep inside the
// error object returned by Axios. This function attempts to extract and interpret
// error messages.
// Returns an object. If successful, obj.msg is a string.
// If there is a failure, obj.msg is false.
function decodeError(err: any) {
  try {
    // Attempt to extract the full node error message.
    if (err.response && err.response.data && err.response.data.error && err.response.data.error.message) {
      return { msg: err.response.data.error.message, status: 400 };
    }

    // Attempt to extract the Insight error message
    if (err.response && err.response.data) {
      return { msg: err.response.data, status: err.response.status };
    }

    // console.log(`err.message: ${err.message}`)
    // console.log(`err: `, err)

    // Attempt to detect a network connection error.
    if (err.message && err.message.indexOf('ENOTFOUND') > -1) {
      return {
        msg: 'Network error: Could not communicate with full node or other external service.',
        status: 503
      };
    }

    // Different kind of network error
    if (err.message && err.message.indexOf('ENETUNREACH') > -1) {
      return {
        msg: 'Network error: Could not communicate with full node or other external service.',
        status: 503
      };
    }

    // Different kind of network error
    if (err.message && err.message.indexOf('EAI_AGAIN') > -1) {
      return {
        msg: 'Network error: Could not communicate with full node or other external service.',
        status: 503
      };
    }

    // Axios timeout (aborted) error, or service is down (connection refused).
    if (err.code && (err.code === 'ECONNABORTED' || err.code === 'ECONNREFUSED')) {
      return {
        msg: 'Network error: Could not communicate with full node or other external service.',
        status: 503
      };
    }

    return { msg: false, status: 500 };
  } catch (err) {
    console.log('unhandled error in route-utils.js/decodeError(): ', err);
    return { msg: false, status: 500 };
  }
}

function getNetwork(NETWORK = 'mainnet') {
  // import networks
  const mainNet = toBitcoinJS(false);
  const testNet = toBitcoinJS(true);

  // set network
  let network: Network;
  if (NETWORK === 'mainnet') network = mainNet;
  else network = testNet;

  return network;
}

function getExplorer(NETWORK = 'mainnet') {
  const network = getNetwork(NETWORK);

  // REST API servers.
  const NFY_MAINNET = process.env.REACT_APP_EXPLORER_MAINNET;
  const NFY_TESTNET = process.env.REACT_APP_EXPLORER_TESTNET;

  if (!NFY_MAINNET || !NFY_TESTNET) {
    throw new Error('Missing API Server config: REACT_APP_EXPLORER_MAINNET or REACT_APP_EXPLORER_TESNET');
  }

  // Instantiate explorer based on the network.
  let explorer: NiftyCoinExplorer;
  if (NETWORK === 'mainnet') explorer = new NiftyCoinExplorer({ restURL: NFY_MAINNET, network });
  else explorer = new NiftyCoinExplorer({ restURL: NFY_TESTNET, network });

  return explorer;
}

function getElectrumX(NETWORK = 'mainnet') {
  const network = getNetwork(NETWORK);

  // REST API servers.
  const NFY_MAINNET = process.env.REACT_APP_ELECTRUMX_MAINNET;
  const NFY_TESTNET = process.env.REACT_APP_ELECTRUMX_TESTNET;

  if (!NFY_MAINNET || !NFY_TESTNET) {
    throw new Error('Missing API Server config: REACT_APP_ELECTRUMX_MAINNET or REACT_APP_ELECTRUMX_TESTNET');
  }

  let electrumx: NiftyCoinElectrumX;
  if (NETWORK === 'mainnet') electrumx = new NiftyCoinElectrumX({ restURL: NFY_MAINNET, network });
  else electrumx = new NiftyCoinElectrumX({ restURL: NFY_TESTNET, network });

  return electrumx;
}

function getSLP(NETWORK = 'mainnet') {
  // REST API servers.
  const NFY_MAINNET = process.env.REACT_APP_EXPLORER_MAINNET;
  const NFY_TESTNET = process.env.REACT_APP_EXPLORER_TESTNET;

  if (!NFY_MAINNET || !NFY_TESTNET) {
    throw new Error('Missing API Server config: REACT_APP_EXPLORER_MAINNET or REACT_APP_EXPLORER_TESNET');
  }

  const explorer = getExplorer(NETWORK);
  const electrumx = getElectrumX(NETWORK);

  const config: CryptoLibConfig = {
    restURL: NETWORK === 'mainnet' ? NFY_MAINNET : NFY_TESTNET,
    explorer,
    electrumx
  };
  const slp = new SLP(config);

  return slp;
}

function toNiftoshi(value: number): number {
  // needs to multiply with 100000000 to get niftoshis
  const niftoshis = Math.floor(value * 100000000);
  return niftoshis;
}

function toNiftyCoin(value: number): number {
  // needs to divide with 100000000 to get niftycoins
  const niftyCoins = value / 100000000;
  return niftyCoins;
}

const CryptoUtil = {
  transactionStatus,
  toSegWitAddress,
  toLegacyAddress,
  getByteCount,
  estimateFee,
  toNiftoshi,
  toNiftyCoin,
  changeAddressFromMnemonic,
  findBiggestUtxo,
  toPublicKey,
  toPrivateKeyFromWIF,
  toKeyPairFromWIF,
  validateNetwork,
  decodeError,
  getNetwork,
  getExplorer,
  getElectrumX,
  getSLP
};

export default CryptoUtil;
