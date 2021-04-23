/* eslint-disable class-methods-use-this */
/* eslint-disable no-useless-catch */

// Public npm libraries
import * as slpParser from 'slp-parser';
import * as slpValidator from 'slp-validate';
import BigNumber from 'bignumber.js';
import { UTXOInfo, TokenUTXOInfo, SlpTokenData, SlpTokenGenesis } from '../util';
import { CryptoLibConfig } from './slp';

import axios from 'axios'; // delete when everything is moved to explorer
import { NiftyCoinExplorer } from '../NiftyCoinExplorer';
import { NiftyCoinElectrumX } from '../NiftyCoinElectrumX';

let _this: any;

export class Utils {
  restURL: string;
  apiToken?: string;
  authToken?: string;

  slpParser: any;
  explorer: NiftyCoinExplorer;
  electrumx: NiftyCoinElectrumX;
  axios: any;
  whitelist: any;

  constructor(config: CryptoLibConfig) {
    this.restURL = config.restURL;
    this.apiToken = config.apiToken;
    this.authToken = config.authToken;
    this.explorer = config.explorer;
    this.electrumx = config.electrumx;

    this.slpParser = slpParser;
    this.axios = axios;

    _this = this;
    this.whitelist = [];
  }

  // hydrate tx with not validation,
  // like decodeOpReturn, except that the tx is hydrated with the slp data
  async hydrateTxNoValidation(txid: string): Promise<any> {
    let txDetails: any;
    try {
      // Validate the txid input.
      if (!txid || txid === '' || typeof txid !== 'string') {
        throw new Error('txid string must be included.');
      }

      txDetails = await _this.electrumx.getTransaction(txid);
      // console.log(`txDetails: ${JSON.stringify(txDetails, null, 2)}`)

      const tokenData = _this.decodeTxData(txDetails);
      return {
        ...txDetails,
        balance: tokenData.qty ? tokenData.qty : 0,
        detail: {
          ...tokenData,
          transactionType: tokenData.txType,
          symbol: tokenData.ticker ? tokenData.ticker : ''
        }
      };
    } catch (error) {
      console.log(error);
      return txDetails;
    }
  }

  // Reimplementation of decodeOpReturn() using slp-parser.
  async decodeOpReturn(txid: string, cache: any = null): Promise<SlpTokenData> {
    // The cache object is an in-memory cache (JS Object) that can be passed
    // into this function. It helps if multiple vouts from the same TXID are
    // being evaluated. In that case, it can significantly reduce the number
    // of API calls.
    // To use: add the output of this function to the cache object:
    // cache[txid] = returnValue
    // Then pass that cache object back into this function every time its called.
    if (cache) {
      if (!(cache instanceof Object)) {
        throw new Error('decodeOpReturn cache parameter must be Object');
      }

      const cachedVal = cache[txid];
      if (cachedVal) return cachedVal;
    }

    // console.log(`decodeOpReturn usrObj: ${JSON.stringify(usrObj, null, 2)}`)

    try {
      // Validate the txid input.
      if (!txid || txid === '' || typeof txid !== 'string') {
        throw new Error('txid string must be included.');
      }

      // const txDetails = await _this.explorer.txData(txid);
      const txDetails = await _this.electrumx.getTransaction(txid);
      // console.log(`txDetails: ${JSON.stringify(txDetails, null, 2)}`)

      const tokenData = _this.decodeTxData(txDetails);

      if (cache) cache[txid] = tokenData;

      return tokenData;
    } catch (error) {
      // Used for debugging
      // console.log('decodeOpReturn error: ', error)
      // console.log(`decodeOpReturn error.message: ${error.message}`)
      // if (error.response && error.response.data) {
      //   console.log(
      //     `decodeOpReturn error.response.data: ${JSON.stringify(
      //       error.response.data
      //     )}`
      //   )
      // }
      throw error;
    }
  }

