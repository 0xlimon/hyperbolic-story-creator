interface AudioGenerationResponse {
  audio: string;
}

export interface AudioOptions {
  language?: 'EN' | 'ES' | 'FR' | 'ZH' | 'JP' | 'KR';
  speaker?: string;
  sdp_ratio?: number;
  noise_scale?: number;
  noise_scale_w?: number;
  speed?: number;
}

const BASE_URL = 'https://api.hyperbolic.xyz/v1';

export const generateAudio = async (
  text: string,
  apiKey: string,
  options: AudioOptions = {}
): Promise<string> => {
  const response = await fetch(`${BASE_URL}/audio/generation`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      text,
      ...options,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to generate audio. Please check your API key and try again.');
  }

  const data: AudioGenerationResponse = await response.json();
  return data.audio;
};