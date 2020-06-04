const sharp = require('sharp');
const path = require('path');

const BASE_IMAGE = path.resolve('./content/base.jpg');

const DIGIT_SIZE = { w: 160, h: 200 };

const DIGIT__ = path.resolve('./content/digit-_.png');
const DIGIT_0 = path.resolve('./content/digit-0.png');
const DIGIT_1 = path.resolve('./content/digit-1.png');
const DIGIT_2 = path.resolve('./content/digit-2.png');
const DIGIT_3 = path.resolve('./content/digit-3.png');
const DIGIT_4 = path.resolve('./content/digit-4.png');
const DIGIT_5 = path.resolve('./content/digit-5.png');
const DIGIT_6 = path.resolve('./content/digit-6.png');
const DIGIT_7 = path.resolve('./content/digit-7.png');
const DIGIT_8 = path.resolve('./content/digit-8.png');
const DIGIT_9 = path.resolve('./content/digit-9.png');

const digits = [DIGIT_0, DIGIT_1, DIGIT_2, DIGIT_3, DIGIT_4, DIGIT_5, DIGIT_6, DIGIT_7, DIGIT_8, DIGIT_9];

const compose = (currentNumber, size) => {
  const promiseCallback = (resolve, reject) => {
    const file = path.resolve(__dirname, `temp/result-${size}.png`);
    const previousFile = path.resolve(__dirname, `temp/result-${size - 1}.png`);

    const digit = currentNumber === '_' ? DIGIT__ : digits[currentNumber];
    const width = DIGIT_SIZE.w * (parseInt(size) + 1);
    const height = DIGIT_SIZE.h + 470;
    const sharpOptions = {
      create: {
        width,
        height,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 0 },
      },
    };

    const composite = [{ input: digit, gravity: 'southeast' }];
    if (size > 0) {
      composite.push({ input: previousFile, gravity: 'southwest' });
    }

    sharp(sharpOptions)
      .composite(composite)
      .sharpen()
      .png()
      .toFile(file, (error, info) => {
        if (error) return reject(error);

        return resolve({ ...info, file });
      });
  };
  return new Promise(promiseCallback);
};

const processArray = (items) => {
  const promiseCallback = async (resolve, reject) => {
    try {
      for (const index in items) {
        const result = await compose(parseInt(items[index], index);
      }
      resolve(true);
    } catch (error) {
      reject(error);
    }
  };
  return new Promise(promiseCallback);
};

const generateThumbnail = (numbers) => {
  const file = path.resolve(__dirname, `thumbnail.jpg`);
  const number = path.resolve(__dirname, `temp/result-${numbers.length - 1}.png`);

  const composite = [{ input: number, gravity: 'northwest' }];

  const promiseCallback = async (resolve, reject) => {
    sharp(BASE_IMAGE)
      .composite(composite)
      .sharpen()
      .jpeg({
        quality: 72,
        chromaSubsampling: '4:4:4',
      })
      .toFile(file, (error, info) => {
        if (error) return reject(error);
        return resolve({ ...info, file });
      });
  };
  return new Promise(promiseCallback);
};

const generate = (number) => {
  const numbers = `__________${number}`.slice(-5).split('');
  const promiseCallback = async (resolve, reject) => {
    try {
      const processed = await processArray(numbers);
      const thumbnail = await generateThumbnail(numbers);
      resolve(thumbnail);
    } catch (error) {
      reject(error);
    }
  };

  return new Promise(promiseCallback);
};
module.exports = { generate };
