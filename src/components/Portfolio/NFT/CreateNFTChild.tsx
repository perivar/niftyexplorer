import React, { useState } from 'react';
import { WalletContext } from '../../../utils/context';
import styled from 'styled-components';
import { Input, Card, Form, Button, Spin, notification } from 'antd';
import { Row, Col } from 'antd';
import { GoldFilled } from '@ant-design/icons';
import Paragraph from 'antd/lib/typography/Paragraph';
import createNFTToken from '../../../utils/broadcastTransaction';
import { QRCode } from '../../Common/QRCode';

export const StyledButtonWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
`;

const CreateNFTChild = ({ token, onClose }: any) => {
  const { wallet, balances } = React.useContext(WalletContext);
  const [data, setData] = useState({
    dirty: true,
    tokenName: '',
    tokenSymbol: '',
    documentHash: '',
    documentUri: ''
  });
  const [loading, setLoading] = useState(false);

  async function submit() {
    setData({
      ...data,
      dirty: false
    });

    if (!data.tokenName || !data.tokenSymbol) {
      return;
    }

    setLoading(true);
    const { tokenName, tokenSymbol, documentHash, documentUri } = data;

    try {
      const link: any = await createNFTToken(wallet, 'CREATE_NFT_CHILD_TOKEN', {
        tokenId: token.tokenId,
        version: token.version,
        name: tokenName,
        symbol: tokenSymbol,
        documentHash,
        docUri: documentUri
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

    setData((p) => ({ ...p, [name]: value }));
  };

  return (
    <Row>
      <Col span={24}>
        <Spin spinning={loading}>
          <Card
            title={
              <h2>
                <GoldFilled /> Create NFT Token
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
                  <Form>
                    <Form.Item
                      labelAlign="left"
                      labelCol={{ span: 3, offset: 0 }}
                      colon={false}
                      validateStatus={!data.dirty && !data.tokenSymbol ? 'error' : ''}
                      help={!data.dirty && !data.tokenSymbol ? 'Should be combination of numbers & alphabets' : ''}
                      required>
                      <Input
                        placeholder="token symbol e.g.: NIFTY"
                        name="tokenSymbol"
                        onChange={(e) => handleChange(e)}
                        required
                      />
                    </Form.Item>
                    <Form.Item
                      labelAlign="left"
                      labelCol={{ span: 3, offset: 0 }}
                      required
                      colon={false}
                      validateStatus={!data.dirty && Number(data.tokenName) <= 0 ? 'error' : ''}
                      help={
                        !data.dirty && Number(data.tokenName) <= 0 ? 'Should be combination of numbers & alphabets' : ''
                      }>
                      <Input placeholder="token name" name="tokenName" onChange={(e) => handleChange(e)} required />
                    </Form.Item>
                    <Form.Item
                      validateStatus={!data.dirty && !data.documentUri ? 'error' : ''}
                      help={!data.dirty && !data.documentUri ? 'Add an url here' : ''}>
                      <Input
                        placeholder="https://url-to-the-nft-file-or-image"
                        name="documentUri"
                        onChange={(e) => handleChange(e)}
                        required
                      />
                    </Form.Item>

                    <div style={{ paddingTop: '10px' }}>
                      <Button onClick={() => submit()}>Create</Button>
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

export default CreateNFTChild;
