import * as React from 'react';
import { Form, Input } from 'antd';
import styled from 'styled-components';

export const InputAddonText = styled.span`
  width: 100%;
  height: 100%;
  display: block;

  ${(props: any) =>
    props.disabled
      ? `
      cursor: not-allowed;
      `
      : `cursor: pointer;`}
`;

export const FormItemWithMaxAddon = ({ onMax, inputProps, ...otherProps }: any) => {
  return (
    <Form.Item {...otherProps}>
      <Input
        // prefix={<img src={nfyLogo} alt="" width={16} height={16} />}
        addonAfter={<InputAddonText onClick={!(inputProps || {}).disabled && onMax}>max</InputAddonText>}
        {...inputProps}
      />
    </Form.Item>
  );
};
