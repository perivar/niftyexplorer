import React, { useState } from 'react';
import { WalletContext } from '../../utils/context';
import { Input, Button, Row, Col, Card, Form, Collapse } from 'antd';
import Icon from '@ant-design/icons';
import { Img } from 'react-image';
import StyledOnboarding from '../Common/StyledOnBoarding';
import bitcoinWalletLogo from '../../assets/bitcoin-com-wallet-icon.png';
import badgerWalletLogo from '../../assets/badger-icon.png';
import pixelSquareLogo from '../../assets/pixel-square-icon.png';

export const OnBoarding = ({ history }: any) => {
  const ContextValue = React.useContext(WalletContext);
  const { createWallet } = ContextValue;
  const [formData, setFormData] = useState({
    dirty: true,
    mnemonic: ''
  });
  const [openKey, setOpenKey] = useState('');
  const [warningRead, setWarningRead] = useState(false);

  async function submit() {
    setFormData({
      ...formData,
      dirty: false
    });

    if (!formData.mnemonic) {
      return;
    }

    createWallet(formData.mnemonic);
  }

  const handleChange = (e: any) => {
    const { value, name } = e.target;

    setFormData((p) => ({ ...p, [name]: value }));
  };

  const handleWarning = () => setWarningRead(true);

  const handleCollapseChange = (key: any) => {
    setOpenKey(key);
    setFormData((p) => ({ ...p, mnemonic: '' }));
    if (key !== '2') setWarningRead(false);
  };

  return (
    <StyledOnboarding>
      <Row gutter={8} justify="center">
        <Col lg={8} span={24} style={{ marginTop: 8 }}>
          <Card
            title={
              <h2>
                <Icon type="plus-square" /> New Wallet
              </h2>
            }
            style={{ height: '100%' }}
            bordered={false}>
            <div style={{}}>
              <Button className="bitcoincom-mint-create-wallet" onClick={() => createWallet()}>
                Create
              </Button>
            </div>
          </Card>
        </Col>
        <Col lg={8} span={24} style={{ marginTop: 8 }}>
          <Card
            title={
              <h2>
                <Icon type="import" /> Import Wallet
              </h2>
            }
            bordered={false}>
            <Form style={{ width: 'auto' }}>
              <Collapse accordion onChange={(key) => handleCollapseChange(key)}>
                <Collapse.Panel
                  header={
                    <>
                      <Img style={{ marginBottom: '3px' }} src={pixelSquareLogo} width="16" height="16" />{' '}
                      mint.bitcoin.com wallet
                    </>
                  }
                  key="1"
                  style={{ textAlign: 'left' }}>
                  {openKey === '1' && (
                    <Form.Item
                      validateStatus={!formData.dirty && !formData.mnemonic ? 'error' : ''}
                      help={!formData.dirty && !formData.mnemonic ? 'Should not be empty' : ''}>
                      <Input
                        prefix={<Icon type="lock" />}
                        placeholder="mnemonic (seed phrase)"
                        name="mnemonic"
                        onChange={(e) => handleChange(e)}
                        required
                      />
                    </Form.Item>
                  )}
                </Collapse.Panel>
              </Collapse>

              <div style={{ paddingTop: '12px' }}>
                <Button className="bitcoincom-mint-import-wallet" onClick={() => submit()}>
                  Import
                </Button>
              </div>
            </Form>
          </Card>
        </Col>
      </Row>
      <Row gutter={8} justify="center">
        <Col lg={8} span={24} style={{ marginTop: 8 }}>
          <Card
            title={
              <h2>
                <Icon type="warning" /> Web Wallets
              </h2>
            }
            style={{ height: '100%' }}
            bordered={false}>
            <div style={{}}>
              <p>
                Bitcoin.com Mint is an{' '}
                <a href="https://github.com/Bitcoin-com/mint/" target="_blank" rel="noopener noreferrer">
                  open source,
                </a>{' '}
                non-custodial web wallet supporting SLP and BCH.{' '}
              </p>
              <p>
                {' '}
                Web wallets offer user convenience, but storing large amounts of money on a web wallet is not
                recommended.
              </p>
              <p>Creating your own SLP tokens only costs a few cents worth of BCH.</p>
            </div>
          </Card>
        </Col>
      </Row>
    </StyledOnboarding>
  );
};
