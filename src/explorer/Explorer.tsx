import React, { useState } from 'react';
import CryptoNFT from '../crypto/slp/nft';
import CryptoUtil, { NFTChildGenesisOpReturnConfig, WalletInfo } from '../crypto/util';

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
    CryptoNFT.getNFT(query).then((res: any) => {
      // console.log(res);
      result = `${JSON.stringify(res, null, 2)}`;

      electrumx.getTransaction(query).then((res: any) => {
        // console.log(res);
        result += `\n${JSON.stringify(res, null, 2)}`;

        setResult(result);
      });
    });

    setLoading(false);
  };

  return (
    <div className="container">
      <br />
      <div className="row justify-content-center">
        <div className="col-12 col-md-10 col-lg-8">
          <form className="card card-sm">
            <div className="card-body row no-gutters align-items-center">
              <div className="col-auto">
                <i className="fas fa-search h4 text-body"></i>
              </div>
              <div className="col">
                <input
                  className="form-control form-control form-control-borderless"
                  type="search"
                  placeholder="Search for transaction"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              <div className="col-auto ml-1">
                <button className="btn btn-success" type="button" onClick={handleSearch}>
                  Search
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
      <div>
        <p>Test transactions:</p>
        <div>
          <code>3d815beb4639e446aff5e0dd60a9a800e7349dc3c390c6375c063faddd7c2618</code>
        </div>
        <div>
          <code>c0c754f9b9ffcb4b678dcaef550f811d90c4534724be9ca760c8cf209e27e6bb</code>
        </div>
      </div>
      <br />
      <div>
        <p>Result:</p>
        {!isLoading && (
          <pre>
            <code>{result}</code>
          </pre>
        )}
      </div>
    </div>
  );
};
