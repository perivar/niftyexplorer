import React, { useState } from 'react';
import * as slpParser from 'slp-parser';
import CryptoNFT from '../../crypto/slp/nft';
import CryptoUtil, { NFTChildGenesisOpReturnConfig, WalletInfo } from '../../crypto/util';

import { Input, Row, Space } from 'antd';

const { Search } = Input;

export const Explorer = () => {
  const [isLoading, setLoading] = useState<boolean>(false);
  const [query, setQuery] = useState<string>('');
  const [result, setResult] = useState<string>('');

  // network
  const NETWORK = process.env.REACT_APP_NETWORK;
  const electrumx = CryptoUtil.getElectrumX(NETWORK);
  const slp = CryptoUtil.getSLP(NETWORK);

  const handleSearch = () => {
    if (query === '') return;

    setLoading(true);

    let result = '';
    electrumx.getTransaction(query).then((txDetails: any) => {
      result = `${JSON.stringify(txDetails, null, 2)}`;

      try {
        const parsedSlpData = slp.Utils.decodeTxData(txDetails);
        result += `\n${JSON.stringify(parsedSlpData, null, 2)}`;
      } catch (error) {
        // An error will be thrown if the txid is not SLP.
      }
      setResult(result);
      setLoading(false);
    });
  };

  return (
    <>
      <Space direction="vertical">
        <Search
          placeholder="input transaction id"
          allowClear
          enterButton="Search"
          size="large"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onSearch={handleSearch}
        />
        <div>
          <div>
            <p>Example Transactions:</p>
          </div>
          <div>
            <code>3d815beb4639e446aff5e0dd60a9a800e7349dc3c390c6375c063faddd7c2618</code>
          </div>
          <div>
            <code>c0c754f9b9ffcb4b678dcaef550f811d90c4534724be9ca760c8cf209e27e6bb</code>
          </div>
          <div>
            <code>dc64afee6d8f794c6cf83b10510ef637de504e3c51951ed045528b351e0e7e59</code>
          </div>
        </div>
      </Space>
      {!isLoading && (
        <div style={{ width: '100%', textAlign: 'left' }}>
          <pre>{result}</pre>
        </div>
      )}
    </>
  );
};
