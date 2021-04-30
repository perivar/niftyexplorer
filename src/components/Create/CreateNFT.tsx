/* eslint-disable no-useless-escape */
/* eslint-disable guard-for-in */
import React from 'react';
import { withRouter, useHistory } from 'react-router-dom';
import { WalletContext } from '../../utils/context';
import {
  Input,
  Button,
  notification,
  Spin,
  Row,
  Col,
  Card,
  Form,
  Collapse,
  Upload,
  Tooltip,
  Alert,
  Checkbox,
  Popconfirm,
  Slider,
  Switch
} from 'antd';
import { PaperClipOutlined, InfoCircleOutlined, UploadOutlined, PlusSquareFilled } from '@ant-design/icons';
import styled from 'styled-components';
import Cropper from 'react-easy-crop';
import Paragraph from 'antd/lib/typography/Paragraph';
import createNFTToken from '../../utils/broadcastTransaction';
import StyledCreate from '../Common/StyledPage';
import { EnhancedModal } from '../Portfolio/EnhancedModal';
import { QRCode } from '../Common/QRCode';
import getCroppedImg from '../../utils/cropImage';
import getRoundImg from '../../utils/roundImage';
import getResizedImage from '../../utils/resizeImage';

import * as CryptoJS from 'crypto-js';
import { RcFile } from 'antd/lib/upload/interface';

const { Dragger } = Upload;

const StyledSwitch = styled.div`
  .ant-switch-checked {
    background-color: #f34745 !important;
  }
`;

const StyledCard = styled.div`
  .ant-card-body {
    @media (max-width: 425px) {
      padding: 8px;
    }
  }
  .ant-upload-list-item-info {
    display: none;
  }
  .ant-checkbox-inner {
    border: 1px solid #20242d !important;
  }
  .ant-checkbox-wrapper {
    margin-left: 5px;
  }
`;

const StyledAlert = styled.div`
  margin-bottom: 8px;

  .ant-alert.ant-alert-info.ant-alert-no-icon.ant-alert-closable {
    background: #fff;
  }
  .ant-alert-message {
    font-size: 12px;

    .anticon {
      font-size: 14px;
    }
  }
  .ant-alert-close-icon {
    margin-right: -14px;
  }
`;

const StyledMoreOptionsCollapse = styled.div`
  .ant-collapse-content-box {
    padding: 4px !important;
  }
  .ant-collapse-content.ant-collapse-content-active {
    border: none !important;
  }
`;

const StyledHashCollapse = styled.div`
  .ant-collapse .ant-collapse-header {
    color: #c5c5c7 !important;
  }
  .ant-collapse-content.ant-collapse-content-active {
    padding: 0;
    background: #fff !important;

    .ant-collapse-content-box {
      background: #fff !important;
    }
  }

  .ant-collapse.ant-collapse-borderless.ant-collapse-icon-position-left {
    border: 1px solid #eaedf3;
    border-radius: 8px;
  }
  .ant-collapse-header {
    padding: 8px 12px 8px 12px !important;
    background: #fff;
    border-radius: 8px !important;
    font-weight: bold;
  }
  .ant-collapse-item.ant-collapse-no-arrow {
    border-bottom: none;
  }
  .ant-collapse-item.ant-collapse-item-active.ant-collapse-no-arrow {
    border-bottom: 1px solid #eaedf3;
  }
`;

