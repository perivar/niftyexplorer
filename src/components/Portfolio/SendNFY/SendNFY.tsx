/* eslint-disable react/jsx-key */
import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { WalletContext } from '../../../utils/context';
import { Card, Radio, Form, Button, Spin, notification, message } from 'antd';
// import Icon from '@ant-design/icons';
import { HistoryOutlined } from '@ant-design/icons';
import { Row, Col } from 'antd';
import Paragraph from 'antd/lib/typography/Paragraph';
import { PlaneIcon } from '../../Common/CustomIcons';
import { QRCode } from '../../Common/QRCode';
import { sendNFY, calcFee } from '../../../utils/sendNFY';
import { FormItemWithMaxAddon } from '../EnhancedInputs';
// import getTransactionHistory from '../../../utils/getTransactionHistory';

export const StyledButtonWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
`;

const SendNFY = ({ onClose, outerAction, filledAddress, showCardHeader, callbackTxId }: any) => {
  const { wallet, balances, slpBalancesAndUtxos, tokens } = React.useContext(WalletContext);
  const [formData, setFormData] = useState<any>({
    dirty: true,
    value: '',
    address: filledAddress || ''
  });
  const [loading, setLoading] = useState(false);
  const [action, setAction] = useState('send');
  const [history, setHistory] = useState<any>(null);
  const [bchToDollar, setNfyToDollar] = useState<any>(null);

  useEffect(() => setAction('send'), [outerAction]);

  async function submit() {
    setFormData({
      ...formData,
      dirty: false
    });

    if (!formData.address || !formData.value || Number(formData.value) <= 0) {
      return;
    }

    setLoading(true);
    const { address, value } = formData;

    try {
      const link = await sendNFY(
        wallet,
        {
          addresses: [filledAddress || address],
          values: [value]
        },
        callbackTxId
      );

      notification.success({
        message: 'Success',
        description: (
          <a href={link} target="_blank" rel="noopener noreferrer">
            <Paragraph>Transaction successful. Click or tap here for more details</Paragraph>
          </a>
        ),
        duration: 2
      });

      onClose();
    } catch (e) {
      let message;

      if (!e.error) {
        message = `Transaction failed: no response from server.`;
      } else if (/Could not communicate with full node or other external service/.test(e.error)) {
        message = 'Could not communicate with API. Please try again.';
      } else {
        message = e.message || e.error || JSON.stringify(e);
      }

      notification.error({
        message: 'Error',
        description: message,
        duration: 2
      });
      console.error(e);
    }

    setLoading(false);
  }

  const handleChange = (e: any) => {
    const { value, name } = e.target;

    setFormData((p: any) => ({ ...p, [name]: value }));
  };

  const onMax = async () => {
    try {
      const txFee = calcFee(slpBalancesAndUtxos.nonSlpUtxos);
      const value = balances.totalBalance - txFee >= 0 ? (balances.totalBalance - txFee).toFixed(8) : 0;
      setFormData({
        ...formData,
        value
      });
    } catch (err) {
      message.error('Unable to calculate the max value due to network errors');
    }
  };

  const handleChangeAction = () => {
    if (action === 'send') {
      setAction('history');
      // getNfyHistory();
    } else {
      setAction('send');
    }
  };

  return (
    <Row>
      <Col span={24}>
        <Spin spinning={loading}>
          <Card
            title={
              showCardHeader && (
                <Radio.Group
                  defaultValue="send"
                  onChange={() => handleChangeAction()}
                  value={action}
                  style={{ width: '100%', textAlign: 'center', marginTop: 0, marginBottom: 0 }}
                  size="small"
                  buttonStyle="solid">
                  <Radio.Button
                    style={{
                      borderRadius: '19.5px',
                      height: '40px',
                      width: '50%',
                      fontSize: '16px'
                    }}
                    value="send"
                    onClick={() => handleChangeAction()}>
                    <PlaneIcon style={{ color: '#fff' }} /> Send
                  </Radio.Button>
                  <Radio.Button
                    style={{
                      borderRadius: '19.5px',
                      height: '40px',
                      width: '50%',
                      fontSize: '16px'
                    }}
                    value="history"
                    onClick={() => handleChangeAction()}>
                    <HistoryOutlined style={{ color: '#fff' }} /> History
                  </Radio.Button>
                </Radio.Group>
              )
            }
            bordered={false}>
            <br />

            {!balances.totalBalance && action === 'send' ? (
              <Row justify="center">
                <Col>
                  <StyledButtonWrapper>
                    <>
                      <Paragraph>You currently have 0 NFY. Deposit some funds to use this feature.</Paragraph>
                      <Paragraph>
                        <QRCode id="borderedQRCode" address={wallet.legacyAddress} />
                      </Paragraph>
                    </>
                  </StyledButtonWrapper>
                </Col>
              </Row>
            ) : (
              (action === 'send' && (
                <Row>
                  <Col span={24}>
                    <Form style={{ width: 'auto' }}>
                      <FormItemWithMaxAddon
                        validateStatus={!formData.dirty && Number(formData.value) <= 0 ? 'error' : ''}
                        help={!formData.dirty && Number(formData.value) <= 0 ? 'Should be greater than 0' : ''}
                        onMax={onMax}
                        inputProps={{
                          name: 'value',
                          placeholder: 'Amount',
                          suffix: 'NFY',
                          onChange: (e: any) => handleChange(e),
                          required: true,
                          value: formData.value
                        }}
                      />
                      <div style={{ paddingTop: '12px' }}>
                        <Button onClick={() => submit()}>Send</Button>
                      </div>
                    </Form>
                  </Col>
                </Row>
              )) ||
              (!loading && action === 'history' && (history || {}) && (
                <>
                  <p>Transaction History (max 30)</p>
                  {history.bchTransactions.map((el: any) => (
                    <div
                      style={{
                        background:
                          el.transactionBalance.type !== 'Unknown'
                            ? el.transactionBalance.balance > 0
                              ? '#D4EFFC'
                              : ' #ffd59a'
                            : '#D3D3D3',
                        color: 'black',
                        borderRadius: '12px',
                        marginBottom: '18px',
                        padding: '8px',
                        boxShadow: '6px 6px #888888',
                        width: '97%'
                      }}>
                      <a
                        href={`https://explorer.niftycoin.org/tx/${el.txid}`}
                        target="_blank"
                        rel="noopener noreferrer">
                        <p>{el.transactionBalance.type}</p>
                        <p>{el.date.toLocaleString()}</p>
                        {el.transactionBalance.type !== 'Unknown' && (
                          <>
                            {' '}
                            <p>{`${el.transactionBalance.balance > 0 ? '+' : ''}${
                              el.transactionBalance.balance
                            } NFY`}</p>
                            <p>{`${el.transactionBalance.balance > 0 ? '+$' : '-$'}${
                              (Math.abs(el.transactionBalance.balance) * bchToDollar).toFixed(2).toString() === '0.00'
                                ? 0.01
                                : (Math.abs(el.transactionBalance.balance) * bchToDollar).toFixed(2)
                            } USD`}</p>
                            {el.transactionBalance.type.includes('MintDividend') && (
                              <>
                                <h4>Outputs:</h4>
                                {el.transactionBalance.outputs.map((output: any) => (
                                  <>
                                    <Paragraph
                                      onClick={(e: any) => e.preventDefault()}
                                      ellipsis
                                      copyable={{ text: output.address }}
                                      style={{
                                        whiteSpace: 'nowrap',
                                        color: 'black',
                                        maxWidth: '90%'
                                      }}>
                                      {`Address: ${output.address}`}
                                    </Paragraph>
                                    <p style={{ marginTop: '-20px' }}>{`amount: ${output.amount > 0 ? '+' : ''}${
                                      output.amount
                                    } NFY`}</p>
                                  </>
                                ))}

                                <Paragraph
                                  onClick={(e: any) => e.preventDefault()}
                                  ellipsis
                                  copyable={{ text: el.transactionBalance.metaData.tokenId }}
                                  style={{ whiteSpace: 'nowrap', color: 'black', maxWidth: '90%' }}>
                                  {`tokenId: ${el.transactionBalance.metaData.tokenId}`}
                                </Paragraph>

                                <p>{`Message: ${
                                  el.transactionBalance.metaData.message
                                    ? el.transactionBalance.metaData.message
                                    : 'none'
                                }`}</p>
                              </>
                            )}
                          </>
                        )}

                        <Paragraph ellipsis style={{ whiteSpace: 'nowrap', color: 'black', maxWidth: '90%' }}>
                          {el.txid}
                        </Paragraph>
                        <p>{`Confirmations: ${el.confirmations}`}</p>
                      </a>
                    </div>
                  ))}
                  <a
                    href={`https://explorer.niftycoin.org/ext/getaddress/${wallet.legacyAddress}`}
                    target="_blank"
                    rel="noopener noreferrer">
                    <p>Full History</p>
                  </a>
                </>
              ))
            )}
          </Card>
        </Spin>
      </Col>
    </Row>
  );
};

export default SendNFY;
