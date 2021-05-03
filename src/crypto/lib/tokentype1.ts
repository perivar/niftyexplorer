/* eslint-disable class-methods-use-this */
/*
  This library handles the OP_RETURN of SLP TokenType1 transactions.
*/

import axios from 'axios';
import { slpMdm } from './slp-mdm';
import { CryptoLibConfig } from './slp';
import { SLPGenesisOpReturnConfig, TokenUTXOInfo } from '../util';

let _this: any; // local global

export class TokenType1 {
  restURL: string;
  apiToken?: string;
  authToken?: string;

  axiosOptions: any;
  axios: any;

  constructor(config: CryptoLibConfig) {
    this.restURL = config.restURL;
    this.apiToken = config.apiToken;
    this.authToken = config.authToken;

    this.axios = axios;

    if (this.authToken) {
      // Add Basic Authentication token to the authorization header.
      this.axiosOptions = {
        headers: {
          authorization: this.authToken
        }
      };
    } else if (this.apiToken) {
      // Add JWT token to the authorization header.
      this.axiosOptions = {
        headers: {
          authorization: `Token ${this.apiToken}`
        }
      };
    } else {
      this.axiosOptions = {};
    }

    _this = this;
  }

  generateSendOpReturn(tokenUtxos: any, sendQty: number) {
    try {
      const { tokenId } = tokenUtxos[0];
      const { decimals } = tokenUtxos[0];

      const sendQtyBig = new slpMdm.BN(sendQty).times(10 ** decimals);

      // Calculate the total amount of tokens owned by the wallet.
      const totalTokens = tokenUtxos.reduce(
        (tot: any, txo: any) => tot.plus(new slpMdm.BN(txo.tokenQty).times(10 ** decimals)),
        new slpMdm.BN(0)
      );

      const change = totalTokens.minus(sendQtyBig);
      // console.log(`change: ${change}`)

      let script;
      let outputs = 1;

      // The normal case, when there is token change to return to sender.
      if (change > 0) {
        outputs = 2;

        // Convert the send quantity to the format expected by slp-mdm.
        const baseQty = sendQtyBig.toString();
        // console.log('baseQty: ', baseQty)

        // Convert the change quantity to the format expected by slp-mdm.
        const baseChange = change.toString();
        // console.log('baseChange: ', baseChange)

        // Check for potential burns
        const outputQty = new slpMdm.BN(baseChange).plus(new slpMdm.BN(baseQty));
        const inputQty = new slpMdm.BN(totalTokens);
        const tokenOutputDelta = outputQty.minus(inputQty).toString() !== '0';
        if (tokenOutputDelta) {
          throw new Error('Token transaction inputs do not match outputs, cannot send transaction');
        }

        // Generate the OP_RETURN as a Buffer.
        script = slpMdm.TokenType1.send(tokenId, [new slpMdm.BN(baseQty), new slpMdm.BN(baseChange)]);

        // Corner case, when there is no token change to send back.
      } else {
        const baseQty = sendQtyBig.toString();
        // console.log(`baseQty: `, baseQty)

        // Check for potential burns
        const noChangeOutputQty = new slpMdm.BN(baseQty);
        const noChangeInputQty = new slpMdm.BN(totalTokens);
        const tokenSingleOutputError = noChangeOutputQty.minus(noChangeInputQty).toString() !== '0';
        if (tokenSingleOutputError) {
          throw new Error('Token transaction inputs do not match outputs, cannot send transaction');
        }

        // Generate the OP_RETURN as a Buffer.
        script = slpMdm.TokenType1.send(tokenId, [new slpMdm.BN(baseQty)]);
      }

      return { script, outputs };
    } catch (err) {
      console.log('Error in generateSendOpReturn()');
      throw err;
    }
  }

