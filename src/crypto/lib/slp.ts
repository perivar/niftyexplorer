/*
  This is the parent library for the SLP class. It was originally forked from slp-sdk.

  TODO: Create an SLP fee calculator like slpjs:
  https://github.com/simpleledger/slpjs/blob/master/lib/slp.ts#L921
*/

import { TokenType1 } from './tokentype1';
import { NFT1 } from './nft1';
import { Utils } from './utils';
import { NiftyCoinExplorer } from '../NiftyCoinExplorer';
import { NiftyCoinElectrumX } from '../NiftyCoinElectrumX';

export interface CryptoLibConfig {
  restURL: string;
  apiToken?: string;
  authToken?: string;
  explorer: NiftyCoinExplorer;
  electrumx: NiftyCoinElectrumX;
}

// SLP is a superset of BITBOX
export class SLP {
  restURL: string;
  apiToken?: string;
  authToken?: string;

  axiosOptions: any;
  TokenType1: TokenType1;
  NFT1: NFT1;
  Utils: Utils;

  constructor(config: CryptoLibConfig) {
    this.restURL = config.restURL;
    this.apiToken = config.apiToken;
    this.authToken = config.authToken;

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

    this.TokenType1 = new TokenType1(config);
    this.NFT1 = new NFT1(config);
    this.Utils = new Utils(config);
  }
}
