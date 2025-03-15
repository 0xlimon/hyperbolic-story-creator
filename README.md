# Story Creator AI

A powerful web application that leverages AI to generate creative stories with matching images and audio narration.

## Features

- **AI Story Generation**: Generate unique stories based on user-provided topics or themes using advanced language models
- **Image Illustration**: Automatically create relevant images for each section of your story 
- **Audio Narration**: Convert your story to spoken audio
- **Model Selection**: Choose from different text and image generation models
- **Token Control**: Set limits on story length with token controls

## Technologies Used

- React with TypeScript
- Tailwind CSS for styling
- Framer Motion for animations
- Hyperbolic AI APIs for:
  - Text generation (multiple LLM models)
  - Image creation (various diffusion models)
  - Text-to-speech conversion

## Prerequisites

Before you start, make sure you have:

- Node.js (v18.0.0 or later)
- npm or yarn package manager
- A Hyperbolic AI API key (obtain from [Hyperbolic AI](https://hyperbolic.ai))

## Setup Instructions

1. **Clone the repository**

```bash
git clone https://github.com/0xlimon/hyperbolic-story-creator.git
cd hyperbolic-story-creator
```

2. **Install dependencies**

```bash
# Using npm
npm install

# Using yarn
yarn
```

3. **Start the development server**

```bash
# Using npm
npm run dev

# Using yarn
yarn dev
```

4. **Build for production**

```bash
# Using npm
npm run build

# Using yarn
yarn build
```

## Usage

1. Open the application in your browser
2. Enter your Hyperbolic AI API key when prompted (this is stored locally in your browser's localStorage)
3. Select the text generation model you prefer
4. Choose an image generation model
5. (Optional) Set a maximum token limit for the story length
6. Enter a story topic, theme, or starting prompt
7. Click "Create Story" and wait for the AI to generate your content
8. Once the story and images have been generated, you can:
   - Read through the illustrated story
   - Select a language and voice for audio narration
   - Click "Convert to Audio" to generate spoken narration
   - Use the audio player controls to listen to your story

## API Key

This application requires a Hyperbolic AI API key to function. Your API key is stored locally in your browser's localStorage and is never sent to our servers. The key is only used to make direct API calls to Hyperbolic's services.

## Customization

You can customize the application by:

- Modifying the UI in `src/App.tsx`
- Adjusting the styling in `src/index.css`
- Configuring Tailwind themes in `tailwind.config.js`
- Extending the API service functions in `src/services/api.ts`

## Troubleshooting

Common issues:

- **API Key Errors**: Ensure your Hyperbolic AI API key is valid and has sufficient credits
- **Generation Failures**: Check your internet connection and try again
- **Audio Not Playing**: Make sure your browser supports the audio format and has permission to play audio

## Developer

Developed by [0xLimon](https://x.com/zxLimon_)

## Repository

[GitHub Repository](https://github.com/0xlimon/hyperbolic-story-creator)

## License

This project is open source and available under the MIT License.