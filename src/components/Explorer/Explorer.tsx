import React, { useEffect, useState } from 'react';
import * as bitcoin from 'bitcoinjs-lib';
// import * as slpParser from 'slp-parser';
// import CryptoNFT from '../../crypto/slp/nft';
import CryptoUtil from '../../crypto/util';

import { Card, Col, Input, Row, Space, Typography } from 'antd';
import { decodeOpReturnToAscii, hasOpReturn } from '../../utils/decodeRawSlpTransactions';
import { useHistory } from 'react-router';
import { Link } from 'react-router-dom';

const { Text } = Typography;
const { Search } = Input;

interface Address {
  address: string;
  value: number;
}

interface OpReturn {
  decoded: string;
}

interface ISenders {
  addresses: Address[];
}

interface IRecipients {
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

  const [senders, setSenders] = useState<ISenders>({
    addresses: []
  });
  const [recipients, setRecipients] = useState<IRecipients>({
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

  const doSearch = (query: string) => {
    if (query === '') return;

    setLoading(true);

    let result = '';
    electrumx.getTransaction(query).then((txDetails: any) => {
      result = `${JSON.stringify(txDetails, null, 2)}`;

      if (txDetails) {
        // parse vins
        const vinAddresses: Address[] = [];
        for (let i = 0; i < txDetails.vin.length; i++) {
          const scriptHash = txDetails.vin[i].scriptSig.hex;
          // get addresses
          const address = electrumx.scripthashToAddress(scriptHash);
          result += `\nvin[${i}]: ${address}`;
          if (address) vinAddresses.push({ address, value: 0 });
        }
        setSenders((prevState) => ({ ...prevState, addresses: vinAddresses }));

        // parse vouts
        const voutAddresses: Address[] = [];
        let decodedOpReturn = '';
        for (let i = 0; i < txDetails.vout.length; i++) {
          const vout = txDetails.vout[i];
          if (hasOpReturn([vout])) {
            decodedOpReturn = decodeOpReturnToAscii([vout]);
            result += `\nvout[${i}]: OP_RETURN ${decodedOpReturn}`;
          } else {
            const address = vout.scriptPubKey.addresses[0];
            const { value } = vout;
            result += `\nvout[${i}]: ${address} => ${value}`;
            if (address) voutAddresses.push({ address, value });
          }
        }
        setRecipients((prevState) => ({
          ...prevState,
          addresses: voutAddresses,
          opReturn: { decoded: decodedOpReturn }
        }));
      }

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
          <Row gutter={16} style={{ marginTop: '8px' }}>
            <Col span={12}>
              <Card title="Senders" bordered={true}>
                {senders.addresses &&
                  senders.addresses.map((address: Address) => (
                    <div key={address.address}>
                      <Text strong>{address.address}</Text>
                    </div>
                  ))}
              </Card>
            </Col>
            <Col span={12}>
              <Card title="Recipients" bordered={true}>
                {recipients.opReturn && <p>OP_RETURN: {recipients.opReturn.decoded}</p>}
                {recipients.addresses &&
                  recipients.addresses.map((address: Address) => (
                    <div key={address.address}>
                      <Text strong>{address.address}</Text>{' '}
                      <Text strong type="success">
                        {address.value}
                      </Text>
                    </div>
                  ))}
              </Card>
            </Col>
          </Row>
          <div style={{ width: '100%', textAlign: 'left' }}>
            <pre>{result}</pre>
          </div>
        </>
      )}
    </>
  );
};
