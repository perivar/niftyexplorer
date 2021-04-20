import React, { useState } from 'react';
import { Row, Col, Card, Alert, Typography, Form, Input, Button, Collapse, Select } from 'antd';
import Icon from '@ant-design/icons';
import StyledConfigure from '../Common/StyledPage';
import { WalletContext } from '../../utils/context';
import { StyledCollapse } from '../Common/StyledCollapse';
const { Paragraph } = Typography;
const { Panel } = Collapse;
const { Option } = Select;

const selectBefore = (protocol: any, handleChangeProcotol: any) => (
  <Select defaultValue={protocol} style={{ width: 90 }} onChange={handleChangeProcotol}>
    <Option value="https://">https://</Option>
    <Option value="http://">http://</Option>
  </Select>
);

// TODO
const getRestUrl = () => {
  return '';
};

export default () => {
  const ContextValue = React.useContext(WalletContext);
  const { wallet } = ContextValue;
  const [visible, setVisible] = useState(true);
  const [option, setOption] = useState(getRestUrl());
  const [protocol, setProtocol] = useState('https://');

  const handleClose = () => setVisible(false);
  const [isConfigUpdated, setIsConfigUpdated] = React.useState(false);
  const [data, setData] = React.useState({
    dirty: true,
    restAPI: window.localStorage.getItem('restAPI')
  });
  const defaultRestUrl = 'https://rest.bitcoin.com/v2/';

  const newRestApiUrl = (protocol: any, restAPI: any) => protocol.concat(restAPI);
  const handleChangeProcotol = (protocol: any) => setProtocol(protocol);
  const isValidCustomRest = (option: any, protocol: any, restAPI: any) =>
    option === 'custom' &&
    // eslint-disable-next-line
    /^(?:http(s)?:\/\/)[\w.-]+(?:\.[\w\.-]+)+[\w\-\._~:/?#[\]@!\$&'\(\)\*\+,;=.]+$/.test(
      newRestApiUrl(protocol, restAPI)
    );

  const handleConfigure = () => {
    setData((p) => ({ ...p, dirty: false }));
    if (
      (option === 'custom' && !isValidCustomRest(option, protocol, data.restAPI)) ||
      (option !== 'custom' && getRestUrl() !== defaultRestUrl && option !== defaultRestUrl) ||
      option === getRestUrl()
    ) {
      return;
    }
    window.localStorage.setItem(
      'restAPI',
      option === 'custom' ? newRestApiUrl(protocol, data.restAPI) : defaultRestUrl
    );
    setIsConfigUpdated(true);
    window.localStorage.setItem('wallet', '');
    setTimeout(() => {
      window.location.reload();
    }, 3000);
  };
  const handleChange = (e: any) => {
    const { value, name } = e.target;
    setData((p) => ({ ...p, [name]: value }));
  };

  return (
    <StyledConfigure>
      <Row justify="center">
        <Col lg={8} span={24}>
          <Card
            title={
              <h2>
                <Icon type="tool" /> Configure
              </h2>
            }
            bordered={true}>
            {visible ? (
              <Alert
                style={{ marginBottom: '10px' }}
                message={
                  <span>
                    <Paragraph>
                      <Icon type="warning" /> Be careful.
                    </Paragraph>
                    <Paragraph>Backup your wallet first.</Paragraph>
                    <Paragraph>Updating the configuration will restart the app.</Paragraph>
                  </span>
                }
                type="warning"
                closable
                afterClose={handleClose}
              />
            ) : null}
            <Form>
              <Form.Item
                validateStatus={
                  !data.dirty && option === 'custom' && !isValidCustomRest(option, protocol, data.restAPI)
                    ? 'error'
                    : ''
                }
                help={
                  !data.dirty && option === 'custom' && !isValidCustomRest(option, protocol, data.restAPI)
                    ? 'Should be something like https://rest.bitcoin.com/v2'
                    : ''
                }>
                <Select defaultValue={getRestUrl()} onChange={(value) => setOption(value)}>
                  <Option value={defaultRestUrl}>{defaultRestUrl}</Option>
                  {getRestUrl() !== defaultRestUrl && <Option value={getRestUrl()}>{getRestUrl()}</Option>}
                  <Option value="custom">
                    <Icon type="edit" /> Choose custom...
                  </Option>
                </Select>

                {option === 'custom' && (
                  <Input
                    spellCheck="false"
                    style={{ marginTop: '10px' }}
                    placeholder={'rest.bitcoin.com/v2/'}
                    name="restAPI"
                    onChange={(e) => handleChange(e)}
                    required
                    addonBefore={selectBefore(protocol, handleChangeProcotol)}
                  />
                )}
              </Form.Item>
              <div style={{ paddingTop: '12px', marginBottom: '10px' }}>
                <Button
                  disabled={!(option === 'custom' || (getRestUrl() !== defaultRestUrl && option === defaultRestUrl))}
                  onClick={() => handleConfigure()}>
                  Update REST API
                </Button>
                {isConfigUpdated && (
                  <Paragraph>
                    Your configuration has been updated. Now connecting to{' '}
                    {option === 'custom' ? newRestApiUrl(protocol, data.restAPI) : defaultRestUrl}
                    ...
                  </Paragraph>
                )}
              </div>
            </Form>
            {wallet && wallet.mnemonic && (
              <StyledCollapse>
                <Panel header="Seed Phrase (Mnemonic)" key="1" disabled={!(wallet || {}).mnemonic}>
                  <p>{wallet && wallet.mnemonic ? wallet.mnemonic : ''}</p>
                </Panel>
              </StyledCollapse>
            )}
          </Card>
        </Col>
      </Row>
    </StyledConfigure>
  );
};
