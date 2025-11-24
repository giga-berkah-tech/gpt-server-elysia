import {
  API_URL,
  IMAGE_DALLE_GEN_MODEL,
  IMAGE_DALLE_GEN_SIZE,
  REPLICATE_API_TOKEN,
  GEMINI_API_KEY,
  NEW_IMAGE_BASE_URI,
} from '../utils/constants';
import Replicate from 'replicate';
import axios from 'axios';
import * as https from 'https';
import FormData from 'form-data';
import sharp from 'sharp';
import prisma from '../helpers/prisma_client';
import { clientRedis } from '..';
import { GoogleGenAI } from '@google/genai';
import mime from 'mime';
import fs from 'fs';

/**
 * Generates an image using DALL·E from OpenAI based on the provided prompt.
 *
 * @param image_prompt - The prompt to generate the image.
 * @param clientOpenAi - The OpenAI client instance for making requests.
 * @returns A promise that resolves to the URL of the generated image.
 */
export const generateImageWithDallE = async (
  image_prompt: string,
  clientOpenAi: any
): Promise<string> => {
  const image = await clientOpenAi.images.generate({
    model: IMAGE_DALLE_GEN_MODEL,
    prompt: image_prompt,
    n: 1,
    size: IMAGE_DALLE_GEN_SIZE,
  });
  return image.data[0].url || null;
};

/**
 * Generates an image using Replicate based on the provided prompt.
 *
 * @param image_prompt - The prompt to generate the image.
 * @returns A promise that resolves to the output of the generated image.
 */

export async function generateImageWithGemini(prompt: string, message: any) {
  //generate image with gemini genimage
  const ai = new GoogleGenAI({
    apiKey: GEMINI_API_KEY,
  });

  const response = await ai.models.generateImages({
    model: 'models/imagen-4.0-generate-001',
    prompt,
    config: {
      numberOfImages: 1,
      outputMimeType: 'image/jpeg',
      aspectRatio: '1:1',
      imageSize: '1K',
    },
  });
  if (!response?.generatedImages) {
    console.error('No images generated.');
    return;
  }

  if (response.generatedImages.length !== 1) {
    console.error(
      'Number of images generated does not match the requested number.'
    );
  }

  for (let i = 0; i < response.generatedImages.length; i++) {
    if (!response.generatedImages?.[i]?.image?.imageBytes) {
      continue;
    }

    const inlineData = response?.generatedImages?.[i]?.image?.imageBytes;
    const buffer = Buffer.from(inlineData || '', 'base64');

    const uploadUrl = `${API_URL}/sso/im/upload/v1?fileType=picture`;
    const convertedImageBuffer = await convertWebpToPng(buffer);
    const uploadResponse = await uploadImage(
      uploadUrl,
      convertedImageBuffer,
      message
    );
    let userTenantData: any;

    const getToken: any =
      (await clientRedis.get(`USER_TOKEN_${message.token}`)) ?? '-';

    if (getToken != '-') {
      const tokenData = JSON.parse(getToken);
      const getUserTenant =
        (await clientRedis.get(`USER_DATA_${tokenData.userId}`)) ?? '-';
      userTenantData = JSON.parse(getUserTenant);
    } else {
      throw new Error('Token not found');
    }

    await prisma.imageResults.create({
      data: {
        userId: userTenantData.userId,
        tenant: userTenantData.tenant,
        imageUrl: uploadResponse,
      },
    });

    return uploadResponse;
  }
}

export async function generateImageWithReplicate(prompt: string, message: any) {
  const replicate = new Replicate({ auth: REPLICATE_API_TOKEN });
  const model = 'black-forest-labs/flux-schnell';
  const output = await replicate.run(model, {
    input: {
      prompt,
      go_fast: true,
      megapixels: '1',
      num_outputs: 1,
      aspect_ratio: '1:1',
      output_format: 'webp',
      output_quality: 80,
      num_inference_steps: 4,
    },
  });
  // Some image models return an array of output files, others just a single file.
  const imageUrl = Array.isArray(output) ? output[0].url() : '';

  if (imageUrl) {
    const imageBuffer = await downloadImage(imageUrl);
    const uploadUrl = `${API_URL}/sso/im/upload/v1?fileType=picture`;
    const convertedImageBuffer = await convertWebpToPng(imageBuffer);
    const uploadResponse = await uploadImage(
      uploadUrl,
      convertedImageBuffer,
      message
    );

    let userTenantData: any;

    const getToken: any =
      (await clientRedis.get(`USER_TOKEN_${message.token}`)) ?? '-';

    if (getToken != '-') {
      const tokenData = JSON.parse(getToken);
      const getUserTenant =
        (await clientRedis.get(`USER_DATA_${tokenData.userId}`)) ?? '-';
      userTenantData = JSON.parse(getUserTenant);
    } else {
      throw new Error('Token not found');
    }

    await prisma.imageResults.create({
      data: {
        userId: userTenantData.userId,
        tenant: userTenantData.tenant,
        imageUrl: uploadResponse,
      },
    });

    return uploadResponse;
  } else {
    throw new Error('Failed to generate image URL');
  }
}

async function downloadImage(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const request = https.get(url, (response) => {
      const data: Uint8Array[] = [];

      response.on('data', (chunk: Uint8Array) => {
        data.push(chunk);
      });

      response.on('end', () => {
        const buffer = Buffer.concat(data);
        resolve(buffer);
      });
    });

    request.on('error', (err) => {
      reject(err);
    });
  });
}

async function convertWebpToPng(imageBuffer: Buffer): Promise<Buffer> {
  try {
    const pngBuffer = await sharp(imageBuffer)
      .toFormat('png') // Convert to PNG format
      .toBuffer(); // Get the resulting buffer
    return pngBuffer;
  } catch (error) {
    throw new Error('Error converting image to PNG: ' + error);
  }
}

async function uploadImage(
  uploadUrl: string,
  imageBuffer: Buffer,
  message: any
): Promise<any> {
  try {
    const formData = new FormData();
    formData.append('file', imageBuffer, {
      filename: 'generated_image.jpeg',
      contentType: 'image/jpeg',
    });

    const response = await axios.post(uploadUrl, formData, {
      headers: {
        ...formData.getHeaders(),
        Authorization: message.token,
        'Content-Type': 'multipart/form-data',
      },
    });

    if (response.status !== 200) {
      throw new Error(`Failed to upload image: ${response.statusText}`);
    }

    console.log('Upload Response:', response.data);
    //  filePath: "https://imagelc106.tikgetchat.com/wmsmobile/324d610e-6203-4b70-bf5b-2a8d3a8cf13f.JPEG",
    //     thumbnail: "wmsmobile/324d610e-6203-4b70-bf5b-2a8d3a8cf13f_.jpeg",
    //     fileType: "picture",
    //     fileName: "generated_image.jpeg",
    //     newFileName: "324d610e-6203-4b70-bf5b-2a8d3a8cf13f",
    //     fileSuffix: "JPEG",
    //     fileWidth: 0,
    //     fileHeight: 0,
    //     thumbnailWidth: 205,
    //     thumbnailHeight: 205,
    const imageUri =
      `${NEW_IMAGE_BASE_URI}/${response.data.data.newFileName}.JPEG` ||
      response.data.data.filePath;
    console.log(imageUri);
    return imageUri;
  } catch (error) {
    console.error('Failed to upload image:');
    throw error;
  }
}
