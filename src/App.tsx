import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  generateStory,
  generateImage,
  extractSections,
  TEXT_MODELS,
  IMAGE_MODELS,
  type TextModelType,
  type ImageModelType,
} from './services/api'
import { generateAudio, type AudioOptions } from './services/audio'
import { AudioPlayer } from './components/AudioPlayer'

function ImageWithLoading({ imageData, alt }: { imageData: string; alt: string }) {
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    setIsLoading(true)
    if (imageData) {
      setIsLoading(false)
    }
  }, [imageData])

  return (
    <div className="relative min-h-[300px] rounded-lg overflow-hidden bg-gray-100">
      {isLoading ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="animate-pulse flex flex-col items-center">
            <svg className="animate-spin h-10 w-10 text-primary-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="mt-2 text-sm text-gray-500">Generating image...</span>
          </div>
        </div>
      ) : (
        <motion.img
          src={`data:image/jpeg;base64,${imageData}`}
          alt={alt}
          className="w-full h-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        />
      )}
    </div>
  )
}

interface Story {
  title: string;
  content: string[];
  images: string[];
}

function TypewriterText({ text }: { text: string }) {
  const [displayText, setDisplayText] = useState('')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [_isComplete, setIsComplete] = useState(false)

  useEffect(() => {
    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setDisplayText(prev => prev + text[currentIndex])
        setCurrentIndex(prev => prev + 1)
        if (currentIndex === text.length - 1) {
          setIsComplete(true)
        }
      }, 2) // Very fast typing speed
      return () => clearTimeout(timeout)
    }
  }, [currentIndex, text])

  return <span className="inline-block">{displayText}</span>
}

