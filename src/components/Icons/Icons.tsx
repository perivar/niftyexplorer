/* eslint-disable no-useless-escape */
import React from 'react';
import { withRouter, useHistory } from 'react-router-dom';
import { WalletContext } from '../../utils/context';
import { Input, Button, notification, Spin, Row, Col, Card, Form, Upload, Tooltip, Slider, Switch } from 'antd';
import { PaperClipOutlined, PlusSquareFilled, UploadOutlined } from '@ant-design/icons';
import { RcFile } from 'antd/lib/upload/interface';
import styled from 'styled-components';
import Cropper from 'react-easy-crop';
import Paragraph from 'antd/lib/typography/Paragraph';

import StyledCreate from '../Common/StyledPage';
import { EnhancedModal } from '../Portfolio/EnhancedModal';
import getCroppedImg from '../../utils/cropImage';
import getRoundImg from '../../utils/roundImage';
import getResizedImage from '../../utils/resizeImage';
import { QRCode } from '../Common/QRCode';

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

const Icons = () => {
  const ContextValue = React.useContext(WalletContext);
  const { wallet, balances, loading: loadingContext } = ContextValue;
  const [loading, setLoading] = React.useState(false);
  const [data, setData] = React.useState<any>({
    dirty: true,
    tokenId: '',
    email: ''
  });

  const [fileName, setFileName] = React.useState('');
  const [tokenIconFileList, setTokenIconFileList] = React.useState<any>();
  const [rawImageUrl, setRawImageUrl] = React.useState<any>('');
  const [imageUrl, setImageUrl] = React.useState<any>('');
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
            setData((prev: any) => ({ ...prev, tokenIcon: resizedResult.file }));
            setImageUrl(resizedResult.url);
          },
          fileName
        );
      } else {
        setData((prev: any) => ({ ...prev, tokenIcon: croppedResult.file }));
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

  const getFileSize = (size: any) => size / (1024 * 1024);

  const handleTokenIconImage = (imgFile: any, callback: any) =>
    new Promise((resolve, reject) => {
      setLoading(true);
      try {
        const reader = new FileReader();

        const width = 128;
        const height = 128;
        reader.readAsDataURL(imgFile);

        reader.addEventListener('load', () => setRawImageUrl(reader.result));

        reader.onload = (event: any) => {
          const img: any = new Image();
          img.src = event.target.result;
          img.onload = () => {
            const elem = document.createElement('canvas');
            console.log(`Canvas created`);
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
                setData((prev: any) => ({ ...prev, tokenIcon: file }));
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

  const transformTokenIconFile = (file: any) => {
    return new Promise((resolve, reject) => {
      reject();
      // setLoading(false);
    });
  };

  const beforeTokenIconUpload = (file: RcFile, fileList: RcFile[]): any => {
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
      setData((prev: any) => ({ ...prev, tokenIcon: undefined }));
      setImageUrl('');
      return false;
    }
  };

  const handleChangeTokenIconUpload = (info: any) => {
    const list = [...info.fileList];

    if (info.file.type.split('/')[0] !== 'image') {
      setTokenIconFileList(undefined);
      setImageUrl('');
    } else {
      setTokenIconFileList(list.slice(-1));
    }
  };

  const isInvalidForm = (data: any) =>
    !data.tokenId ||
    !data.email ||
    data.tokenId.length !== 64 ||
    !/^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(
      String(data.email).toLowerCase()
    );

  async function handleSubmitIcon() {
    // console.log(`handleSubmitIcon()`);
    setData({
      ...data,
      dirty: false
    });

    if (isInvalidForm(data)) {
      return;
    }

    setLoading(true);
    const { tokenId } = data;

    let apiTest;
    let apiTestJson;

    try {
      if (data.tokenIcon) {
        // Convert to FormData object for server parsing
        const formData = new FormData();
        for (const key in data) {
          formData.append(key, data[key]);
        }

        const apiUrl = 'https://mint-icons.btctest.net/new';
        // const apiUrl = "http://localhost:3001/new";

        try {
          apiTest = await fetch(apiUrl, {
            method: 'POST',
            // Note: fetch automatically assigns correct header for multipart form based on formData obj
            headers: {
              Accept: 'application/json'
            },
            body: formData
          });
          apiTestJson = await apiTest.json();
          console.log(apiTestJson);

          if (!apiTestJson.approvalRequested) {
            const iconErrorMsg = apiTestJson.msg;
            throw new Error(iconErrorMsg);
          } else {
            window.localStorage.setItem(tokenId, imageUrl);
          }
        } catch (err) {
          console.error(err.message);

          notification.error({
            message: 'Error',
            description: <Paragraph>{`${err.message}`}</Paragraph>,
            duration: 0
          });
        }
      }
      if (typeof apiTestJson === 'undefined') {
        return notification.error({
          message: 'Error',
          description: (
            <Paragraph>{`Rate limit exceeded. Please wait 10 minutes before submitting another icon.`}</Paragraph>
          ),
          duration: 0
        });
      }
      if (apiTestJson.approvalRequested) {
        notification.success({
          message: 'Success',
          description: <Paragraph>Icon submission successful. Check your email for updates.</Paragraph>,
          duration: 2
        });
      }
    } catch (e) {
      let message;
      if (e.message) {
        switch (e.message) {
          case 'An icon already exists for this token ID.':
            message = 'An icon already exists for this token ID.';
            break;
          case 'Document hash must be provided as a 64 character hex string':
            message = e.message;
            break;
          case 'Transaction input NFY amount is too low.  Add more NFY inputs to fund this transaction.':
            message = 'Not enough NFY. Deposit some funds to use this feature.';
            break;
          default:
            message = 'Icon upload failed. Try again later';
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
                    <PlusSquareFilled /> Upload your token icon
                  </h2>
                }
                bordered={true}>
                {!loadingContext && !balances.totalBalance ? (
                  <>
                    {wallet && (
                      <Paragraph>
                        <QRCode id="borderedQRCode" address={wallet && wallet.legacyAddress} />
                      </Paragraph>
                    )}
                    <Paragraph>You currently have 0 NFY.</Paragraph>

                    {wallet ? (
                      <Paragraph>Deposit some NFY to your Mint wallet to enable SLP Icon Creation.</Paragraph>
                    ) : (
                      <Paragraph>
                        Go to the Portfolio page and Create a Wallet. Then deposit some NFY to use the SLP Icons tool.
                      </Paragraph>
                    )}
                    {/* <Paragraph>
                      Get free NFY from the
                      <strong>
                        <a target="_blank" rel="noopener noreferrer" href="https://free.niftycoin.org/">
                          niftycoin.org Faucet
                        </a>
                      </strong>
                      !
                    </Paragraph> */}
                  </>
                ) : (
                  <Form>
                    <Form.Item
                      labelAlign="left"
                      labelCol={{ span: 3, offset: 0 }}
                      colon={false}
                      validateStatus={
                        (!data.dirty && !data.tokenId) || (!data.dirty && data.tokenId.length !== 64) ? 'error' : ''
                      }
                      help={
                        (!data.dirty && !data.tokenId) || (!data.dirty && data.tokenId.length !== 64)
                          ? 'Must be a valid token Id'
                          : ''
                      }
                      required>
                      <Input
                        placeholder="token ID e.g.: dec978f714fab31f43d737e89f3a59ade280111b51610bc850eb2448515e22f1"
                        name="tokenId"
                        onChange={(e) => handleChange(e)}
                        required
                      />
                    </Form.Item>
                    <Form.Item
                      labelAlign="left"
                      labelCol={{ span: 3, offset: 0 }}
                      colon={false}
                      validateStatus={
                        (!data.dirty && !data.email) ||
                        (!data.dirty &&
                          !/^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(
                            String(data.email).toLowerCase()
                          ))
                          ? 'error'
                          : ''
                      }
                      help={
                        (!data.dirty && !data.email) ||
                        (!data.dirty &&
                          !/^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(
                            String(data.email).toLowerCase()
                          ))
                          ? 'Must be a valid email address'
                          : ''
                      }
                      required>
                      <Input placeholder="your email address" name="email" onChange={(e) => handleChange(e)} required />
                    </Form.Item>

                    <Form.Item
                      validateStatus={!data.dirty && !imageUrl ? 'error' : ''}
                      help={!data.dirty && !imageUrl ? 'Must include an icon' : ''}
                      required>
                      <Dragger
                        multiple={false}
                        // transformFile={transformTokenIconFile}
                        beforeUpload={beforeTokenIconUpload}
                        onChange={handleChangeTokenIconUpload}
                        onRemove={() => false}
                        fileList={tokenIconFileList}
                        name="tokenIcon"
                        style={{
                          background: '#D3D3D3',
                          borderRadius: '8px'
                        }}>
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt="avatar"
                            // style={{ maxHeight: "128px", maxWidth: "100%" }}
                          />
                        ) : (
                          <>
                            <UploadOutlined style={{ fontSize: '24px' }} />
                            <p>Click, or drag file to this area to upload</p>
                            <p style={{ fontSize: '12px' }}>Must be an image</p>
                          </>
                        )}
                      </Dragger>

                      {!loading && data.tokenIcon && (
                        <>
                          <Tooltip title={data.tokenIcon.name}>
                            <Paragraph
                              ellipsis
                              style={{
                                lineHeight: 'normal',
                                textAlign: 'center',
                                cursor: 'pointer'
                              }}
                              onClick={() => setShowCropModal(true)}>
                              <PaperClipOutlined />
                              {data.tokenIcon.name}
                            </Paragraph>
                            <Paragraph
                              ellipsis
                              style={{
                                lineHeight: 'normal',
                                textAlign: 'center',
                                marginBottom: '10px'
                              }}>
                              Click on the file name to crop the image
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
                    </Form.Item>

                    <Button
                      onClick={
                        data.tokenIcon || isInvalidForm(data) ? () => handleSubmitIcon() : () => setShowConfirm(true)
                      }>
                      Submit Icon
                    </Button>
                  </Form>
                )}
              </Card>
            </StyledCard>
          </Spin>
        </Col>
      </Row>
    </StyledCreate>
  );
};

export default withRouter(Icons);
