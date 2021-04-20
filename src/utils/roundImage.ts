const createImage = (url: any) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous');
    image.src = url;
  });

export default async function getRoundImg(imageSrc: any, fileName: any) {
  const image: any = await createImage(imageSrc);
  console.log('image :', image);
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx: any = canvas.getContext('2d');

  ctx.drawImage(image, 0, 0);
  ctx.globalCompositeOperation = 'destination-in';
  ctx.beginPath();
  ctx.arc(image.width / 2, image.height / 2, image.height / 2, 0, Math.PI * 2);
  ctx.closePath();
  ctx.fill();
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
  return new Promise((resolve) => {
    ctx.canvas.toBlob(
      (blob: any) => {
        const file = new File([blob], fileName, {
          type: 'image/png'
        });
        const resultReader = new FileReader();

        resultReader.readAsDataURL(file);

        resultReader.addEventListener('load', () => resolve({ file, url: resultReader.result }));
      },
      'image/png',
      1
    );
  });
}