function App() {
  const [prompt, setPrompt] = useState('')
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('hyperbolic_api_key') || '')
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [story, setStory] = useState<Story | null>(null)
  const [currentSection, setCurrentSection] = useState(0)
  const [_currentImage, _setCurrentImage] = useState<string | null>(null)
  const [generationStep, setGenerationStep] = useState<'idle' | 'generating-story' | 'generating-image' | 'displaying-section'>('idle')
  const [showApiKeyInput, setShowApiKeyInput] = useState(!apiKey)
  const [pendingImages, setPendingImages] = useState(0)
  const [selectedTextModel, setSelectedTextModel] = useState<TextModelType>('meta-llama/Meta-Llama-3-70B-Instruct')
  const [selectedImageModel, setSelectedImageModel] = useState<ImageModelType>('SDXL1.0-base')
  const [maxTokens, setMaxTokens] = useState<number>(0)
  const [audioData, setAudioData] = useState<string | null>(null)
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false)
  const [selectedLanguage, setSelectedLanguage] = useState<AudioOptions['language']>('EN')
  const [selectedSpeaker, setSelectedSpeaker] = useState('EN-US')

  const SPEAKERS = {
    'EN': ['EN-US', 'EN-BR', 'EN-INDIA', 'EN-AU'],
    'ES': ['ES'],
    'FR': ['FR'],
    'ZH': ['ZH'],
    'JP': ['JP'],
    'KR': ['KR'],
  }

  useEffect(() => {
    if (apiKey) {
      localStorage.setItem('hyperbolic_api_key', apiKey)
    } else {
      localStorage.removeItem('hyperbolic_api_key')
    }
  }, [apiKey])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!apiKey) {
      setError('Please enter your API key first')
      setShowApiKeyInput(true)
      return
    }

    setError(null)
    setIsGenerating(true)
    setGenerationStep('generating-story')
    
    try {
      // Generate the story
      const storyText = await generateStory(prompt, apiKey, selectedTextModel, maxTokens)
      setGenerationStep('generating-image')
      
      // Extract sections from story
      const sections = extractSections(storyText);
      const title = sections[0].split('\n')[0] || 'Generated Story';
      
      // Initialize story with empty images
      setStory({
        title,
        content: sections.slice(1),
        images: new Array(sections.length - 1).fill('')
      });

      // Start displaying sections immediately
      setCurrentSection(sections.length - 1);
      
      setCurrentSection(0);
      setGenerationStep('displaying-section');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate story. Please try again.'
      setError(errorMessage)
      if (errorMessage.includes('API key')) {
        setShowApiKeyInput(true)
      }
      console.error('Error generating story:', err)
    } finally {
      setIsGenerating(false)
    }
  }

  // Handle sequential story display and image generation
  useEffect(() => {
    if (!story || !apiKey || currentSection >= story.content.length) return;

    const generateImageForCurrentSection = async () => {
      try {
        setGenerationStep('generating-image');
        const image = await generateImage(
          story.content[currentSection].slice(0, 200),
          apiKey,
          selectedImageModel
        );
        
        setStory(prev => {
          if (!prev) return null;
          const newImages = [...prev.images];
          newImages[currentSection] = image;
          return { ...prev, images: newImages };
        });
        setPendingImages(prev => Math.max(0, prev - 1));

        // Move to next section quickly
        if (currentSection < story.content.length - 1) {
          setCurrentSection(prev => prev + 1);
        }
      } catch (error) {
        console.error(`Error generating image for section ${currentSection}:`, error);
        // Move to next section despite error after delay
        setTimeout(() => {
          if (currentSection < story.content.length - 1) {
            setCurrentSection(prev => prev + 1);
          }
        }, story.content[currentSection].length * 15 + 1000);
      }
    };

    generateImageForCurrentSection();
  }, [story, currentSection, apiKey, selectedImageModel]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <motion.header 
          className="text-center mb-12"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h1 className="text-5xl font-display font-bold text-primary-900 mb-4">
            Story Creator AI
          </h1>
          <p className="text-xl text-gray-600">
            Create Captivating Stories with Artificial Intelligence
          </p>
        </motion.header>

        {/* API Key Input */}
        <AnimatePresence>
          {showApiKeyInput && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="max-w-2xl mx-auto mb-8"
            >
              <div className="card">
                <h3 className="text-lg font-medium text-gray-700 mb-4">
                  Enter Your Hyperbolic AI API Key
                </h3>
                <div className="flex gap-4">
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="input-field flex-1"
                    placeholder="Your API key..."
                  />
                  <button
                    onClick={() => setShowApiKeyInput(false)}
                    className="btn-secondary whitespace-nowrap"
                    disabled={!apiKey}
                  >
                    Save Key
                  </button>
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  Your API key is stored locally and never sent to our servers.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* API Key Management */}
        {!showApiKeyInput && apiKey && (
          <div className="max-w-2xl mx-auto mb-4 flex justify-end">
            <button
              onClick={() => setShowApiKeyInput(true)}
              className="text-sm text-gray-600 hover:text-primary-600"
            >
              Change API Key
            </button>
          </div>
        )}

        {/* Story Input */}
        <motion.div 
          className="max-w-2xl mx-auto mb-12"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <form onSubmit={handleSubmit} className="card space-y-6">
            {/* Model Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700">
                  Text Generation Model
                </label>
                <select
                  value={selectedTextModel}
                  onChange={(e) => setSelectedTextModel(e.target.value as TextModelType)}
                  className="input-field"
                  disabled={isGenerating}
                >
                  {Object.entries(TEXT_MODELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700">
                  Image Generation Model
                </label>
                <select
                  value={selectedImageModel}
                  onChange={(e) => setSelectedImageModel(e.target.value as ImageModelType)}
                  className="input-field"
                  disabled={isGenerating}
                >
                  {Object.entries(IMAGE_MODELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
            </div>
            {/* Max Tokens Input */}
            <div className="mb-6">
              <label className="block mb-2 text-sm font-medium text-gray-700">
                Max Tokens
              </label>
              <div className="space-y-2">
                <input
                  type="number"
                  value={maxTokens}
                  onChange={(e) => setMaxTokens(Math.max(0, parseInt(e.target.value) || 0))}
                  className="input-field"
                  placeholder="Enter max tokens (0 for unlimited)"
                  min="0"
                  disabled={isGenerating}
                />
                <p className="text-sm text-gray-500">
                  Enter 0 for unlimited token generation. Higher values will limit the story length.
                </p>
              </div>
            </div>

            <label className="block mb-2 text-lg font-medium text-gray-700">
              Your Story Topic
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="input-field min-h-[120px] mb-4"
              placeholder="Enter your story topic or theme..."
              required
              disabled={isGenerating}
            />
            {error && (
              <div className="text-red-500 mb-4">
                {error}
              </div>
            )}
            <motion.button 
              type="submit"
              disabled={isGenerating || !apiKey}
              className="btn-primary w-full flex items-center justify-center"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {isGenerating ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {generationStep === 'generating-story' ? 'Creating Your Story...' : 'Generating Images...'}
                </>
              ) : !apiKey ? 'Enter API Key to Start' : 'Create Story'}
            </motion.button>
          </form>
        </motion.div>

        {/* Story Display */}
        <AnimatePresence>
          {story && (
            <motion.div 
              className="max-w-4xl mx-auto"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
            >
              <div className="card">
                <div className="flex flex-col space-y-4">
                  <motion.h2 
                    className="text-3xl font-display font-bold text-primary-900 mb-6"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    {story.title}
                  </motion.h2>

                  <div>
                    {/* Language and Voice Settings */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Language
                        </label>
                        <select
                          value={selectedLanguage}
                          onChange={(e) => {
                            const lang = e.target.value as AudioOptions['language'];
                            setSelectedLanguage(lang);
                            const speakers = SPEAKERS[lang as keyof typeof SPEAKERS];
                            setSelectedSpeaker(speakers[0]);
                          }}
                          className="input-field w-full"
                          disabled={isGeneratingAudio}
                        >
                          {Object.keys(SPEAKERS).map((lang) => (
                            <option key={lang} value={lang}>{lang}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Voice
                        </label>
                        <select
                          value={selectedSpeaker}
                          onChange={(e) => setSelectedSpeaker(e.target.value)}
                          className="input-field w-full"
                          disabled={isGeneratingAudio}
                        >
                          {SPEAKERS[selectedLanguage as keyof typeof SPEAKERS].map((speaker) => (
                            <option key={speaker} value={speaker}>{speaker}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Audio Controls */}
                    <motion.button 
                      className="btn-primary w-full mb-2"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      disabled={isGeneratingAudio || currentSection < story.content.length - 1}
                      onClick={async () => {
                        try {
                          setIsGeneratingAudio(true);
                          const fullText = [story.title, ...story.content].join('\n\n');
                          const audio = await generateAudio(fullText, apiKey, {
                            language: selectedLanguage,
                            speaker: selectedSpeaker,
                          });
                          setAudioData(audio);
                        } catch (error) {
                          console.error('Error generating audio:', error);
                          alert('Failed to generate audio. Please try again.');
                        } finally {
                          setIsGeneratingAudio(false);
                        }
                      }}
                    >
                      {isGeneratingAudio ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Generating Audio...
                        </>
                      ) : currentSection < story.content.length - 1 ? (
                        'Wait for story completion'
                      ) : (
                        'Convert to Audio'
                      )}
                    </motion.button>

                    {/* Audio Player (directly under the button) */}
                    <div className="w-full mt-2 mb-8">
                      <AnimatePresence>
                        {audioData && (
                          <AudioPlayer
                            audioData={audioData}
                            onClose={() => setAudioData(null)}
                          />
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                  {pendingImages > 0 && (
                    <span className="text-sm text-gray-500 ml-4">
                      Generating images: {pendingImages} remaining...
                    </span>
                  )}
                </div>
                <div className="space-y-8">
                  {story.content.slice(0, currentSection + 1).map((paragraph, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.3 }}
                      className="prose prose-lg max-w-none"
                    >
                      <p className="text-gray-700">
                        <TypewriterText text={paragraph} />
                      </p>
                      <motion.div 
                        className="mt-4"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.3 + 0.2 }}
                      >
                        <ImageWithLoading
                          imageData={story.images[index]}
                          alt={`Story illustration ${index + 1}`}
                        />
                      </motion.div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>

      {/* Footer with Developer Info */}
      <footer className="py-6 mt-8 text-center text-sm text-gray-600 border-t border-gray-200">
        <div className="container mx-auto px-4">
          <p className="mb-2">
            Developed by <a href="https://x.com/zxLimon_" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">0xLimon</a>
          </p>
          <p className="mb-2">
            Powered by Hyperbolic AI APIs
          </p>
          <p>
            <a href="https://github.com/0xlimon/hyperbolic-story-creator" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">
              View on GitHub
            </a>
          </p>
        </div>
      </footer>
    </div>
  )
}

export default App