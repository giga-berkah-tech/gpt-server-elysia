import { IMAGE_DALLE_GEN_MODEL, IMAGE_DALLE_GEN_SIZE, REPLICATE_API_TOKEN } from "../utils/constants"
import Replicate from "replicate";


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
export async function generateImageWithReplicate(prompt: string) {
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
  
  return imageUrl
} 

