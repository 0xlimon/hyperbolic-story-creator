interface TextGenerationResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

interface ImageGenerationResponse {
  images: Array<{
    image: string;
  }>;
}

const BASE_URL = 'https://api.hyperbolic.xyz/v1';

export const TEXT_MODELS = {
  'meta-llama/Meta-Llama-3-70B-Instruct': 'Meta Llama 3 70B',
  'mistralai/Mixtral-8x7B-Instruct-v0.1': 'Mixtral 8x7B',
  'deepseek-ai/DeepSeek-R1': 'DeepSeek R1',
  'deepseek-ai/DeepSeek-V3': 'DeepSeek V3',
  'Qwen/QwQ-32B': 'Qwen QwQ 32B',
  'Qwen/Qwen2.5-72B-Instruct': 'Qwen 2.5 72B',
  'Qwen/QwQ-32B-Preview': 'Qwen QwQ 32B Preview',
  'NousResearch/Hermes-3-Llama-3.1-70B': 'Hermes 3 Llama 70B',
} as const;

export const IMAGE_MODELS = {
  'SDXL1.0-base': 'Stable Diffusion XL 1.0',
  'SD2': 'Stable Diffusion 2.0',
  'SD1.5': 'Stable Diffusion 1.5',
  'SDXL-turbo': 'SDXL Turbo',
} as const;

export type TextModelType = keyof typeof TEXT_MODELS;
export type ImageModelType = keyof typeof IMAGE_MODELS;

export const generateStory = async (
  prompt: string,
  apiKey: string,
  model: TextModelType,
  maxTokens: number = 0
): Promise<string> => {
  const response = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      messages: [
        {
          role: 'system',
          content: `You are a masterful storyteller who creates expansive, richly detailed, and complete narratives 
          without any length constraints. Your stories should be:

          1. COMPREHENSIVE AND DETAILED:
          - Develop a complete and extensive story arc with thorough setup, development, and resolution
          - Create rich, immersive world-building with extensive atmospheric details
          - Provide deep, nuanced character development with complex character arcs and backstories
          
          2. STRUCTURALLY SOUND:
          - Begin with an expansive introduction that thoroughly establishes the world and characters
          - Build intricate tension and complexity through multiple developed middle sections
          - Deliver a comprehensive conclusion that meaningfully resolves all story elements
          
          3. EMOTIONALLY ENGAGING:
          - Create deep, authentic emotional connections with fully realized characters
          - Include extensive, meaningful dialogue and rich internal character moments
          - Develop complex themes that resonate throughout the entire narrative
          
          4. VISUALLY DESCRIPTIVE:
          - Paint vivid, detailed pictures with rich, evocative language
          - Include comprehensive sensory details that fully immerse readers in each scene
          - Create memorable, striking imagery that enhances the story's depth
          
          Divide your story into as many substantial sections as needed, each thoroughly advancing 
          the narrative while maintaining completeness. Each section should be extensively developed 
          with multiple detailed paragraphs. Take whatever length necessary to fully explore and 
          develop each scene, character moment, and plot point.
          
          Remember: This is a complete, expansive narrative that should fully immerse readers in 
          your world and story. Take all the time and space needed to tell it properly.`,
        },
        {
          role: 'user',
          content: `Create an expansive and richly detailed story about: ${prompt}

          Important: Do not use any markdown formatting or special characters (like *, _, #) in your response.
          Write section titles and headings as plain text.

          Develop this into a comprehensive narrative of whatever length needed, with:
          - A thorough and engaging beginning that fully establishes the world and characters
          - An extensive middle section that deeply explores all conflicts, relationships, and developments
          - A complete and satisfying conclusion that meaningfully resolves every story element
          
          Include extensive:
          - Deep character development with detailed backstories and complex character arcs
          - Rich, immersive descriptions that bring every scene and moment to life
          - Natural, meaningful dialogue that reveals character depth and advances the plot
          - Profound emotional depth and thematic exploration
          
          Take whatever length necessary to tell the complete story. Divide it into as many sections 
          as needed, each thoroughly developed with multiple detailed paragraphs. Format section titles 
          as plain text without any special characters or markdown. This should be a rich, immersive 
          narrative that fully explores every aspect of the story.`,
        },
      ],
      model,
      temperature: 0.7,
      ...(maxTokens > 0 ? { max_tokens: maxTokens } : {}),
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to generate story. Please check your API key and try again.');
  }

  const data: TextGenerationResponse = await response.json();
  return data.choices[0].message.content;
};

export const generateImage = async (
  prompt: string,
  apiKey: string,
  model: ImageModelType
): Promise<string> => {
  const response = await fetch(`${BASE_URL}/image/generation`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model_name: model,
      prompt: `Create a detailed, artistic illustration for this scene: ${prompt}. Focus on creating a visually striking image that captures the mood and key elements of the scene.`,
      height: 1024,
      width: 1024,
      backend: 'auto',
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to generate image. Please check your API key and try again.');
  }

  const data: ImageGenerationResponse = await response.json();
  return data.images[0].image;
};

export const extractSections = (story: string): string[] => {
  // Split by double newlines and get non-empty sections
  const allSections = story
    .split('\n\n')
    .filter(section => section.trim().length > 0)
    .map(section => section.trim());

  // Get the title (first section)
  const title = allSections[0];

  // Get main story sections (skip title)
  const mainSections = allSections.slice(1);

  // Combine shorter sections to reduce the number of images
  const combinedSections: string[] = [];
  let currentSection = '';
  let wordCount = 0;

  for (const section of mainSections) {
    const sectionWords = section.split(/\s+/).length;
    
    if (wordCount + sectionWords < 300) { // Combine sections until about 300 words
      currentSection += (currentSection ? '\n\n' : '') + section;
      wordCount += sectionWords;
    } else {
      if (currentSection) {
        combinedSections.push(currentSection);
      }
      currentSection = section;
      wordCount = sectionWords;
    }
  }

  if (currentSection) {
    combinedSections.push(currentSection);
  }

  // Limit to maximum 5 sections (1 title + 4 content sections)
  const finalSections = [title, ...combinedSections.slice(0, 4)];
  return finalSections;
};