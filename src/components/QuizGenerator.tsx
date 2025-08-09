import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Sparkles, Link, FileText, Globe, Mic, MicOff, Square } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import FileUpload from './FileUpload';
import QuizSettings, { QuizSettingsData } from './QuizSettings';
import { extractTextFromFile } from '@/utils/fileProcessor';

export interface Question {
  question: string;
  options: string[];
  correctAnswerIndex: number;
  hint: string;
}

interface QuizGeneratorProps {
  onQuizGenerated: (questions: Question[]) => void;
}

type InputType = 'file' | 'web' | 'voice';

const QuizGenerator: React.FC<QuizGeneratorProps> = ({ onQuizGenerated }) => {
  const [inputType, setInputType] = useState<InputType>('file');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [webLink, setWebLink] = useState('');
  const [webDescription, setWebDescription] = useState('');
  const [voiceText, setVoiceText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [settings, setSettings] = useState<QuizSettingsData>({
    questionCount: 10,
    difficulty: 'medium',
    questionType: 'mcq',
  });
  const [isGenerating, setIsGenerating] = useState(false);

  // Voice conversation states
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [conversationStep, setConversationStep] = useState<'topic' | 'questions' | 'difficulty'>('topic');
  const conversationStepRef = useRef<'topic' | 'questions' | 'difficulty'>('topic');
  const [voiceResponses, setVoiceResponses] = useState({
    topic: '',
    questionCount: '',
    difficulty: ''
  });
  const voiceResponsesRef = useRef({ topic: '', questionCount: '', difficulty: '' });
  const [isListening, setIsListening] = useState(false);

  const updateVoiceResponses = (partial: Partial<typeof voiceResponses>) => {
    setVoiceResponses(prev => {
      const next = { ...prev, ...partial };
      voiceResponsesRef.current = next;
      return next;
    });
  };

  const updateConversationStep = (step: 'topic' | 'questions' | 'difficulty') => {
    conversationStepRef.current = step;
    setConversationStep(step);
  };

  const speak = (text: string) =>
    new Promise<void>((resolve) => {
      try {
        const synth = window.speechSynthesis;
        if (!synth) {
          resolve();
          return;
        }
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1;
        utterance.pitch = 1;
        utterance.onend = () => resolve();
        utterance.onerror = () => resolve();
        synth.cancel();
        synth.speak(utterance);
      } catch {
        resolve();
      }
    });

  const promptForStep = async (step: 'topic' | 'questions' | 'difficulty') => {
    const promptText =
      step === 'topic'
        ? 'What topic would you like to explore?'
        : step === 'questions'
        ? 'How many questions do you want?'
        : 'What difficulty level? You can say easy, medium, or hard.';
    await speak(promptText);
  };

  const startVoiceConversation = async () => {
    setShowVoiceModal(true);
    updateConversationStep('topic');
    updateVoiceResponses({ topic: '', questionCount: '', difficulty: '' });
    // Speak first, then listen
    await promptForStep('topic');
    startListening();
  };

  const startListening = () => {
    try {
      if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        toast({
          title: "Speech recognition not supported",
          description: "Your browser doesn't support speech recognition.",
          variant: "destructive",
        });
        return;
      }

      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      // Stop any existing session
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          console.warn('Failed to stop previous recognition', e);
        }
      }
      recognitionRef.current = new SpeechRecognition();
      
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onstart = () => {
        setIsListening(true);
      };

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        processVoiceResponse(transcript);
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        if (event.error !== 'no-speech') {
          toast({
            title: "Listening error",
            description: "Please try speaking again.",
            variant: "destructive",
          });
        }
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current.start();
    } catch (error) {
      console.error('Error starting speech recognition:', error);
      toast({
        title: "Listening failed",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  const processVoiceResponse = async (transcript: string) => {
    const lowerTranscript = transcript.toLowerCase();
    const step = conversationStepRef.current;

    switch (step) {
      case 'topic': {
        updateVoiceResponses({ topic: transcript });
        updateConversationStep('questions');
        await promptForStep('questions');
        startListening();
        break;
      }

      case 'questions': {
        // Extract number from speech
        const numberMatch = lowerTranscript.match(/\d+/);
        const questionCount = numberMatch ? numberMatch[0] : '10';
        updateVoiceResponses({ questionCount });
        updateConversationStep('difficulty');
        await promptForStep('difficulty');
        startListening();
        break;
      }

      case 'difficulty': {
        // Map speech to difficulty levels
        let difficulty = 'medium';
        if (lowerTranscript.includes('easy') || lowerTranscript.includes('simple')) {
          difficulty = 'easy';
        } else if (lowerTranscript.includes('hard') || lowerTranscript.includes('difficult') || lowerTranscript.includes('advanced')) {
          difficulty = 'hard';
        }
        updateVoiceResponses({ difficulty });
        
        // Generate quiz with collected information
        generateVoiceQuiz();
        break;
      }
    }
  };

  const buildVoicePrompt = (topic: string, questionCount: number, difficulty: 'easy' | 'medium' | 'hard') => `
You are an expert educational quiz generator for students.

Your task is to create ONLY high-quality, relevant, and educational multiple-choice questions (MCQs) based on the provided topic. Do NOT generate trivia, generic, or unrelated questions. Every question must be directly related to the topic and suitable for student learning and assessment.

Settings:
- Number of Questions: ${questionCount}
- Difficulty: ${difficulty}
- Question Type: MCQ

Topic: ${topic}

Instructions:
- Focus on key concepts, facts, and ideas that are important for students to learn about the topic.
- Avoid questions that are not educational or not related to the topic.
- Each question should have 4 clear, unambiguous options, with only one correct answer.
- Provide a helpful hint for each question that guides the student but does not give away the answer.
- Do NOT include any information or questions that are not related to the topic.
- Do NOT generate questions about unrelated topics.

Return ONLY a valid JSON array in the following format (no extra text):
[
  {
    "question": "What is ...?",
    "options": ["A", "B", "C", "D"],
    "correctAnswerIndex": 2,
    "hint": "It's the component responsible for ..."
  }
]
`; 

  const generateVoiceQuizFrom = async (topic: string, questionCount: number, difficulty: 'easy' | 'medium' | 'hard') => {
    setShowVoiceModal(false);
    setIsGenerating(true);
    
    try {
      // Update settings with voice responses (for UI consistency)
      setSettings({
        questionCount,
        difficulty,
        questionType: 'mcq'
      });

      const systemPrompt = buildVoicePrompt(topic, questionCount, difficulty);

      toast({
        title: "Generating quiz...",
        description: `Topic: ${topic.slice(0, 60)}${topic.length > 60 ? '...' : ''}`,
      });

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: systemPrompt,
                  },
                ],
              },
            ],
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!generatedText) {
        throw new Error('No response from AI');
      }

      const jsonMatch = generatedText.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('Invalid response format from AI');
      }

      const questions: Question[] = JSON.parse(jsonMatch[0]);
      
      if (!Array.isArray(questions) || questions.length === 0) {
        throw new Error('No valid questions generated');
      }

      const isValidFormat = questions.every(q => 
        q.question && Array.isArray(q.options) && q.options.length === 4 &&
        typeof q.correctAnswerIndex === 'number' && q.hint
      );

      if (!isValidFormat) {
        throw new Error('Generated questions have invalid format');
      }

      toast({
        title: "Quiz generated successfully!",
        description: `${questions.length} questions ready to start`,
      });

      onQuizGenerated(questions);

    } catch (error) {
      console.error('Quiz generation error:', error);
      toast({
        title: "Generation failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const generateVoiceQuiz = async () => {
    const topic = voiceResponsesRef.current.topic.trim();
    const questionCount = parseInt(voiceResponsesRef.current.questionCount) || 10;
    const difficulty = (voiceResponsesRef.current.difficulty || 'medium') as 'easy' | 'medium' | 'hard';
    if (!topic) {
      toast({ title: 'Missing topic', description: 'Please provide a topic to generate the quiz.', variant: 'destructive' });
      return;
    }
    await generateVoiceQuizFrom(topic, questionCount, difficulty);
  };

  // Hardcoded API key - replace with your actual Gemini API key
  const GEMINI_API_KEY = 'AIzaSyCf_UP70GSNikkGPFub8T4B3FBeb1fFaj8';

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSpeechTimeRef = useRef<number>(Date.now());

  const isReadyToGenerate = GEMINI_API_KEY &&
    settings.questionCount && settings.difficulty && settings.questionType &&
    ((inputType === 'file' && selectedFile) || 
     (inputType === 'web' && webLink.trim()) || 
     (inputType === 'voice' && voiceText.trim()));

  const generateQuiz = async () => {
    if (!isReadyToGenerate) return;

    setIsGenerating(true);
    
    try {
      let contentSource = '';
      let contentDescription = '';

      if (inputType === 'file') {
      // Extract text from file
      toast({
        title: "Processing document...",
        description: "Extracting text from your file",
      });

      const extractedText = await extractTextFromFile(selectedFile!);
      
      if (!extractedText.trim()) {
        throw new Error('No text could be extracted from the file');
        }

        contentSource = extractedText;
        contentDescription = `Document: ${selectedFile!.name}`;
      } else if (inputType === 'web') {
        // Web link input
        toast({
          title: "Processing web content...",
          description: "Preparing content for quiz generation",
        });

        contentSource = webDescription.trim() 
          ? `Website: ${webLink}\n\nDescription: ${webDescription}`
          : `Website: ${webLink}`;
        contentDescription = `Web Content: ${webLink}`;
      } else if (inputType === 'voice') {
        // Voice input
        toast({
          title: "Processing voice input...",
          description: "Converting speech to text",
        });
        contentSource = voiceText.trim();
        contentDescription = "Voice Input";
      }

      // Prepare system prompt
      const systemPrompt = `
You are an expert educational quiz generator for students.

Your task is to create ONLY high-quality, relevant, and educational multiple-choice questions (MCQs) strictly based on the provided content. Do NOT generate trivia, generic, or unrelated questions. Every question must be directly supported by the content and suitable for student learning and assessment.

Settings:
- Number of Questions: ${settings.questionCount}
- Difficulty: ${settings.difficulty}
- Question Type: ${settings.questionType.toUpperCase()}

Instructions:
- Focus on key concepts, facts, and ideas that are important for students to learn from the content.
- Avoid questions that are not educational or not covered in the content.
- Each question should have 4 clear, unambiguous options, with only one correct answer.
- Provide a helpful hint for each question that guides the student but does not give away the answer.
- Do NOT include any information or questions that are not present in the content.
- Do NOT generate questions about the content structure, metadata, or unrelated topics.

Return ONLY a valid JSON array in the following format (no extra text):
[
  {
    "question": "What is ...?",
    "options": ["A", "B", "C", "D"],
    "correctAnswerIndex": 2,
    "hint": "It's the component responsible for ..."
  }
]

Content Source: ${contentDescription}
Content:
${contentSource}
`;

      toast({
        title: "Generating quiz...",
        description: "AI is creating your questions",
      });

      // Call Gemini API
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: systemPrompt,
                  },
                ],
              },
            ],
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!generatedText) {
        throw new Error('No response from AI');
      }

      // Parse JSON response
      const jsonMatch = generatedText.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('Invalid response format from AI');
      }

      const questions: Question[] = JSON.parse(jsonMatch[0]);
      
      if (!Array.isArray(questions) || questions.length === 0) {
        throw new Error('No valid questions generated');
      }

      // Validate question format
      const isValidFormat = questions.every(q => 
        q.question && Array.isArray(q.options) && q.options.length === 4 &&
        typeof q.correctAnswerIndex === 'number' && q.hint
      );

      if (!isValidFormat) {
        throw new Error('Generated questions have invalid format');
      }

      toast({
        title: "Quiz generated successfully!",
        description: `${questions.length} questions ready to start`,
      });

      onQuizGenerated(questions);

    } catch (error) {
      console.error('Quiz generation error:', error);
      toast({
        title: "Generation failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const startRecording = () => {
    try {
      // Check if browser supports speech recognition
      if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        toast({
          title: "Speech recognition not supported",
          description: "Your browser doesn't support speech recognition. Please use a different browser.",
          variant: "destructive",
        });
        return;
      }

      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onstart = () => {
        setIsRecording(true);
        lastSpeechTimeRef.current = Date.now();
        toast({
          title: "Recording started",
          description: "Start speaking now...",
        });
      };

      recognitionRef.current.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        const newText = finalTranscript + interimTranscript;
        setVoiceText(newText);
        
        // Update last speech time
        lastSpeechTimeRef.current = Date.now();
        
        // Clear existing timeout and set new one
        if (silenceTimeoutRef.current) {
          clearTimeout(silenceTimeoutRef.current);
        }
        
        // Set timeout to detect silence (2 seconds of no speech)
        silenceTimeoutRef.current = setTimeout(() => {
          if (isRecording && newText.trim()) {
            toast({
              title: "Voice input completed",
              description: "Auto-generating quiz from your speech...",
            });
            stopRecording();
            // Auto-trigger quiz generation after a short delay
            setTimeout(() => {
              generateQuiz();
            }, 1000);
          }
        }, 2000);
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsRecording(false);
        if (silenceTimeoutRef.current) {
          clearTimeout(silenceTimeoutRef.current);
        }
        toast({
          title: "Recording error",
          description: event.error === 'no-speech' ? 'No speech detected' : 'Recording failed',
          variant: "destructive",
        });
      };

      recognitionRef.current.onend = () => {
        setIsRecording(false);
        if (silenceTimeoutRef.current) {
          clearTimeout(silenceTimeoutRef.current);
        }
      };

      recognitionRef.current.start();
    } catch (error) {
      console.error('Error starting speech recognition:', error);
      toast({
        title: "Recording failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
    }
  };

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="p-4 bg-primary/10 rounded-2xl shadow-glow">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
            AI Quiz Generator
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Upload a document, provide a web link, or use voice input to let AI create personalized quiz questions
          </p>
        </div>

        {/* Input Type Selection */}
        <Card className="shadow-card transition-smooth">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center space-x-2 text-foreground">
              <Globe className="h-5 w-5 text-primary" />
              <span>Choose Input Method</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <Button
                variant={inputType === 'file' ? 'default' : 'outline'}
                onClick={() => setInputType('file')}
                className="h-16 flex flex-col items-center justify-center space-y-2 transition-smooth"
              >
                <FileText className="h-6 w-6" />
                <span>Upload Document</span>
              </Button>
              <Button
                variant={inputType === 'web' ? 'default' : 'outline'}
                onClick={() => setInputType('web')}
                className="h-16 flex flex-col items-center justify-center space-y-2 transition-smooth"
              >
                <Link className="h-6 w-6" />
                <span>Web Link</span>
              </Button>
              <Button
                variant={inputType === 'voice' ? 'default' : 'outline'}
                onClick={() => setInputType('voice')}
                className="h-16 flex flex-col items-center justify-center space-y-2 transition-smooth"
              >
                <Mic className="h-6 w-6" />
                <span>Voice Input</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Content Input */}
        <div className="space-y-3">
          <h2 className="text-2xl font-semibold text-foreground">
            {inputType === 'file' ? 'Upload Document' : inputType === 'web' ? 'Enter Web Content' : 'Voice Input'}
          </h2>
          
          {inputType === 'file' ? (
          <FileUpload
            onFileSelect={setSelectedFile}
            selectedFile={selectedFile}
            onClearFile={() => setSelectedFile(null)}
          />
          ) : inputType === 'web' ? (
            <Card className="shadow-card transition-smooth">
              <CardContent className="space-y-4 pt-6">
                <div className="space-y-2">
                  <Label htmlFor="webLink" className="text-sm font-medium">
                    Website URL
                  </Label>
                  <Input
                    id="webLink"
                    type="url"
                    placeholder="https://example.com/article"
                    value={webLink}
                    onChange={(e) => setWebLink(e.target.value)}
                    className="transition-smooth focus:border-primary"
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter the URL of the webpage you want to create questions about
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="webDescription" className="text-sm font-medium">
                    Content Description (Optional)
                  </Label>
                  <Textarea
                    id="webDescription"
                    placeholder="Describe the content, topics, or key points you want to focus on for the quiz..."
                    value={webDescription}
                    onChange={(e) => setWebDescription(e.target.value)}
                    className="min-h-[100px] transition-smooth focus:border-primary"
                  />
                  <p className="text-xs text-muted-foreground">
                    Provide a detailed description of the content, main topics, or specific areas you want questions about (optional)
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="shadow-card transition-smooth">
              <CardContent className="space-y-4 pt-6">
                <div className="space-y-4">
                  {/* Voice Conversation Button */}
                  <div className="flex justify-center">
                    <Button
                      onClick={startVoiceConversation}
                      disabled={isGenerating}
                      className="quiz-gradient px-8 py-4 text-lg"
                    >
                      <Mic className="mr-2 h-6 w-6" />
                      Start Voice Conversation
                    </Button>
                  </div>

                  {/* Instructions */}
                  <div className="text-center p-6 bg-gray-50 rounded-lg">
                    <Mic className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600 font-medium">Voice Quiz Creator</p>
                    <p className="text-sm text-gray-500 mt-1">
                      Click to start a voice conversation. I'll ask you about the topic, number of questions, and difficulty level.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Quiz Settings */}
        <div className="space-y-3">
          <h2 className="text-2xl font-semibold text-foreground">Configure Quiz</h2>
          <QuizSettings
            settings={settings}
            onSettingsChange={setSettings}
          />
        </div>

        {/* Generate Button */}
        <div className="flex justify-center pt-4">
          <Button
            size="lg"
            disabled={!isReadyToGenerate || isGenerating}
            onClick={generateQuiz}
            className="quiz-gradient text-lg px-8 py-3 shadow-glow transition-bounce hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Generating Quiz...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-5 w-5" />
                Generate Quiz
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Voice Conversation Modal */}
      {showVoiceModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
            <div className="text-center space-y-6">
              {/* Wave Animation */}
              <div className="flex justify-center space-x-1">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className={`w-2 h-8 bg-primary rounded-full animate-pulse ${
                      isListening ? 'animate-bounce' : ''
                    }`}
                    style={{
                      animationDelay: `${i * 0.1}s`,
                      animationDuration: '0.6s'
                    }}
                  />
                ))}
              </div>

              {/* Conversation Step */}
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-gray-800">
                  {conversationStep === 'topic' && 'What topic would you like to explore?'}
                  {conversationStep === 'questions' && 'How many questions do you want?'}
                  {conversationStep === 'difficulty' && 'What difficulty level?'}
                </h3>
                
                <p className="text-sm text-gray-600">
                  {conversationStep === 'topic' && 'Tell me about the subject or topic you want to quiz on.'}
                  {conversationStep === 'questions' && 'Say a number like "10" or "fifteen".'}
                  {conversationStep === 'difficulty' && 'Say "easy", "medium", or "hard".'}
                </p>

                {/* Response Display */}
                {voiceResponses.topic && (
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>Topic:</strong> {voiceResponses.topic}
                    </p>
                  </div>
                )}
                
                {voiceResponses.questionCount && (
                  <div className="bg-green-50 p-3 rounded-lg">
                    <p className="text-sm text-green-800">
                      <strong>Questions:</strong> {voiceResponses.questionCount}
                    </p>
                  </div>
                )}

                {/* Listening Status */}
                {isListening && (
                  <div className="flex items-center justify-center space-x-2 text-primary">
                    <div className="w-3 h-3 bg-primary rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium">Listening...</span>
                  </div>
                )}
              </div>

              {/* Close Button */}
              <Button
                variant="outline"
                onClick={() => {
                  setShowVoiceModal(false);
                  if (recognitionRef.current) {
                    recognitionRef.current.stop();
                  }
                }}
                className="mt-4"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuizGenerator;