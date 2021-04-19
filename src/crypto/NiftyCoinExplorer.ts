/* eslint-disable class-methods-use-this */
/*
  This library interacts with the NiftyCoin Explorer REST API endpoints
*/
// Public npm libraries
import axios, { AxiosRequestConfig } from 'axios';
import { Network } from 'bitcoinjs-lib';
import { UTXOInfo } from './util';

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

  // warning this is a very heavy lookup that might take some time
  async utxo(address: string, count = 50): Promise<UTXOInfo[]> {
    try {
      // Handle single address.
      if (typeof address === 'string') {
        const response = await axios.get(`${_this.restURL}ext/getaddresstxs/${address}/0/${count}`, _this.axiosOptions);

        // lookup tx data
        const utxos: UTXOInfo[] = [];

        // TODO: have no idea how to remove the spent transactions!!
        // therefore we only use the last entry
        // const elements = response.data;
        const elements = [response.data[0]];

        await Promise.all(
          elements.map(async (element: any) => {
            const data = await _this.txDataExplorer(element.txid);

            let isSpent = true;

            // check if vin contains the address
            let vin: any = {};
            for (let i = 0; i < data.tx.vin.length; i++) {
              vin = data.tx.vin[i];
              // get addresses
              const { addresses } = vin;
              // const hasVinAddress = addresses.some((addr: string) => {
              //   return addr === address;
              // });
              const hasVinAddress = addresses === address;

              // if vin doesn't contain the address, it is likely spent?
              if (hasVinAddress) {
                isSpent = false;
              }
            }

            // find a vout with money
            if (!isSpent) {
              let vout: any = {};
              for (let i = 0; i < data.tx.vout.length; i++) {
                vout = data.tx.vout[i];
                vout.n = i;

                // get addresses
                const { addresses } = vout;
                // const hasVoutAddress = addresses.some((addr: string) => {
                //   return addr === address;
                // });
                const hasVoutAddress = addresses === address;

                if (hasVoutAddress) {
                  break;
                }
              }
              const niftoshis = vout.amount;

              // add some of the same fields with different names to support older functions
              utxos.push({ value: niftoshis, tx_pos: vout.n, tx_hash: data.tx.txid });
            }
          })
        );

        return utxos;
      }

      throw new Error('Input address must be a string');
    } catch (error) {
      if (error.response && error.response.data) throw error.response.data;
      else throw error;
    }
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
