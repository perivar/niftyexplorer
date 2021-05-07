/* eslint-disable class-methods-use-this */
/*
  This library interacts with the NiftyCoin Explorer REST API endpoints
*/
// Public npm libraries
import axios, { AxiosRequestConfig } from 'axios';
import { Network } from 'bitcoinjs-lib';

let _this: NiftyCoinExplorer;

export class NiftyCoinExplorer {
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
          authorization: `Token ${_this.apiToken}`
        }
      };
    } else {
      this.axiosOptions = {};
    }

    _this = this;
  }

  // this returns the NFY balance
  // needs to multiply with 100000000 to get niftoshis
  async balance(address: string | string[]): Promise<number> {
    try {
      // Handle single address.
      if (typeof address === 'string') {
        const response = await axios.get(`${_this.restURL}ext/getbalance/${address}`, _this.axiosOptions);
        if (!response.data.error) {
          return Number(response.data);
        }
        throw `${response.data.error} : ${address}`;

        // Handle array of addresses.
        // } else if (Array.isArray(address)) {
        //   const response = await axios.post(
        //     `${_this.restURL}electrumx/balance`,
        //     {
        //       addresses: address
        //     },
        //     _this.axiosOptions
        //   );

        //   return response.data;
      }

      throw new Error('Input address must be a string or array of strings.');
    } catch (error) {
      if (error.response && error.response.data) throw error.response.data;
      else throw error;
    }
  }

  async transactions(address: string | string[]) {
    try {
      // Handle single address.
      if (typeof address === 'string') {
        const response = await axios.get(`${_this.restURL}ext/getaddress/${address}`, _this.axiosOptions);
        return response.data;

        // Handle array of addresses.
        // } else if (Array.isArray(address)) {
        //   const response = await axios.post(
        //     `${_this.restURL}electrumx/transactions`,
        //     {
        //       addresses: address
        //     },
        //     _this.axiosOptions
        //   );

        //   return response.data;
      }

      throw new Error('Input address must be a string or array of strings.');
    } catch (error) {
      if (error.response && error.response.data) throw error.response.data;
      else throw error;
    }
  }

  async txData(txid: string) {
    try {
      // Handle single transaction.
      if (typeof txid === 'string') {
        const response = await axios.get(
          `${_this.restURL}api/getrawtransaction?txid=${txid}&decrypt=1`,
          _this.axiosOptions
        );
        return response.data;
      }

      throw new Error('Input txId must be a string or array of strings.');
    } catch (error) {
      if (error.response && error.response.data) throw error.response.data;
      else throw error;
    }
  }

  async txDataExplorer(txid: string) {
    try {
      // Handle single transaction.
      if (typeof txid === 'string') {
        const response = await axios.get(`${_this.restURL}ext/gettx/${txid}`, _this.axiosOptions);
        return response.data;
      }

      throw new Error('Input txId must be a string or array of strings.');
    } catch (error) {
      if (error.response && error.response.data) throw error.response.data;
      else throw error;
    }
  }

  async sendRawTransaction(txHex: string) {
    try {
      if (typeof txHex === 'string') {
        // console.log(txHex);
        // use GET, not POST
        // const response = await axios.post(`${_this.restURL}api/sendrawtransaction`, { txHex }, _this.axiosOptions);
        const response = await axios.get(`${_this.restURL}api/sendrawtransaction?hex=${txHex}`, _this.axiosOptions);

        // use decode while testing
        // const response = await axios.get(`${_this.restURL}api/decoderawtransaction?hex=${txHex}`, _this.axiosOptions);
        return response.data;
        // return 'RANDOM_RETURN_HEX';
      }

      throw new Error('Input txHex must be a string.');
    } catch (error) {
      if (error.response && error.response.data) throw error.response.data;
      else throw error;
    }
  }
}