  generateBurnOpReturn(tokenUtxos: TokenUTXOInfo[], burnQty: number) {
    try {
      const { tokenId } = tokenUtxos[0];
      const { decimals } = tokenUtxos[0];

      // Calculate the total amount of tokens owned by the wallet.
      let totalTokens = 0;
      for (let i = 0; i < tokenUtxos.length; i++) {
        const tokenQty = tokenUtxos[i].tokenQty ? tokenUtxos[i].tokenQty : 0;
        totalTokens += parseFloat(tokenQty);
      }

      // Make sure burn quantity isn't bigger than the total amount in tokens
      if (burnQty > totalTokens) {
        burnQty = totalTokens;
      }

      const remainder = totalTokens - burnQty;

      let baseQty = new slpMdm.BN(remainder).times(10 ** decimals);
      baseQty = baseQty.absoluteValue();
      // baseQty = Math.floor(baseQty);
      // baseQty = baseQty.toString();
      baseQty = baseQty.integerValue(slpMdm.BN.ROUND_FLOOR);

      // console.log(`baseQty: ${baseQty.toString()}`)

      // Generate the OP_RETURN as a Buffer.
      const script = slpMdm.TokenType1.send(tokenId, [new slpMdm.BN(baseQty)]);

      return script;
    } catch (err) {
      console.log('Error in generateBurnOpReturn()');
      throw err;
    }
  }

  generateGenesisOpReturn(configObj: SLPGenesisOpReturnConfig) {
    try {
      let baseQty = new slpMdm.BN(configObj.initialQty).times(10 ** configObj.decimals);
      baseQty = baseQty.absoluteValue();
      // baseQty = Math.floor(baseQty);
      // baseQty = baseQty.toString();
      baseQty = baseQty.integerValue(slpMdm.BN.ROUND_FLOOR);

      // Prevent error if user fails to add the document hash.
      if (!configObj.documentHash) configObj.documentHash = '';

      // If mint baton is not specified, then replace it with null.
      if (!configObj.mintBatonVout) configObj.mintBatonVout = null;

      const script = slpMdm.TokenType1.genesis(
        configObj.ticker,
        configObj.name,
        configObj.documentUrl,
        configObj.documentHash,
        configObj.decimals,
        configObj.mintBatonVout,
        new slpMdm.BN(baseQty)
      );

      return script;
    } catch (err) {
      console.log('Error in generateGenesisOpReturn()');
      throw err;
    }
  }

  // Expects tokenUtxos to be an array of UTXOs. Must contain a UTXO with the
  // minting baton.
  // mintQty is the number of new coins to mint.
  // destroyBaton is an option Boolean. If true, will destroy the baton. By
  // default it is false and will pass the baton.
  generateMintOpReturn(tokenUtxos: TokenUTXOInfo[], mintQty: number, destroyBaton = false) {
    try {
      // Throw error if input is not an array.
      if (!Array.isArray(tokenUtxos)) {
        throw new Error('tokenUtxos must be an array.');
      }

      // Loop through the tokenUtxos array and find the minting baton.
      let mintBatonUtxo;
      for (let i = 0; i < tokenUtxos.length; i++) {
        if (tokenUtxos[i].utxoType === 'minting-baton') {
          mintBatonUtxo = tokenUtxos[i];
        }
      }

      // Throw an error if the minting baton could not be found.
      if (!mintBatonUtxo) {
        throw new Error('Minting baton could not be found in tokenUtxos array.');
      }

      const { tokenId } = mintBatonUtxo;
      const { decimals } = mintBatonUtxo;

      if (!tokenId) {
        throw new Error('tokenId property not found in mint-baton UTXO.');
      }
      if (typeof decimals === 'undefined') {
        throw new Error('decimals property not found in mint-baton UTXO.');
      }

      let baseQty = new slpMdm.BN(mintQty).times(10 ** decimals);
      baseQty = baseQty.absoluteValue();
      // baseQty = Math.floor(baseQty);
      // baseQty = baseQty.toString();
      baseQty = baseQty.integerValue(slpMdm.BN.ROUND_FLOOR);

      // Signal that the baton should be passed or detroyed.
      let batonVout: number | null = 2;
      if (destroyBaton) batonVout = null;

      const script = slpMdm.TokenType1.mint(tokenId, batonVout, new slpMdm.BN(baseQty));

      return script;
    } catch (err) {
      console.log('Error in generateMintOpReturn()');
      throw err;
    }
  }

  /*
  async getHexOpReturn(tokenUtxos: any, sendQty: number) {
    try {
      // TODO: Add input filtering.

      const data = {
        tokenUtxos,
        sendQty
      };

      const result = await _this.axios.post(`${this.restURL}slp/generatesendopreturn`, data, _this.axiosOptions);

      const slpSendObj = result.data;

      // const script = _this.Buffer.from(slpSendObj.script)
      //
      // slpSendObj.script = script
      // return slpSendObj

      return slpSendObj;
    } catch (err) {
      console.log('Error in getHexOpReturn()');
      throw err;
    }
  }
	*/
}
