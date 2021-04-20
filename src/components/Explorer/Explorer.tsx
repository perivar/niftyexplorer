import React, { useState } from 'react';
import CryptoNFT from '../../crypto/slp/nft';
import CryptoUtil, { NFTChildGenesisOpReturnConfig, WalletInfo } from '../../crypto/util';

import { Input, Space } from 'antd';

const { Search } = Input;

export const Explorer = () => {
  const [isLoading, setLoading] = useState<boolean>(false);
  const [query, setQuery] = useState<string>('');
  const [result, setResult] = useState<string>('');

  // network
  const electrumx = CryptoUtil.getElectrumX();

  const handleSearch = () => {
    if (query === '') return;

    setLoading(true);

    let result = '';
    electrumx.getTransaction(query).then((res: any) => {
      // console.log(res);
      result = `${JSON.stringify(res, null, 2)}`;

      CryptoNFT.getNFT(query).then((res: any) => {
        // console.log(res);
        result += `\n${JSON.stringify(res, null, 2)}`;
      });

      setResult(result);
    });

    setLoading(false);
  };

  return (
    <>
      <Space direction="vertical">
        <Search
          placeholder="input search text"
          allowClear
          enterButton="Search"
          size="large"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onSearch={handleSearch}
        />
      </Space>
      <div>
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
      {!isLoading && (
        <pre>
          <code>{result}</code>
        </pre>
      )}
    </>
  );
};