  decodeTxData = (txDetails: any): SlpTokenData => {
    const { txid } = txDetails;

    // SLP spec expects OP_RETURN to be the first output of the transaction.
    const opReturn = txDetails.vout[0].scriptPubKey.hex;
    // console.log(`opReturn hex: ${opReturn}`)

    const parsedData = _this.slpParser.parseSLP(Buffer.from(opReturn, 'hex'));
    // console.log(`parsedData: ${JSON.stringify(parsedData, null, 2)}`)

    // Convert Buffer data to hex strings or utf8 strings.
    let tokenData: SlpTokenData = {} as SlpTokenData;
    if (parsedData.transactionType === 'SEND') {
      tokenData = {
        tokenType: parsedData.tokenType,
        txType: parsedData.transactionType,
        tokenId: parsedData.data.tokenId.toString('hex'),
        amounts: parsedData.data.amounts
      };
    } else if (parsedData.transactionType === 'GENESIS') {
      tokenData = {
        tokenType: parsedData.tokenType,
        txType: parsedData.transactionType,
        ticker: parsedData.data.ticker.toString(),
        name: parsedData.data.name.toString(),
        tokenId: txid,
        documentUri: parsedData.data.documentUri.toString(),
        documentHash: parsedData.data.documentHash.toString(),
        decimals: parsedData.data.decimals,
        mintBatonVout: parsedData.data.mintBatonVout,
        qty: parsedData.data.qty
      };
    } else if (parsedData.transactionType === 'MINT') {
      tokenData = {
        tokenType: parsedData.tokenType,
        txType: parsedData.transactionType,
        tokenId: parsedData.data.tokenId.toString('hex'),
        mintBatonVout: parsedData.data.mintBatonVout,
        qty: parsedData.data.qty
      };
    }
    // console.log(`tokenData: ${JSON.stringify(tokenData, null, 2)}`)
    return tokenData;
  };

  async tokenUtxoDetails(utxos: UTXOInfo[], usrObj = null, disableValidation = true): Promise<TokenUTXOInfo[]> {
    try {
      // Throw error if input is not an array.
      if (!Array.isArray(utxos)) throw new Error('Input must be an array.');

      // console.log(`tokenUtxoDetails usrObj: ${JSON.stringify(usrObj, null, 2)}`)

      // Loop through each element in the array and validate the input before
      // further processing.
      for (let i = 0; i < utxos.length; i++) {
        const utxo = utxos[i] as TokenUTXOInfo;

        // Ensure the UTXO has a txid or tx_hash property.
        if (!utxo.txid) {
          // If Electrumx, convert the tx_hash property to txid.
          if (utxo.tx_hash) {
            utxo.txid = utxo.tx_hash;
          } else {
            // If there is neither a txid or tx_hash property, throw an error.
            throw new Error(`utxo ${i} does not have a txid or tx_hash property.`);
          }
        }

        // Ensure the UTXO has a vout or tx_pos property.
        if (!Number.isInteger(utxo.vout)) {
          if (Number.isInteger(utxo.tx_pos)) {
            utxo.vout = utxo.tx_pos;
          } else {
            throw new Error(`utxo ${i} does not have a vout or tx_pos property.`);
          }
        }
      }

      // Hydrate each UTXO with data from SLP OP_REUTRNs.
      const outAry = await this._hydrateUtxo(utxos, usrObj);
      // console.log(`outAry: ${JSON.stringify(outAry, null, 2)}`)

      // *After* each UTXO has been hydrated with SLP data,
      for (let i = 0; i < outAry.length; i++) {
        const utxo = outAry[i];

        // *After* the UTXO has been hydrated with SLP data,
        if (utxo.tokenType) {
          // Only execute this code-path if the current UTXO has a 'tokenType'
          // property. i.e. it has been successfully hydrated with SLP
          // information.

          if (disableValidation) {
            utxo.isValid = true;
          } else {
            // validate using slp-validate
            const { txid } = utxo;
            const validator = new slpValidator.ValidatorType1({
              getRawTransaction: async (txid) => await _this.electrumx.getTransaction(txid, false)
            });
            // console.log('Validating:', txid);
            // console.log('This may take a several seconds...');
            const isValid = await validator.isValidSlpTxid({ txid });
            // console.log('Final Result:', isValid);

            utxo.isValid = isValid;
          }
        }
      }

      return outAry;
    } catch (error) {
      // console.log('Error in tokenUtxoDetails()')
      if (error.response && error.response.data) throw error.response.data;
      throw error;
    }
  }

  // delay in ms
  // use like this await delayMs(1000); //for 1 sec delay
  delayMs = (delay: number) => {
    return new Promise((res) => setTimeout(res, delay));
  };

