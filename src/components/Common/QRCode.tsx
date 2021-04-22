/* eslint-disable jsx-a11y/no-static-element-interactions */
import React, { useState } from 'react';
import styled from 'styled-components';
import RawQRCode from 'qrcode.react';
import nfyLogo from '../../assets/nfy-logo.png';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import { Input, Button } from 'antd';
import { CheckOutlined, CopyOutlined } from '@ant-design/icons';

export const StyledRawQRCode = styled(RawQRCode)`
  cursor: pointer;
  border-radius: 8px;
`;

const AddrHolder = styled.textarea`
  font-size: 18px;
  font-weight: bold;
  resize: none;
  border-radius: 6px !important;
  width: 180px;
  border-radius: 0;
  height: 40px !important;
  border-width: 0;
  padding: 20px 0px 0px 0px !important;
  text-align: center;
  background: #8eaaaf;
  margin-top: 90px;
  margin-left: 15px;
  overflow: hidden;
  line-height: 0 !important;
`;

const StyledInput = styled.div`
  font-size: 12px;
  line-height: 14px;
  resize: none;
  width: 209px;
  border-radius: 5px;
  margin-top: 12px;
  color: black;
  height: 42px;
  .ant-input:hover {
    border-color: rgba(127, 127, 127, 0.1);
    border-right-width: 1px !important;
  }
  .ant-input-disabled:hover {
    border-color: rgba(127, 127, 127, 0.1);
    border-right-width: 1px !important;
  }
  .ant-input[disabled]:hover {
    border-color: rgba(127, 127, 127, 0.1);
    border-right-width: 1px !important;
  }
  .ant-input {
    font-size: 10px;
  }
  input {
    height: 24px;
  }
`;

export const QRCode = ({ address, size = 210, onClick = (evt: any) => null, ...otherProps }: any) => {
  const [visible, setVisible] = useState(false);

  const txtRef = React.useRef<any>(null);

  const handleOnClick = (evt: any) => {
    setVisible(true);
    setTimeout(() => {
      setVisible(false);
    }, 1500);
    onClick(evt);
  };

  const handleOnCopy = () => {
    setVisible(true);
    setTimeout(() => {
      txtRef.current.select();
    }, 100);
  };

  return (
    <div style={{ overflow: 'auto', display: 'inline-block' }}>
      <CopyToClipboard text={address} onCopy={handleOnCopy}>
        <div style={{ overflow: 'auto', position: 'relative' }} onClick={handleOnClick}>
          <AddrHolder
            style={{
              position: 'absolute',
              zIndex: 2,
              display: visible ? '' : 'none'
            }}
            rows={1}
            readOnly
            value="Copied"
          />
          <StyledRawQRCode
            id="borderedQRCode"
            value={address || ''}
            size={size}
            renderAs={'svg'}
            includeMargin
            imageSettings={{
              src: nfyLogo,
              height: 42,
              width: 42,
              excavate: false
            }}
          />
          <StyledInput>
            <Input
              ref={txtRef}
              prefix={<img src={nfyLogo} alt="" width={16} height={16} />}
              value={visible ? address : null}
              placeholder={address}
              disabled={!visible}
              autoComplete="off"
              type="text"
              spellCheck="false"
              addonAfter={<Button ghost type="link" icon={visible ? <CheckOutlined /> : <CopyOutlined />} />}
            />
          </StyledInput>
        </div>
      </CopyToClipboard>
    </div>
  );
};
