import React, { useState } from 'react';
import QuizGenerator, { Question } from '@/components/QuizGenerator';
import QuizTaking from '@/components/QuizTaking';

type AppState = 'generator' | 'taking';

const Index = () => {
  const [appState, setAppState] = useState<AppState>('generator');
  const [quizQuestions, setQuizQuestions] = useState<Question[]>([]);

  const handleQuizGenerated = (questions: Question[]) => {
    setQuizQuestions(questions);
    setAppState('taking');
  };

  const handleRestart = () => {
    setQuizQuestions([]);
    setAppState('generator');
  };

  return (
    <div className="min-h-screen">
      {appState === 'generator' && (
        <QuizGenerator onQuizGenerated={handleQuizGenerated} />
      )}
      
      {appState === 'taking' && (
        <QuizTaking 
          questions={quizQuestions} 
          onRestart={handleRestart}
        />
      )}
    </div>
  );
};

export default Index;