const CreateNFT = () => {
  const ContextValue = React.useContext(WalletContext);
  const { wallet, balances, loading: loadingContext } = ContextValue;
  const [loading, setLoading] = React.useState(false);

  const [data, setData] = React.useState<any>({
    dirty: true,
    tokenName: '',
    tokenSymbol: '',
    documentHash: '',
    decimals: 0, // a NFT has a decimal of zero
    documentUri: '',
    amount: '',
    email: '',
    fixedSupply: false
  });
  const [hash, setHash] = React.useState('');
  const [fileList, setFileList] = React.useState();
  const [file, setFile] = React.useState<any>();
  const [fileName, setFileName] = React.useState('');
  const [tokenIconFileList, setTokenIconFileList] = React.useState();
  const [rawImageUrl, setRawImageUrl] = React.useState('');
  const [imageUrl, setImageUrl] = React.useState('');
  const [showConfirm, setShowConfirm] = React.useState(false);
  const [showCropModal, setShowCropModal] = React.useState(false);
  const [roundSelection, setRoundSelection] = React.useState(true);

  const [crop, setCrop] = React.useState({ x: 0, y: 0 });
  const [rotation, setRotation] = React.useState(0);
  const [zoom, setZoom] = React.useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = React.useState(null);

  const onCropComplete = React.useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const showCroppedImage = React.useCallback(async () => {
    setLoading(true);

    try {
      const croppedResult: any = await getCroppedImg(rawImageUrl, croppedAreaPixels, rotation, fileName);

      if (roundSelection) {
        const roundResult: any = await getRoundImg(croppedResult.url, fileName);

        await getResizedImage(
          roundResult.url,
          (resizedResult: any) => {
            setData((prev: any) => ({ ...prev, tokenFile: resizedResult.file }));
            setImageUrl(resizedResult.url);
          },
          fileName
        );
      } else {
        setData((prev: any) => ({ ...prev, tokenFile: croppedResult.file }));
        setImageUrl(croppedResult.url);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [croppedAreaPixels, fileName, rawImageUrl, rotation, roundSelection]);

  const onClose = React.useCallback(() => {
    setShowCropModal(false);
  }, []);

  const history = useHistory();

  const getFileSize = (size: number) => size / (1024 * 1024);

  const beforeUpload = (file: RcFile, fileList: RcFile[]): any => {
    try {
      if (getFileSize(file.size) > 25) {
        throw new Error('File must be smaller than 25MB!');
      } else {
        setFile(file);
        setHash('');
        setLoading(true);
      }
    } catch (e) {
      console.error('error', e);
      notification.error({
        message: 'Error',
        description: e.message || e.error || JSON.stringify(e),
        duration: 2
      });
      setFileList(undefined);
      setFile(undefined);
      setHash('');
      return false;
    }
  };

  const handleTokenIconImage = (imgFile: any, callback: any) =>
    new Promise((resolve, reject) => {
      setLoading(true);
      try {
        const reader: any = new FileReader();

        const width = 128;
        const height = 128;
        reader.readAsDataURL(imgFile);

        reader.addEventListener('load', () => setRawImageUrl(reader.result));

        reader.onload = (event: any) => {
          const img = new Image();
          img.src = event.target.result;
          img.onload = () => {
            const elem = document.createElement('canvas');
            // console.log(`Canvas created`);
            elem.width = width;
            elem.height = height;
            const ctx: any = elem.getContext('2d');
            // img.width and img.height will contain the original dimensions
            ctx.drawImage(img, 0, 0, width, height);
            if (!HTMLCanvasElement.prototype.toBlob) {
              Object.defineProperty(HTMLCanvasElement.prototype, 'toBlob', {
                value(callback: any, type: any, quality: any) {
                  const dataURL = this.toDataURL(type, quality).split(',')[1];
                  setTimeout(function () {
                    const binStr = atob(dataURL),
                      len = binStr.length,
                      arr = new Uint8Array(len);
                    for (let i = 0; i < len; i++) {
                      arr[i] = binStr.charCodeAt(i);
                    }
                    callback(new Blob([arr], { type: type || 'image/png' }));
                  });
                }
              });
            }

            ctx.canvas.toBlob(
              (blob: any) => {
                console.log(imgFile.name);

                const fileNameParts = imgFile.name.split('.');
                fileNameParts.pop();
                const fileNamePng = `${fileNameParts.join('.')}.png`;

                const file = new File([blob], fileNamePng, {
                  type: 'image/png'
                });
                setFileName(fileNamePng);
                const resultReader = new FileReader();

                resultReader.readAsDataURL(file);
                setData((prev: any) => ({ ...prev, tokenFile: file }));
                resultReader.addEventListener('load', () => callback(resultReader.result));
                setLoading(false);
                setShowCropModal(true);
                resolve(true);
              },
              'image/png',
              1
            );
          };
        };
      } catch (err) {
        console.log(`Error in handleTokenIconImage()`);
        console.log(err);
        reject(err);
      }
    });

  const beforeTokenImageUpload = (file: RcFile, fileList: RcFile[]): any => {
    try {
      if (file.type.split('/')[0] !== 'image') {
        throw new Error('You can only upload image files!');
      } else {
        setLoading(true);
        handleTokenIconImage(file, (imageUrl: any) => setImageUrl(imageUrl));
      }
    } catch (e) {
      console.error('error', e);
      notification.error({
        message: 'Error',
        description: e.message || e.error || JSON.stringify(e),
        duration: 0
      });
      setTokenIconFileList(undefined);
      setData((prev: any) => ({ ...prev, tokenFile: undefined }));
      setImageUrl('');
      return false;
    }
  };

  const handleChangeTokenImageUpload = (info: any) => {
    const list: any = [...info.fileList];

    if (info.file.type.split('/')[0] !== 'image') {
      setTokenIconFileList(undefined);
      setImageUrl('');
    } else {
      setTokenIconFileList(list.slice(-1));
    }
  };

  const handleChangeUpload = (info: any) => {
    const list: any = [...info.fileList];
    if (getFileSize(info.file.size) > 25) {
      setFileList(undefined);
    } else {
      setFileList(list.slice(-1));
    }
  };

  const isInvalidForm = (data: any) =>
    !data.tokenName ||
    !data.tokenSymbol ||
    !data.amount ||
    Number(data.amount) <= 0 ||
    (data.decimals !== '' && data.decimals < 0) ||
    (data.decimals !== '' && data.decimals > 9) ||
    (data.decimals !== '' && data.decimals % 1 !== 0) ||
    data.decimals === '' ||
    (!data.tokenFile && !data.documentUri);

  async function handleCreateNFTToken() {
    setData({
      ...data,
      dirty: false
    });

    if (isInvalidForm(data)) {
      return;
    }

    setLoading(true);
    const { tokenName, tokenSymbol, documentUri, amount, decimals, fixedSupply } = data;

    try {
      let docUri = documentUri || '';

      if (data.tokenFile) {
        const apiUrl = process.env.REACT_APP_FILE_API_URL;
        if (!apiUrl) {
          throw new Error('Missing API Server config: REACT_APP_FILE_API_URL');
        }

        // Convert to FormData object for server parsing
        const formData = new FormData();
        for (const key in data) {
          formData.append(key, data[key]);
        }

        try {
          const apiTest = await fetch(apiUrl, {
            method: 'POST',
            // Note: fetch automatically assigns correct header for multipart form based on formData obj
            headers: {
              Accept: 'application/json'
            },
            body: formData
          });
          const apiTestJson = await apiTest.json();

          if (!apiTestJson.approvalRequested) {
            throw new Error('Error in uploading token file');
          }

          docUri = apiTestJson.DataSourceFileName;
        } catch (err) {
          console.error(err.message);

          notification.error({
            message: 'Error',
            description: <Paragraph>{`Error in uploading token file!`}</Paragraph>,
            duration: 0
          });
        }
      }
      if (docUri === '') throw new Error('No token file!');

      const link: any = await createNFTToken(wallet, 'CREATE_NFT_TOKEN', {
        name: tokenName,
        symbol: tokenSymbol,
        documentHash: '',
        decimals,
        docUri,
        initialTokenQty: amount,
        fixedSupply
      });

      notification.success({
        message: 'Success',
        description: (
          <a href={link} target="_blank" rel="noopener noreferrer">
            <Paragraph>Create token transaction successful. Click or tap here for more details</Paragraph>
          </a>
        ),
        duration: 2
      });

      history.push('/portfolio');
    } catch (e) {
      let message;
      if (e.message) {
        switch (e.message) {
          case 'Transaction has no inputs':
            message = 'Insufficient balance';
            break;
          case 'Document hash must be provided as a 64 character hex string':
            message = e.message;
            break;
          case 'Transaction input NFY amount is too low.  Add more NFY inputs to fund this transaction.':
            message = 'Not enough NFY. Deposit some funds to use this feature.';
            break;
          default:
            message = 'Transaction Failed. Try again later';
            break;
        }
      } else if (/Could not communicate with full node or other external service/.test(e.error)) {
        message = 'Could not communicate with API. Please try again.';
      } else {
        message = e.error || JSON.stringify(e);
      }

      notification.error({
        message: 'Error',
        description: message,
        duration: 2
      });
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const handleChange = (e: any) => {
    const { value, name } = e.target;

    setData((p: any) => ({ ...p, [name]: value }));
  };

  const handleCheckbox = (e: any) => {
    const { checked, name } = e.target;
    setData((p: any) => ({ ...p, [name]: checked }));
  };

  return (
    <StyledCreate>
      <Row justify="center">
        <Col lg={12} span={24}>
          <Spin spinning={loading || loadingContext}>
            <StyledCard>
              <Card
                title={
                  <h2>
                    <PlusSquareFilled /> Create NFT
                  </h2>
                }
                bordered={true}>
                <div>
                  {!loadingContext && !balances.totalBalance ? (
                    <>
                      <Paragraph>
                        <QRCode id="borderedQRCode" address={wallet && wallet.legacyAddress} />
                      </Paragraph>
                      <Paragraph>You currently have 0 NFY.</Paragraph>
                      <Paragraph>
                        Deposit some NFY in order to pay for the transaction that will generate the token.
                      </Paragraph>
                    </>
                  ) : null}
                </div>
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
                    labelAlign="left"
                    labelCol={{ span: 3, offset: 0 }}
                    colon={false}
                    required
                    validateStatus={!data.dirty && Number(data.amount) <= 0 ? 'error' : ''}
                    help={!data.dirty && Number(data.amount) <= 0 ? 'Should be greater than 0' : ''}>
                    <Input
                      style={{ padding: '0px 20px' }}
                      placeholder="quantity"
                      name="amount"
                      onChange={(e) => handleChange(e)}
                      required
                      type="number"
                    />
                  </Form.Item>

                  <Form.Item
                    style={{ textAlign: 'left' }}
                    labelAlign="left"
                    labelCol={{ span: 3, offset: 0 }}
                    colon={false}>
                    <Checkbox name="fixedSupply" checked={data.fixedSupply} onChange={(e) => handleCheckbox(e)}>
                      Fixed Supply?
                    </Checkbox>
                    <Tooltip title="If you create a fixed supply token, you will not be able to mint additional supply for this token in the future.">
                      <InfoCircleOutlined />
                    </Tooltip>
                  </Form.Item>

                  <Collapse style={{ marginBottom: '24px' }} accordion>
                    <Collapse.Panel header={<>Add image</>} key="1" style={{ textAlign: 'left' }}>
                      <Form.Item
                        validateStatus={!data.dirty && Number(data.documentUri) <= 0 ? 'error' : ''}
                        help={
                          !data.dirty && Number(data.documentUri) <= 0
                            ? 'Should be combination of numbers & alphabets'
                            : ''
                        }>
                        <Input
                          placeholder="Url to the NFT file / image"
                          name="documentUri"
                          onChange={(e) => handleChange(e)}
                          required
                        />
                      </Form.Item>
                      <Form.Item>
                        <Dragger
                          multiple={false}
                          beforeUpload={beforeTokenImageUpload}
                          onChange={handleChangeTokenImageUpload}
                          onRemove={() => false}
                          fileList={tokenIconFileList}
                          name="tokenFile"
                          style={{
                            background: '#D3D3D3',
                            borderRadius: '8px'
                          }}>
                          {imageUrl ? (
                            <img src={imageUrl} alt="avatar" style={{ maxHeight: '128px', maxWidth: '100%' }} />
                          ) : (
                            <>
                              <UploadOutlined style={{ fontSize: '24px' }} />
                              <p>Click, or drag file to this area to upload</p>
                              <p style={{ fontSize: '12px' }}>Must be an image</p>
                            </>
                          )}
                        </Dragger>

                        {!loading && data.tokenFile && (
                          <>
                            <Tooltip title={data.tokenFile.name}>
                              <Paragraph
                                ellipsis
                                style={{
                                  lineHeight: 'normal',
                                  textAlign: 'center',
                                  cursor: 'pointer'
                                }}
                                onClick={() => setShowCropModal(true)}>
                                <PaperClipOutlined />
                                {data.tokenFile.name}
                              </Paragraph>
                              <Paragraph
                                ellipsis
                                style={{
                                  lineHeight: 'normal',
                                  textAlign: 'center',
                                  marginBottom: '10px',
                                  cursor: 'pointer'
                                }}
                                onClick={() => setShowCropModal(true)}>
                                Click here to crop or zoom your icon
                              </Paragraph>
                            </Tooltip>
                          </>
                        )}

                        <EnhancedModal
                          style={{ marginTop: '8px', textAlign: 'left' }}
                          expand={showCropModal}
                          onClick={() => null}
                          renderExpanded={() => (
                            <>
                              <Cropper
                                showGrid={false}
                                zoomWithScroll={false}
                                image={rawImageUrl}
                                crop={crop}
                                zoom={zoom}
                                rotation={rotation}
                                cropShape={roundSelection ? 'round' : 'rect'}
                                aspect={1 / 1}
                                onCropChange={setCrop}
                                onCropComplete={onCropComplete}
                                onZoomChange={setZoom}
                                onRotationChange={setRotation}
                                // style={{ top: '80px' }}
                              />
                              <StyledSwitch>
                                <Switch
                                  style={{ color: '#F34745' }}
                                  // name="cropShape"
                                  onChange={(checked) => setRoundSelection(!checked)}
                                />
                                {roundSelection ? 'Change to Square Crop Shape' : 'Change to Round Crop Shap'}
                              </StyledSwitch>
                              {'Zoom:'}
                              <Slider
                                defaultValue={1}
                                onChange={(zoom: any) => setZoom(zoom)}
                                min={1}
                                max={10}
                                step={0.1}
                              />
                              {'Rotation:'}
                              <Slider
                                defaultValue={0}
                                onChange={(rotation: any) => setRotation(rotation)}
                                min={0}
                                max={360}
                                step={1}
                              />
                              <Button onClick={() => showCroppedImage() && onClose()}>Save changes</Button>
                            </>
                          )}
                          onClose={onClose}
                        />
                        {/* Upload token icon
                        <Input
                          type="file"
                          placeholder="Token Icon"
                          name="tokenFile"
                          onChange={e => handleChangeFile(e)}
                        /> */}
                      </Form.Item>
                    </Collapse.Panel>
                  </Collapse>

                  <div style={{ paddingTop: '12px' }}>
                    <Popconfirm
                      visible={!data.tokenFile && !isInvalidForm(data) && showConfirm}
                      title="Are you sure you want to create a token without an icon？"
                      onConfirm={() => handleCreateNFTToken()}
                      onCancel={() => setShowConfirm(false)}
                      okText="Yes"
                      cancelText="No"
                      placement="top">
                      <Button
                        onClick={
                          data.tokenFile || isInvalidForm(data)
                            ? () => handleCreateNFTToken()
                            : () => setShowConfirm(true)
                        }>
                        Create Token
                      </Button>
                    </Popconfirm>
                  </div>
                </Form>
              </Card>
            </StyledCard>
          </Spin>
        </Col>
      </Row>
    </StyledCreate>
  );
};

export default withRouter(CreateNFT);
