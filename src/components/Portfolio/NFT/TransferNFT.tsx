import React, { useState } from 'react';
import { WalletContext } from '../../../utils/context';
import styled from 'styled-components';
import { Card, Form, Button, Spin, notification } from 'antd';
import { Row, Col } from 'antd';
import { BlockOutlined } from '@ant-design/icons';
import Paragraph from 'antd/lib/typography/Paragraph';
import sendNFTToken from '../../../utils/broadcastTransaction';
import { PlaneIcon } from '../../Common/CustomIcons';
import { FormItemWithMaxAddon, FormItemWithQRCodeAddon } from '../EnhancedInputs';
import { QRCode } from '../../Common/QRCode';

export const StyledButtonWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
`;

const TransferNFT = ({ token, onClose }: any) => {
  const { wallet, balances } = React.useContext(WalletContext);
  const [formData, setFormData] = useState({
    dirty: false,
    quantity: token.version === 0x91 ? 1 : token.balance,
    address: wallet.legacyAddress
  });
  const [loading, setLoading] = useState(false);

  async function submit() {
    setFormData({
      ...formData,
      dirty: false
    });

    if (!formData.address || !formData.quantity || Number(formData.quantity) <= 0) {
      return;
    }

    setLoading(true);
    const { quantity, address } = formData;

    try {
      const link = await sendNFTToken(wallet, 'SEND_NFT_TOKEN', {
        tokenId: token.tokenId,
        version: token.version,
        amount: quantity,
        tokenReceiverAddress: address
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
      const message = e.message || e.error || JSON.stringify(e);

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

  const onMax = () => {
    setFormData({ ...formData, quantity: token.balance || 0 });
  };

  return (
    <Row>
      <Col span={24}>
        <Spin spinning={loading}>
          <Card
            title={
              <h2>
                <PlaneIcon /> Send
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
                    <FormItemWithQRCodeAddon
                      validateStatus={formData.dirty && !formData.address ? 'error' : ''}
                      help={formData.dirty && !formData.address ? 'Should be a valid nfy address' : ''}
                      onScan={(result: any) => setFormData({ ...formData, address: result })}
                      inputProps={{
                        placeholder: 'NiftyCoin Address',
                        name: 'address',
                        onChange: (e: any) => handleChange(e),
                        required: true,
                        value: formData.address
                      }}
                    />
                    <FormItemWithMaxAddon
                      validateStatus={formData.dirty && Number(formData.quantity) <= 0 ? 'error' : ''}
                      help={formData.dirty && Number(formData.quantity) <= 0 ? 'Should be greater than 0' : ''}
                      onMax={onMax}
                      inputProps={{
                        prefix: <BlockOutlined />,
                        placeholder: 'Amount',
                        name: 'quantity',
                        onChange: (e: any) => handleChange(e),
                        required: true,
                        type: 'number',
                        value: formData.quantity,
                        disabled: token.version === 0x91
                      }}
                    />
                    <div style={{ paddingTop: '12px' }}>
                      <Button onClick={() => submit()}>Send</Button>
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

export default TransferNFT;
