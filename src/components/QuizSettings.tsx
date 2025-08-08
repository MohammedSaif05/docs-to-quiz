import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings, Hash, Target, MessageCircle } from 'lucide-react';

export interface QuizSettingsData {
  questionCount: number;
  difficulty: string;
  questionType: string;
}

interface QuizSettingsProps {
  settings: QuizSettingsData;
  onSettingsChange: (settings: QuizSettingsData) => void;
}

const QuizSettings: React.FC<QuizSettingsProps> = ({
  settings,
  onSettingsChange,
}) => {
  const updateSettings = (key: keyof QuizSettingsData, value: any) => {
    onSettingsChange({
      ...settings,
      [key]: value,
    });
  };

  const settingsConfig = [
    {
      key: 'questionCount' as keyof QuizSettingsData,
      label: 'Number of Questions',
      icon: Hash,
      options: [
        { value: 5, label: '5 Questions' },
        { value: 10, label: '10 Questions' },
        { value: 15, label: '15 Questions' },
        { value: 20, label: '20 Questions' },
      ],
    },
    {
      key: 'difficulty' as keyof QuizSettingsData,
      label: 'Difficulty Level',
      icon: Target,
      options: [
        { value: 'easy', label: 'Easy' },
        { value: 'medium', label: 'Medium' },
        { value: 'hard', label: 'Hard' },
      ],
    },
    {
      key: 'questionType' as keyof QuizSettingsData,
      label: 'Question Type',
      icon: MessageCircle,
      options: [
        { value: 'mcq', label: 'Multiple Choice (MCQ)' },
      ],
    },
  ];

  return (
    <Card className="shadow-card transition-smooth">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center space-x-2 text-foreground">
          <Settings className="h-5 w-5 text-primary" />
          <span>Quiz Settings</span>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {settingsConfig.map(({ key, label, icon: Icon, options }) => (
          <div key={key} className="space-y-2">
            <Label className="flex items-center space-x-2 text-sm font-medium text-foreground">
              <Icon className="h-4 w-4 text-primary" />
              <span>{label}</span>
            </Label>
            
            <Select
              value={settings[key]?.toString() || ''}
              onValueChange={(value) => {
                const parsedValue = key === 'questionCount' ? parseInt(value) : value;
                updateSettings(key, parsedValue);
              }}
            >
              <SelectTrigger className="transition-smooth hover:border-primary focus:border-primary">
                <SelectValue placeholder={`Select ${label.toLowerCase()}`} />
              </SelectTrigger>
              
              <SelectContent>
                {options.map((option) => (
                  <SelectItem 
                    key={option.value} 
                    value={option.value.toString()}
                    className="cursor-pointer"
                  >
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default QuizSettings;