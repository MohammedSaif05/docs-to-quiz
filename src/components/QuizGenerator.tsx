import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Sparkles, Key, AlertCircle } from 'lucide-react';
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

const QuizGenerator: React.FC<QuizGeneratorProps> = ({ onQuizGenerated }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [settings, setSettings] = useState<QuizSettingsData>({
    questionCount: 10,
    difficulty: 'medium',
    questionType: 'mcq',
  });
  const [apiKey, setApiKey] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const isReadyToGenerate = selectedFile && apiKey.trim() && 
    settings.questionCount && settings.difficulty && settings.questionType;

  const generateQuiz = async () => {
    if (!isReadyToGenerate) return;

    setIsGenerating(true);
    
    try {
      // Extract text from file
      toast({
        title: "Processing document...",
        description: "Extracting text from your file",
      });

      const extractedText = await extractTextFromFile(selectedFile!);
      
      if (!extractedText.trim()) {
        throw new Error('No text could be extracted from the file');
      }

      // Prepare system prompt
      const systemPrompt = `
You are an AI quiz generator.

Given the following educational document content and settings:
- Number of Questions: ${settings.questionCount}
- Difficulty: ${settings.difficulty}
- Question Type: ${settings.questionType.toUpperCase()}

Generate high-quality MCQ questions ONLY based on the document content.

Return an array of questions in the following JSON format:
[
  {
    "question": "What is ...?",
    "options": ["A", "B", "C", "D"],
    "correctAnswerIndex": 2,
    "hint": "It's the component responsible for ..."
  }
]

Important: 
- Return ONLY valid JSON array, no extra text
- Make sure questions are directly related to the document content
- Provide clear, unambiguous options
- Hints should be helpful but not give away the answer

Document Content:
${extractedText}
`;

      toast({
        title: "Generating quiz...",
        description: "AI is creating your questions",
      });

      // Call Gemini API
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`,
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
            Upload your document and let AI create personalized quiz questions to test your knowledge
          </p>
        </div>

        {/* API Key Input */}
        <Card className="shadow-card transition-smooth">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center space-x-2 text-foreground">
              <Key className="h-5 w-5 text-primary" />
              <span>Gemini API Key</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="apiKey" className="text-sm font-medium">
                Enter your Google Gemini API key
              </Label>
              <Input
                id="apiKey"
                type="password"
                placeholder="AIza..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="transition-smooth focus:border-primary"
              />
              <p className="text-xs text-muted-foreground flex items-center space-x-1">
                <AlertCircle className="h-3 w-3" />
                <span>Get your free API key from Google AI Studio</span>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* File Upload */}
        <div className="space-y-3">
          <h2 className="text-2xl font-semibold text-foreground">Upload Document</h2>
          <FileUpload
            onFileSelect={setSelectedFile}
            selectedFile={selectedFile}
            onClearFile={() => setSelectedFile(null)}
          />
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
    </div>
  );
};

export default QuizGenerator;