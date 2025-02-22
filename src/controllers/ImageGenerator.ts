import { API_URL, IMAGE_DALLE_GEN_MODEL, IMAGE_DALLE_GEN_SIZE, REPLICATE_API_TOKEN } from "../utils/constants"
import Replicate from "replicate";
import axios from 'axios';
import * as https from 'https';
import FormData from 'form-data';
import sharp from 'sharp';
import prisma from "../helpers/prisma_client"


/**
 * Generates an image using DALL·E from OpenAI based on the provided prompt.
 * 
 * @param image_prompt - The prompt to generate the image.
 * @param clientOpenAi - The OpenAI client instance for making requests.
 * @returns A promise that resolves to the URL of the generated image.
 */
export const generateImageWithDallE = async (image_prompt: string, clientOpenAi: any): Promise<string> => {
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
export async function generateImageWithReplicate(prompt: string, message: any) {
  const replicate = new Replicate({auth: REPLICATE_API_TOKEN})
  const model = 'black-forest-labs/flux-schnell'  
  const output = await replicate.run(model, {
    input: {
      prompt,
      go_fast: true,
      megapixels: "1",
      num_outputs: 1,
      aspect_ratio: "1:1",
      output_format: "webp",
      output_quality: 80,
      num_inference_steps: 4
    }
  })
  // Some image models return an array of output files, others just a single file.
  const imageUrl = Array.isArray(output) ? output[0].url() : ''
 
  console.log({imageUrl})

  if (imageUrl) {
    const imageBuffer = await downloadImage(imageUrl);
    const uploadUrl = `${API_URL}/sso/im/upload/v1?fileType=picture`;
    const convertedImageBuffer = await convertWebpToPng(imageBuffer);
    const uploadResponse = await uploadImage(uploadUrl, convertedImageBuffer, message);

    await prisma.imageResults.create({
      data: {
        userId: message.userId,
        tenant: message.tenant,
        imageUrl: uploadResponse,
      }
    })

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

async function uploadImage(uploadUrl: string, imageBuffer: Buffer, message: any): Promise<any> {
  try {
    const formData = new FormData();
    formData.append('file', imageBuffer, {
      filename: 'generated_image.png',
      contentType: 'image/png',
    });

    const response = await axios.post(uploadUrl, formData, {
      headers: {
        ...formData.getHeaders(),
        'Authorization': message.token,
        'Content-Type': 'multipart/form-data',
      },
    });

    if (response.status !== 200) {
      throw new Error(`Failed to upload image: ${response.statusText}`);
    }

    console.log('Upload Response:', response.data);
    return response.data.data.filePath;
  } catch (error) {
    console.error('Failed to upload image:');
    throw error;
  }
}