import React, { useState } from 'react';
import { WalletContext } from '../../../utils/context';
import styled from 'styled-components';
import { Card, Form, Button, Spin, notification } from 'antd';
import { DiffFilled } from '@ant-design/icons';
import { Row, Col } from 'antd';
import Paragraph from 'antd/lib/typography/Paragraph';
import broadcastTransaction from '../../../utils/broadcastTransaction';
import { QRCode } from '../../Common/QRCode';

export const StyledButtonWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
`;

const SplitNFTGroup = ({ token, onClose }: any) => {
  const ContextValue = React.useContext(WalletContext);
  const { wallet, balances } = ContextValue;
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);

    try {
      const link = await broadcastTransaction(wallet, 'PREPARE_NFT_GROUP_TOKEN', {
        tokenId: token.tokenId,
        version: token.version,
        amount: token.balance
      });

      notification.success({
        message: 'Success',
        description: (
          <a href={link} target="_blank" rel="noopener noreferrer">
            <Paragraph>NFT Group split succesfully. Click or tap here for more details</Paragraph>
          </a>
        ),
        duration: 3
      });

      onClose();
      setLoading(false);
    } catch (e) {
      const message = e.message || e.error || JSON.stringify(e);

      notification.error({
        message: 'Error',
        description: message,
        duration: 3
      });
      console.error(e);
      setLoading(false);
    }
  }

  return (
    <Row>
      <Col span={24}>
        <Spin spinning={loading}>
          <Card
            title={
              <h2>
                <DiffFilled /> Split NFT Group
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
              <>
                <Row>
                  <Col span={24}>
                    <Paragraph
                      style={{
                        textAlign: 'center',
                        fontWeight: 'bold',
                        color: '#3E3F42'
                      }}>
                      An initial preparation transaction is required before a new NFT can be created. This ensures only
                      1 parent token is burned in the NFT Genesis transaction. After this is transaction is broadcast
                      you can proceed to fill out the NFT details and then click 'Create NFT'
                    </Paragraph>
                  </Col>
                </Row>
                <Row>
                  <Col span={24}>
                    <Form style={{ width: 'auto' }}>
                      <div style={{ paddingTop: '12px' }}>
                        <Button onClick={() => submit()}>Split NFT Group</Button>
                      </div>
                    </Form>
                  </Col>
                </Row>
              </>
            )}
          </Card>
        </Spin>
      </Col>
    </Row>
  );
};

export default SplitNFTGroup;