  // This is a private function that is called by tokenUtxoDetails().
  // It loops through an array of UTXOs and tries to hydrate them with SLP
  // token information from the OP_RETURN data.
  //
  // This function makes several calls to decodeOpReturn() to retrieve SLP
  // token data. If that call throws an error due to hitting rate limits, this
  // function will not throw an error. Instead, it will mark the `isValid`
  // property as `null`
  //
  // Exception to the above: It *will* throw an error if decodeOpReturn() throws
  // an error while trying to get the Genesis transaction for a Send or Mint
  // transaction. However, that is a rare occurence since the cache of
  // decodeOpReturn() will minimize API calls for this case. This behavior
  // could be changed, but right now it's a corner case of a corner case.
  //
  // If the usrObj has a utxoDelay property, then it will delay the loop for
  // each UTXO by that many milliseconds.
  async _hydrateUtxo(utxos: UTXOInfo[], usrObj: any | null = null): Promise<TokenUTXOInfo[]> {
    try {
      const decodeOpReturnCache = {};

      // console.log(`_hydrateUtxo usrObj: ${JSON.stringify(usrObj, null, 2)}`)

      // Output Array
      const outAry: TokenUTXOInfo[] = [];

      // Loop through each utxo
      for (let i = 0; i < utxos.length; i++) {
        const utxo = utxos[i] as TokenUTXOInfo;

        // If the user passes in a delay, then wait.
        if (usrObj && usrObj.utxoDelay && !isNaN(Number(usrObj.utxoDelay))) {
          const delayMs = Number(usrObj.utxoDelay);
          await this.delayMs(delayMs);
        }

        // Get raw transaction data from the full node and attempt to decode
        // the OP_RETURN data.
        // If there is no OP_RETURN, mark the UTXO as false.
        let slpData: any = false;
        try {
          slpData = (await this.decodeOpReturn(utxo.txid, decodeOpReturnCache)) as SlpTokenData;
          // console.log(`slpData: ${JSON.stringify(slpData, null, 2)}`)
        } catch (err) {
          // console.log(
          //   `error in _hydrateUtxo() from decodeOpReturn(${utxo.txid}): `,
          //   err
          // )

          // An error will be thrown if the txid is not SLP.
          // If error is for some other reason, like a 429 error, mark utxo as 'null'
          // to display the unknown state.
          if (
            !err.message ||
            (err.message.indexOf('scriptpubkey not op_return') === -1 &&
              err.message.indexOf('lokad id') === -1 &&
              err.message.indexOf('trailing data') === -1)
          ) {
            // console.log(
            //   "unknown error from decodeOpReturn(). Marking as 'null'",
            //   err
            // )

            utxo.isValid = null;
            outAry.push(utxo);

            // If error is thrown because there is no OP_RETURN, then it's not
            // an SLP UTXO.
            // Mark as false and continue the loop.
          } else {
            // console.log('marking as invalid')
            utxo.isValid = false;
            outAry.push(utxo);
          }

          // Halt the execution of the loop and increase to the next index.
          continue;
        }
        // console.log(`slpData: ${JSON.stringify(slpData, null, 2)}`)

        const txType = slpData.txType.toLowerCase();

        // console.log(`utxo: ${JSON.stringify(utxo, null, 2)}`)

        // If there is an OP_RETURN, attempt to decode it.
        // Handle Genesis SLP transactions.
        if (txType === 'genesis') {
          if (
            utxo.vout !== slpData.mintBatonVout && // UTXO is not a mint baton output.
            utxo.vout !== 1 // UTXO is not the reciever of the genesis or mint tokens.
          ) {
            // Can safely be marked as false.
            utxo.isValid = false;
            outAry[i] = utxo;
          } else {
            // If this is a valid SLP UTXO, then return the decoded OP_RETURN data.
            // Minting Baton
            if (utxo.vout === slpData.mintBatonVout) {
              utxo.utxoType = 'minting-baton';
            } else {
              // Tokens
              utxo.utxoType = 'token';
              utxo.tokenQty = new BigNumber(slpData.qty).div(Math.pow(10, slpData.decimals)).toString();
            }

            utxo.tokenId = utxo.txid;
            utxo.tokenTicker = slpData.ticker;
            utxo.tokenName = slpData.name;
            utxo.tokenDocumentUrl = slpData.documentUri;
            utxo.tokenDocumentHash = slpData.documentHash;
            utxo.decimals = slpData.decimals;
            utxo.tokenType = slpData.tokenType;

            // Initial value is null until UTXO can be validated and confirmed
            // to be valid (true) or not (false).
            utxo.isValid = null;

            outAry[i] = utxo;
          }
        }

        // Handle Mint SLP transactions.
        if (txType === 'mint') {
          if (
            utxo.vout !== slpData.mintBatonVout && // UTXO is not a mint baton output.
            utxo.vout !== 1 // UTXO is not the reciever of the genesis or mint tokens.
          ) {
            // Can safely be marked as false.
            utxo.isValid = false;

            outAry[i] = utxo;
          } else {
            // If UTXO passes validation, then return formatted token data.

            const genesisData = (await this.decodeOpReturn(slpData.tokenId, decodeOpReturnCache)) as SlpTokenGenesis;
            // console.log(`genesisData: ${JSON.stringify(genesisData, null, 2)}`)

            // Minting Baton
            if (utxo.vout === slpData.mintBatonVout) {
              utxo.utxoType = 'minting-baton';
            } else {
              // Tokens
              utxo.utxoType = 'token';
              utxo.tokenQty = new BigNumber(slpData.qty).div(Math.pow(10, genesisData.decimals)).toString();
            }

            // Hydrate the UTXO object with information about the SLP token.
            utxo.transactionType = 'mint';
            utxo.tokenId = slpData.tokenId;
            utxo.tokenType = slpData.tokenType;

            utxo.tokenTicker = genesisData.ticker;
            utxo.tokenName = genesisData.name;
            utxo.tokenDocumentUrl = genesisData.documentUri;
            utxo.tokenDocumentHash = genesisData.documentHash;
            utxo.decimals = genesisData.decimals;

            utxo.mintBatonVout = slpData.mintBatonVout;

            // Initial value is null until UTXO can be validated and confirmed
            // to be valid (true) or not (false).
            utxo.isValid = null;

            outAry[i] = utxo;
          }
        }

        // Handle Send SLP transactions.
        if (txType === 'send') {
          // Filter out any vouts that match.
          // const voutMatch = slpData.spendData.filter(x => utxo.vout === x.vout)
          // console.log(`voutMatch: ${JSON.stringify(voutMatch, null, 2)}`)

          // Figure out what token quantity is represented by this utxo.
          const tokenQty = slpData.amounts[utxo.vout - 1];
          // console.log('tokenQty: ', tokenQty)

          if (!tokenQty) {
            utxo.isValid = false;

            outAry[i] = utxo;
          } else {
            // If UTXO passes validation, then return formatted token data.

            const genesisData = (await this.decodeOpReturn(slpData.tokenId, decodeOpReturnCache)) as SlpTokenGenesis;
            // console.log(`genesisData: ${JSON.stringify(genesisData, null, 2)}`)

            // console.log(`utxo: ${JSON.stringify(utxo, null, 2)}`)

            // Hydrate the UTXO object with information about the SLP token.
            utxo.utxoType = 'token';
            utxo.transactionType = 'send';
            utxo.tokenId = slpData.tokenId;
            utxo.tokenTicker = genesisData.ticker;
            utxo.tokenName = genesisData.name;
            utxo.tokenDocumentUrl = genesisData.documentUri;
            utxo.tokenDocumentHash = genesisData.documentHash;
            utxo.decimals = genesisData.decimals;
            utxo.tokenType = slpData.tokenType;

            // Initial value is null until UTXO can be validated and confirmed
            // to be valid (true) or not (false).
            utxo.isValid = null;

            // Calculate the real token quantity.
            const tokenQtyBig = new BigNumber(tokenQty).div(Math.pow(10, genesisData.decimals));
            // console.log(`tokenQtyBig`, tokenQtyBig.toString())
            utxo.tokenQty = tokenQtyBig.toString();

            // console.log(`utxo: ${JSON.stringify(utxo, null, 2)}`)
            outAry[i] = utxo;
          }
        }
      }

      return outAry;
    } catch (error) {
      // console.log('_hydrateUtxo error: ', error)
      throw error;
    }
  }
}
