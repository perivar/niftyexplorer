import React, { useState } from 'react';
import styled from 'styled-components';
import { WalletContext } from '../../../utils/context';
import mintToken from '../../../utils/broadcastTransaction';
import { Card, Form, Input, Button, Spin, notification } from 'antd';
// import Icon from '@ant-design/icons';
import { BlockOutlined } from '@ant-design/icons';
import { Row, Col } from 'antd';
import Paragraph from 'antd/lib/typography/Paragraph';
import { HammerIcon } from '../../Common/CustomIcons';
import { QRCode } from '../../Common/QRCode';

const StyledButtonWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
`;

const Mint = ({ token, onClose }: any) => {
  const ContextValue = React.useContext(WalletContext);
  const { wallet, balances } = ContextValue;
  const [formData, setFormData] = useState({
    dirty: true,
    quantity: 0,
    baton: wallet.segwitAddress
  });
  const [loading, setLoading] = useState(false);

  async function submit() {
    setFormData({
      ...formData,
      dirty: false
    });

    if (!formData.baton || !formData.quantity || Number(formData.quantity) <= 0) {
      return;
    }

    setLoading(true);
    const { quantity, baton } = formData;

    try {
      const link = await mintToken(wallet, {
        tokenId: token.tokenId,
        version: token.version,
        additionalTokenQty: quantity,
        batonReceiverAddress: baton
      });

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
      setLoading(false);
    } catch (e) {
      let message;

      if (/don't have the minting baton/.test(e.message)) {
        message = e.message;
      } else if (/Invalid NFY address/.test(e.message)) {
        message = 'Invalid NFY address';
      } else if (/Transaction input NFY amount is too low/.test(e.message)) {
        message = 'Not enough NFY. Deposit some funds to use this feature.';
      } else if (/NFT token types are not yet supported/.test(e.message)) {
        message = e.message;
      } else if (/is not supported/.test(e.message)) {
        message = e.message;
      } else if (!e.error) {
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
      setLoading(false);
    }
  }

  const handleChange = (e: any) => {
    const { value, name } = e.target;

    setFormData((p) => ({ ...p, [name]: value }));
  };

  return (
    <Row>
      <Col span={24}>
        <Spin spinning={loading}>
          <Card
            title={
              <h2>
                <HammerIcon /> Mint
              </h2>
            }
            bordered={false}>
            <br />
            {!balances.totalBalance ? (
              <Row justify="center">
                <Col>
                  <br />
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
              <Row>
                <Col span={24}>
                  <Form style={{ width: 'auto' }}>
                    <Form.Item
                      validateStatus={!formData.dirty && Number(formData.quantity) <= 0 ? 'error' : ''}
                      help={!formData.dirty && Number(formData.quantity) <= 0 ? 'Should be greater than 0' : ''}>
                      <Input
                        prefix={<BlockOutlined />}
                        placeholder="Amount"
                        name="quantity"
                        onChange={(e) => handleChange(e)}
                        required
                        type="number"
                      />
                    </Form.Item>
                    <div style={{ paddingTop: '12px' }}>
                      <Button onClick={() => submit()}>Mint</Button>
                    </div>
                  </Form>
                </Col>
              </Row>
            )}
          </Card>
        </Spin>
      </Col>
    </Row>
  );
};

export default Mint;
