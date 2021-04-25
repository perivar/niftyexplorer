/* eslint-disable class-methods-use-this */
/*
  This library interacts with the NiftyCoin ElectrumX REST API endpoints
*/
// Public npm libraries
import * as bitcoin from 'bitcoinjs-lib';
import axios, { AxiosRequestConfig } from 'axios';
import CryptoUtil, { UTXOInfo } from './util';

import { Network } from 'bitcoinjs-lib';

let _this: NiftyCoinElectrumX;

export class NiftyCoinElectrumX {
  restURL: string;
  apiToken: string;
  authToken: string;
  axiosOptions: AxiosRequestConfig;
  network: Network;

  constructor(config: any) {
    this.restURL = config.restURL;
    this.apiToken = config.apiToken;
    this.authToken = config.authToken;
    this.network = config.network;

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

  async electrumxRequest(method: string, ...params: any[]) {
    try {
      const paramQuery = params
        .map((param: string) => {
          return `&params[]=${param}`;
        })
        .join('');

      const url = `${_this.restURL}?method=${method}${paramQuery}`;
      const response = await axios.get(url, _this.axiosOptions);
      return response.data;
    } catch (error) {
      if (error.response && error.response.data) throw error.response.data;
      else throw error;
    }
  }

  // DRY error handler.
  errorHandler(err: any) {
    // Attempt to decode the error message.
    const { msg, status } = CryptoUtil.decodeError(err);
    return `${status}: ${msg}`;
  }

  // Returns a promise that resolves to UTXO data for an address. Expects input
  // to be a cash address, and input validation to have already been done by
  // parent, calling function.
  async _utxosFromElectrumx(address: string) {
    try {
      // Convert the address to a scripthash.
      const scripthash = _this.addressToScripthash(address);

      // Query the utxos from the ElectrumX server.
      const electrumResponse = await _this.electrumxRequest('blockchain.scripthash.listunspent', scripthash);
      // console.log(`electrumResponse: ${JSON.stringify(electrumResponse, null, 2)}`);

      return electrumResponse;
    } catch (err) {
      console.log('err: ', err);
      throw err;
    }
  }

  // handler for single balance
  async getUtxos(address: string): Promise<UTXOInfo[]> {
    try {
      // Reject if address is an array.
      if (Array.isArray(address)) {
        throw new Error('address can not be an array. Use for bulk upload.');
      }

      // Prevent a common user error. Ensure they are using the correct network address.
      const networkIsValid = CryptoUtil.validateNetwork(address);
      if (!networkIsValid) {
        throw new Error('Invalid network. Trying to use a testnet address on mainnet, or vice versa.');
      }

      // console.log('Executing electrumx/getUtxos with this address: ', address);

      // data from ElectrumX server.
      const electrumResponse = await _this._utxosFromElectrumx(address);
      // console.log(`_utxosFromElectrumx(): ${JSON.stringify(electrumResponse, null, 2)}`)

      // Pass the error message if ElectrumX reports an error.
      if (Object.prototype.hasOwnProperty.call(electrumResponse, 'code')) {
        throw new Error(electrumResponse.message);
      }

      return electrumResponse.result;
    } catch (err) {
      // Write out error to error log.
      console.log('Error in elecrumx.js/getUtxos().', err);

      throw new Error(_this.errorHandler(err));
    }
  }

  // handler for bulk queries on address details
  async utxosBulk(addresses: string[]) {
    try {
      // Reject if addresses is not an array.
      if (!Array.isArray(addresses)) {
        throw new Error('addresses needs to be an array. Use for single address.');
      }

      // console.log('Executing electrumx.js/utxoBulk with these addresses: ', addresses);

      // Validate each element in the address array.
      for (let i = 0; i < addresses.length; i++) {
        const thisAddress = addresses[i];

        // Prevent a common user error. Ensure they are using the correct network address.
        const networkIsValid = CryptoUtil.validateNetwork(thisAddress);
        if (!networkIsValid) {
          throw new Error(
            `Invalid network for address ${thisAddress}. Trying to use a testnet address on mainnet, or vice versa.`
          );
        }
      }

      // Loops through each address and creates an array of Promises, querying
      // Insight API in parallel.
      const addressesPromise = addresses.map(async (address) => {
        // console.log(`address: ${address}`)
        const utxos = await _this._utxosFromElectrumx(address);

        return {
          utxos,
          address
        };
      });

      // Wait for all parallel Insight requests to return.
      const result = await Promise.all(addressesPromise);

      // Return the array of retrieved address information.
      return result;
    } catch (err) {
      console.log('Error in electrumx.js/utxoBulk().', err);

      throw new Error(_this.errorHandler(err));
    }
  }

  // Returns a promise that resolves to a balance for an address. Expects input
  // to be a cash address, and input validation to have already been done by
  // parent, calling function.
  async _balanceFromElectrumx(address: string) {
    try {
      // Convert the address to a scripthash.
      const scripthash = _this.addressToScripthash(address);

      // Query the address balance from the ElectrumX server.
      const electrumResponse = await _this.electrumxRequest('blockchain.scripthash.get_balance', scripthash);
      // console.log(`electrumResponse: ${JSON.stringify(electrumResponse, null, 2)}`);

      return electrumResponse;
    } catch (err) {
      // console.log('err1: ', err)

      // Write out error to error log.
      console.log('Error in elecrumx.js/_utxosFromElectrumx(): ', err);
      throw err;
    }
  }

  // handler for single balance
  async getBalance(address: string) {
    try {
      // Reject if address is an array.
      if (Array.isArray(address)) {
        throw new Error('address can not be an array. Use for bulk upload.');
      }

      // Prevent a common user error. Ensure they are using the correct network address.
      const networkIsValid = CryptoUtil.validateNetwork(address);
      if (!networkIsValid) {
        throw new Error('Invalid network. Trying to use a testnet address on mainnet, or vice versa.');
      }

      // console.log('Executing electrumx/getBalance with this address: ', address);

      // data from ElectrumX server.
      const electrumResponse = await _this._balanceFromElectrumx(address);
      // console.log(`_utxosFromElectrumx(): ${JSON.stringify(electrumResponse, null, 2)}`)

      // Pass the error message if ElectrumX reports an error.
      if (Object.prototype.hasOwnProperty.call(electrumResponse, 'code')) {
        throw new Error(electrumResponse.message);
      }

      // return the sum of confirmed and unconfirmed
      const sum = electrumResponse.result.confirmed + electrumResponse.result.unconfirmed;
      return sum;
    } catch (err) {
      // Write out error to error log.
      console.log('Error in elecrumx.js/getBalance().', err);

      throw new Error(_this.errorHandler(err));
    }
  }

  // handler for bulk queries on address balance
  async balanceBulk(addresses: string[]) {
    try {
      // Reject if addresses is not an array.
      if (!Array.isArray(addresses)) {
        throw new Error('addresses needs to be an array. Use for single address.');
      }

      // console.log('Executing electrumx.js/balanceBulk with these addresses: ', addresses);

      // Validate each element in the address array.
      for (let i = 0; i < addresses.length; i++) {
        const thisAddress = addresses[i];

        // Prevent a common user error. Ensure they are using the correct network address.
        const networkIsValid = CryptoUtil.validateNetwork(thisAddress);
        if (!networkIsValid) {
          throw new Error(
            `Invalid network for address ${thisAddress}. Trying to use a testnet address on mainnet, or vice versa.`
          );
        }
      }

      // Loops through each address and creates an array of Promises, querying
      // ElectrumX API in parallel.
      const addressesPromise = addresses.map(async (address) => {
        // console.log(`address: ${address}`)
        const balance = await _this._balanceFromElectrumx(address);

        return {
          balance,
          address
        };
      });

      // Wait for all parallel Insight requests to return.
      const result = await Promise.all(addressesPromise);

      // Return the array of retrieved address information.
      return result;
    } catch (err) {
      console.log('Error in electrumx.js/balanceBulk().', err);

      throw new Error(_this.errorHandler(err));
    }
  }

  // Returns a promise that resolves an array of transaction history for an
  // address. Expects input to be a cash address, and input validation to have
  // already been done by parent, calling function.
  async _transactionsFromElectrumx(address: string) {
    try {
      // Convert the address to a scripthash.
      const scripthash = _this.addressToScripthash(address);

      // Query the address transaction history from the ElectrumX server.
      const electrumResponse = await _this.electrumxRequest('blockchain.scripthash.get_history', scripthash);
      // console.log(`electrumResponse: ${JSON.stringify(electrumResponse, null, 2)}`);

      return electrumResponse;
    } catch (err) {
      // console.log('err1: ', err)

      // Write out error to error log.
      console.log('Error in elecrumx.js/_transactionsFromElectrumx(): ', err);
      throw err;
    }
  }

  // handler for single balance
  async getTransactions(address: string) {
    try {
      // Reject if address is an array.
      if (Array.isArray(address)) {
        throw new Error('address can not be an array. Use for bulk upload.');
      }

      // Prevent a common user error. Ensure they are using the correct network address.
      const networkIsValid = CryptoUtil.validateNetwork(address);
      if (!networkIsValid) {
        throw new Error('Invalid network. Trying to use a testnet address on mainnet, or vice versa.');
      }

      // console.log('Executing electrumx/getTransactions with this address: ', address);

      // data from ElectrumX server.
      const electrumResponse = await _this._transactionsFromElectrumx(address);
      // console.log(`_utxosFromElectrumx(): ${JSON.stringify(electrumResponse, null, 2)}`)

      // Pass the error message if ElectrumX reports an error.
      if (Object.prototype.hasOwnProperty.call(electrumResponse, 'code')) {
        throw new Error(electrumResponse.message);
      }

      return electrumResponse.result;
    } catch (err) {
      // Write out error to error log.
      console.log('Error in elecrumx.js/getTransactions().', err);

      throw new Error(_this.errorHandler(err));
    }
  }

  // handler for bulk queries on transaction histories for addresses.
  async transactionsBulk(addresses: string[]) {
    try {
      // Reject if addresses is not an array.
      if (!Array.isArray(addresses)) {
        throw new Error('addresses needs to be an array. Use for single address.');
      }

      // console.log('Executing electrumx.js/transactionsBulk with these addresses: ', addresses);

      // Validate each element in the address array.
      for (let i = 0; i < addresses.length; i++) {
        const thisAddress = addresses[i];

        // Prevent a common user error. Ensure they are using the correct network address.
        const networkIsValid = CryptoUtil.validateNetwork(thisAddress);
        if (!networkIsValid) {
          throw new Error(
            `Invalid network for address ${thisAddress}. Trying to use a testnet address on mainnet, or vice versa.`
          );
        }
      }

      // Loops through each address and creates an array of Promises, querying
      // ElectrumX API in parallel.
      const addressesPromise = addresses.map(async (address) => {
        // console.log(`address: ${address}`)
        const transactions = await _this._transactionsFromElectrumx(address);

        return {
          transactions,
          address
        };
      });

      // Wait for all parallel Insight requests to return.
      const result = await Promise.all(addressesPromise);

      // Return the array of retrieved address information.
      return result;
    } catch (err) {
      console.log('Error in electrumx.js/transactionsBulk().', err);

      throw new Error(_this.errorHandler(err));
    }
  }

  // Returns a promise that resolves to unconfirmed UTXO data (mempool) for an address.
  // Expects input to be a cash address, and input validation to have
  // already been done by parent, calling function.
  async _mempoolFromElectrumx(address: string) {
    try {
      // Convert the address to a scripthash.
      const scripthash = _this.addressToScripthash(address);

      // Query the unconfirmed utxos from the ElectrumX server.
      const electrumResponse = await _this.electrumxRequest('blockchain.scripthash.get_mempool', scripthash);
      // console.log(
      //   `electrumResponse: ${JSON.stringify(electrumResponse, null, 2)}`
      // )

      return electrumResponse;
    } catch (err) {
      // console.log('err: ', err)

      // Write out error to error log.
      console.log('Error in elecrumx.js/_mempoolFromElectrumx(): ', err);
      throw err;
    }
  }

  // handler for single balance
  async getMempool(address: string) {
    try {
      // Reject if address is an array.
      if (Array.isArray(address)) {
        throw new Error('address can not be an array. Use for bulk upload.');
      }

      // Prevent a common user error. Ensure they are using the correct network address.
      const networkIsValid = CryptoUtil.validateNetwork(address);
      if (!networkIsValid) {
        throw new Error('Invalid network. Trying to use a testnet address on mainnet, or vice versa.');
      }

      // console.log('Executing electrumx/getMempool with this address: ', address);

      // data from ElectrumX server.
      const electrumResponse = await _this._mempoolFromElectrumx(address);
      // console.log(`_mempoolFromElectrumx(): ${JSON.stringify(electrumResponse, null, 2)}`)

      // Pass the error message if ElectrumX reports an error.
      if (Object.prototype.hasOwnProperty.call(electrumResponse, 'code')) {
        throw new Error(electrumResponse.message);
      }

      return electrumResponse.result;
    } catch (err) {
      // Write out error to error log.
      console.log('Error in elecrumx.js/getMempool().', err);

      throw new Error(_this.errorHandler(err));
    }
  }

  // handler for bulk queries on address details
  async mempoolBulk(addresses: string[]) {
    try {
      // Reject if addresses is not an array.
      if (!Array.isArray(addresses)) {
        throw new Error('addresses needs to be an array. Use for single address.');
      }

      // console.log('Executing electrumx.js/mempoolBulk with these addresses: ', addresses);

      // Validate each element in the address array.
      for (let i = 0; i < addresses.length; i++) {
        const thisAddress = addresses[i];

        // Prevent a common user error. Ensure they are using the correct network address.
        const networkIsValid = CryptoUtil.validateNetwork(thisAddress);
        if (!networkIsValid) {
          throw new Error(
            `Invalid network for address ${thisAddress}. Trying to use a testnet address on mainnet, or vice versa.`
          );
        }
      }

      // Loops through each address and creates an array of Promises, querying
      // Insight API in parallel.
      const addressesPromise = addresses.map(async (address) => {
        // console.log(`address: ${address}`)
        const utxos = await _this._mempoolFromElectrumx(address);

        return {
          utxos,
          address
        };
      });

      // Wait for all parallel Insight requests to return.
      const result = await Promise.all(addressesPromise);

      // Return the array of retrieved address information.
      return result;
    } catch (err) {
      console.log('Error in electrumx.js/mempoolBulk().', err);

      throw new Error(_this.errorHandler(err));
    }
  }

  async getTransaction(txid: string, verbose = true) {
    try {
      if (typeof txid === 'string') {
        const electrumResponse = await _this.electrumxRequest('blockchain.transaction.get', txid, verbose);
        // console.log(`electrumResponse: ${JSON.stringify(electrumResponse, null, 2)}`);

        return electrumResponse.result;
      }

      throw new Error('Input tx must be a string.');
    } catch (error) {
      if (error.response && error.response.data) throw error.response.data;
      else throw error;
    }
  }

  async broadcast(txHex: string) {
    try {
      if (typeof txHex === 'string') {
        // Query the utxos from the ElectrumX server.
        const electrumResponse = await _this.electrumxRequest('blockchain.transaction.broadcast', txHex);
        // console.log(`electrumResponse: ${JSON.stringify(electrumResponse, null, 2)}`);

        // Pass the error message if ElectrumX reports an error.
        if (electrumResponse && electrumResponse.error && electrumResponse.error.code) {
          throw new Error(electrumResponse.error.message);
        }

        // return 'testing - not sent!';
        return electrumResponse.result;
      }

      throw new Error('Input txHex must be a string.');
    } catch (error) {
      if (error.response && error.response.data) throw error.response.data;
      else throw error;
    }
  }

  // Convert a niftycoin address to a script hash used by ElectrumX.
  addressToScripthash(addrStr: string) {
    try {
      // console.log(`addrStr: ${addrStr}`);
      const script = bitcoin.address.toOutputScript(addrStr, _this.network);
      // console.log(`script: ${script}`);

      const scripthash = bitcoin.crypto.sha256(script);
      // console.log(`scripthash: ${scripthash}`);

      const reversedHash = new Buffer(scripthash.reverse()).toString('hex');
      // console.log(addrStr, ' maps to ', reversedHash);

      return reversedHash;
    } catch (err) {
      console.log('Error in electrumx.js/addressToScripthash()');
      throw err;
    }
  }
}
