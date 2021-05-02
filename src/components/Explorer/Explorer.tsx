import React, { useEffect, useState } from 'react';
// import * as bitcoin from 'bitcoinjs-lib';
// import * as slpParser from 'slp-parser';
// import CryptoNFT from '../../crypto/slp/nft';
import CryptoUtil from '../../crypto/util';

import { Badge, Card, Col, Input, Row, Space, Typography } from 'antd';
import { decodeOpReturnToAscii, hasOpReturn } from '../../utils/decodeRawSlpTransactions';
import { useHistory } from 'react-router';
import { Link } from 'react-router-dom';

const { Text } = Typography;
const { Search } = Input;

interface Address {
  address: string;
  value: number;
  isMintBaton?: boolean;
}

interface OpReturn {
  decoded: string;
}

interface Inputs {
  addresses: Address[];
}

interface Outputs {
  addresses: Address[];
  opReturn?: OpReturn;
}

export const Explorer = ({ match }: { match: any }) => {
  // const { path } = match;
  const { query: queryparam } = match.params;

  const history = useHistory();

  const [isLoading, setLoading] = useState<boolean>(false);
  const [query, setQuery] = useState<string>('');
  const [result, setResult] = useState<string>('');

  const [totalInputValue, setTotalInputValue] = useState<number>(0);
  const [totalOutputValue, setTotalOutputValue] = useState<number>(0);
  const [txDetails, setTxDetails] = useState<any>();
  const [slpDetails, setSLPDetails] = useState<any>();

  const [inputs, setInputs] = useState<Inputs>({
    addresses: []
  });
  const [outputs, setOutputs] = useState<Outputs>({
    addresses: [],
    opReturn: undefined
  });

  // network
  const NETWORK = process.env.REACT_APP_NETWORK;
  const electrumx = CryptoUtil.getElectrumX(NETWORK);
  const slp = CryptoUtil.getSLP(NETWORK);

  useEffect(() => {
    if (queryparam) setQuery(queryparam);
    doSearch(query);
  }, [queryparam]);

  const getTransactionInformation = async (txid: string) => {
    try {
      let result = '';
      let intputTotal = 0;
      let outputTotal = 0;
      const txCurrentDetails = await electrumx.getTransaction(txid);

      if (txCurrentDetails) {
        setTxDetails(txCurrentDetails);
        let parsedSlpData: any;
        try {
          parsedSlpData = slp.Utils.decodeTxData(txCurrentDetails);
          setSLPDetails(parsedSlpData);
          // result += `\n\n${JSON.stringify(parsedSlpData, null, 2)}`;
        } catch (error) {
          // An error will be thrown if the txid is not SLP.
        }

        // parse vins
        const vinAddresses: Address[] = [];
        for (let i = 0; i < txCurrentDetails.vin.length; i++) {
          const vin = txCurrentDetails.vin[i];

          // get addresses
          const scriptHash = vin.scriptSig.hex;
          const address = electrumx.scripthashToAddress(scriptHash);

          // lookup input values
          const txPreviousDetails = await electrumx.getTransaction(vin.txid);
          // lookup the correct vout
          const inputVin = txPreviousDetails.vout[vin.vout];
          const inputValue = inputVin.value;
          result += `\nvin[${i}]: ${address} => ${inputValue}`;

          intputTotal += inputValue;
          if (address) vinAddresses.push({ address, value: inputValue });
        }
        setInputs((prevState) => ({ ...prevState, addresses: vinAddresses }));
        setTotalInputValue(intputTotal);

        // parse vouts
        const voutAddresses: Address[] = [];
        let decodedOpReturn = '';
        for (let i = 0; i < txCurrentDetails.vout.length; i++) {
          const vout = txCurrentDetails.vout[i];
          if (hasOpReturn([vout])) {
            decodedOpReturn = decodeOpReturnToAscii([vout]);
            result += `\nvout[${i}]: OP_RETURN ${decodedOpReturn}`;
          } else {
            const address = vout.scriptPubKey.addresses[0];
            const outputValue = vout.value;

            // check if mint baton
            let isMintBaton = false;
            if (parsedSlpData) {
              isMintBaton = parsedSlpData.mintBatonVout === i;
            }

            result += `\nvout[${i}]: ${address} => ${outputValue} ${isMintBaton ? 'MINT BATON' : ''}`;

            outputTotal += outputValue;
            if (address) voutAddresses.push({ address, value: outputValue, isMintBaton });
          }
        }
        setOutputs((prevState) => ({
          ...prevState,
          addresses: voutAddresses,
          opReturn: { decoded: decodedOpReturn }
        }));
        setTotalOutputValue(outputTotal);

        // result += `\n\n${JSON.stringify(txCurrentDetails, null, 2)}`;
      }
      return result;
    } catch (error) {
      console.log(error);
    }
  };

  const doSearch = async (query: string) => {
    if (query === '') return;
    setLoading(true);

    const result = await getTransactionInformation(query);

    if (result) setResult(result);
    setLoading(false);
  };

  const handleOnSearch = () => {
    // doSearch(query);
    history.push(`/explorer/${query}`);
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
          onSearch={handleOnSearch}
        />
        <div>
          <div>
            <p>Example Transactions:</p>
          </div>
          <div>
            <Link to="/explorer/3d815beb4639e446aff5e0dd60a9a800e7349dc3c390c6375c063faddd7c2618">
              <code>3d815beb4639e446aff5e0dd60a9a800e7349dc3c390c6375c063faddd7c2618</code>
            </Link>
          </div>
          <div>
            <Link to="/explorer/c0c754f9b9ffcb4b678dcaef550f811d90c4534724be9ca760c8cf209e27e6bb">
              <code>c0c754f9b9ffcb4b678dcaef550f811d90c4534724be9ca760c8cf209e27e6bb</code>
            </Link>
          </div>
          <div>
            <Link to="/explorer/dc64afee6d8f794c6cf83b10510ef637de504e3c51951ed045528b351e0e7e59">
              <code>dc64afee6d8f794c6cf83b10510ef637de504e3c51951ed045528b351e0e7e59</code>
            </Link>
          </div>
          <div>
            <Link to="/explorer/16845293e802f2f59bc69eb361c1fff08dba1e4a4c85702c7f574846f428031e">
              <code>16845293e802f2f59bc69eb361c1fff08dba1e4a4c85702c7f574846f428031e</code>
            </Link>
          </div>
          <div>
            <Link to="/explorer/c98625d150329534e8f936c202b7dd3b5e1b240fc25ed545f35b690c7f0dd124">
              <code>c98625d150329534e8f936c202b7dd3b5e1b240fc25ed545f35b690c7f0dd124</code>
            </Link>
          </div>
        </div>
      </Space>
      {!isLoading && (
        <>
          <Card size="small" title="Transaction Information" style={{ marginTop: '12px' }}>
            <div>
              <Text>Transaction Id: </Text>
              <Text code strong>
                {queryparam}
              </Text>
            </div>
            <Text>Input Total: </Text>
            <Text code strong type="success">
              {totalInputValue}
            </Text>{' '}
            <Text>Output Total: </Text>
            <Text code strong type="success">
              {totalOutputValue}
            </Text>{' '}
            <Text>Transaction fee: </Text>
            <Text code strong type="success">
              {(totalInputValue - totalOutputValue).toFixed(8)}
            </Text>
          </Card>

          <Card
            size="small"
            title={`Inputs ${txDetails && txDetails.vin ? txDetails.vin.length : ''}`}
            bordered={true}
            style={{ marginTop: '8px' }}>
            <div style={{ width: '100%', textAlign: 'left' }}>
              {inputs.addresses &&
                inputs.addresses.map((address: Address, index: number) => (
                  <div key={index}>
                    <Text code strong type="success">
                      {address.value}
                    </Text>{' '}
                    <Text code>{address.address}</Text>
                  </div>
                ))}
            </div>
          </Card>

          <Card
            size="small"
            title={`Outputs ${txDetails && txDetails.vout ? txDetails.vout.length : ''}`}
            bordered={true}
            style={{ marginTop: '8px' }}>
            <div style={{ width: '100%', textAlign: 'left' }}>
              {outputs.opReturn && (
                <>
                  <Text code>OP_RETURN:</Text>{' '}
                  <Text code strong type="success">
                    {outputs.opReturn.decoded}
                  </Text>
                </>
              )}
              {outputs.addresses &&
                outputs.addresses.map((address: Address, index: number) => (
                  <div key={index}>
                    <Text code>{address.address}</Text>{' '}
                    <Text code strong type="success">
                      {address.value}
                    </Text>{' '}
                    {address.isMintBaton ? (
                      <Text code>
                        <Badge color="#2db7f5" text="Mint Baton" />
                      </Text>
                    ) : (
                      ''
                    )}
                  </div>
                ))}
            </div>
          </Card>

          {slpDetails && (
            <Card size="small" title="SLP Information" style={{ marginTop: '8px' }}>
              <div style={{ width: '100%', textAlign: 'left' }}>
                <pre>{JSON.stringify(slpDetails, null, 2)}</pre>
              </div>
            </Card>
          )}

          {txDetails && (
            <Card size="small" title="Transaction Information" style={{ marginTop: '8px' }}>
              <div style={{ width: '100%', textAlign: 'left' }}>
                <pre>{JSON.stringify(txDetails, null, 2)}</pre>
              </div>
            </Card>
          )}
        </>
      )}
    </>
  );
};
