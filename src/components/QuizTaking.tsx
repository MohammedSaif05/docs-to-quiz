import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowRight, 
  ArrowLeft, 
  Lightbulb, 
  CheckCircle, 
  XCircle, 
  RotateCcw,
  Trophy,
  Brain
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Question } from './QuizGenerator';
import { cn } from '@/lib/utils';

interface QuizTakingProps {
  questions: Question[];
  onRestart: () => void;
}

interface UserAnswer {
  questionIndex: number;
  selectedAnswer: number;
  isCorrect: boolean;
  usedHint: boolean;
}

const QuizTaking: React.FC<QuizTakingProps> = ({ questions, onRestart }) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<UserAnswer[]>([]);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [credits, setCredits] = useState(10);
  const [isQuizComplete, setIsQuizComplete] = useState(false);
  const [usedHints, setUsedHints] = useState<Set<number>>(new Set());

  const currentQuestion = questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === questions.length - 1;
  const hasAnswered = userAnswers.find(a => a.questionIndex === currentQuestionIndex);
  const canUseHint = credits >= 2 && !usedHints.has(currentQuestionIndex);

  const handleOptionSelect = (optionIndex: number) => {
    if (showAnswer) return;
    setSelectedOption(optionIndex);
  };

  const handleNextQuestion = () => {
    if (selectedOption === null && !hasAnswered) return;

    // Record answer if not already answered
    if (!hasAnswered && selectedOption !== null) {
      const isCorrect = selectedOption === currentQuestion.correctAnswerIndex;
      const newAnswer: UserAnswer = {
        questionIndex: currentQuestionIndex,
        selectedAnswer: selectedOption,
        isCorrect,
        usedHint: usedHints.has(currentQuestionIndex),
      };

      setUserAnswers(prev => [...prev, newAnswer]);
      setShowAnswer(true);

      // Show feedback
      toast({
        title: isCorrect ? "Correct!" : "Incorrect!",
        description: isCorrect 
          ? "Well done! Moving to next question." 
          : `The correct answer was: ${currentQuestion.options[currentQuestion.correctAnswerIndex]}`,
        variant: isCorrect ? "default" : "destructive",
      });

      // Auto-advance after showing answer
      setTimeout(() => {
        if (isLastQuestion) {
          setIsQuizComplete(true);
        } else {
          setCurrentQuestionIndex(prev => prev + 1);
          setSelectedOption(null);
          setShowAnswer(false);
        }
      }, 2000);
    } else {
      // Just navigate if already answered
      if (isLastQuestion) {
        setIsQuizComplete(true);
      } else {
        setCurrentQuestionIndex(prev => prev + 1);
        setSelectedOption(null);
        setShowAnswer(false);
      }
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
      setSelectedOption(null);
      setShowAnswer(false);
    }
  };

  const handleUseHint = () => {
    if (!canUseHint) return;

    setCredits(prev => prev - 2);
    setUsedHints(prev => new Set([...prev, currentQuestionIndex]));

    toast({
      title: "💡 Hint",
      description: currentQuestion.hint,
    });
  };

  const calculateScore = () => {
    const totalQuestions = questions.length;
    const correctAnswers = userAnswers.filter(a => a.isCorrect).length;
    const percentage = Math.round((correctAnswers / totalQuestions) * 100);
    return { correctAnswers, totalQuestions, percentage };
  };

  if (isQuizComplete) {
    const { correctAnswers, totalQuestions, percentage } = calculateScore();
    const hintsUsed = usedHints.size;

    return (
      <div className="min-h-screen p-6 flex items-center justify-center">
        <Card className="max-w-2xl w-full shadow-glow card-gradient">
          <CardHeader className="text-center pb-6">
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-primary/10 rounded-2xl">
                <Trophy className="h-12 w-12 text-primary" />
              </div>
            </div>
            <CardTitle className="text-3xl font-bold text-foreground">
              Quiz Complete!
            </CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Score Display */}
            <div className="text-center space-y-2">
              <div className="text-6xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
                {percentage}%
              </div>
              <p className="text-xl text-muted-foreground">
                {correctAnswers} out of {totalQuestions} correct
              </p>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Score</span>
                <span className="text-foreground font-medium">{percentage}%</span>
              </div>
              <Progress value={percentage} className="h-3" />
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-success/10 rounded-lg">
                <CheckCircle className="h-6 w-6 text-success mx-auto mb-2" />
                <div className="text-2xl font-bold text-success">{correctAnswers}</div>
                <div className="text-sm text-muted-foreground">Correct</div>
              </div>
              
              <div className="text-center p-4 bg-destructive/10 rounded-lg">
                <XCircle className="h-6 w-6 text-destructive mx-auto mb-2" />
                <div className="text-2xl font-bold text-destructive">
                  {totalQuestions - correctAnswers}
                </div>
                <div className="text-sm text-muted-foreground">Incorrect</div>
              </div>
              
              <div className="text-center p-4 bg-warning/10 rounded-lg">
                <Lightbulb className="h-6 w-6 text-warning mx-auto mb-2" />
                <div className="text-2xl font-bold text-warning">{hintsUsed}</div>
                <div className="text-sm text-muted-foreground">Hints Used</div>
              </div>
            </div>

            {/* Performance Message */}
            <div className="text-center p-4 bg-primary-subtle rounded-lg">
              <p className="text-foreground font-medium">
                {percentage >= 80 
                  ? "🎉 Excellent work! You have a strong understanding of the material."
                  : percentage >= 60
                  ? "👍 Good job! Consider reviewing the topics you missed."
                  : "📚 Keep studying! Practice makes perfect."
                }
              </p>
            </div>

            {/* Action Button */}
            <div className="flex justify-center pt-4">
              <Button
                size="lg"
                onClick={onRestart}
                className="quiz-gradient px-8 py-3 transition-bounce hover:scale-105"
              >
                <RotateCcw className="mr-2 h-5 w-5" />
                Try Another Quiz
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Brain className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Quiz in Progress</h1>
              <p className="text-muted-foreground">
                Question {currentQuestionIndex + 1} of {questions.length}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <Badge variant="secondary" className="px-3 py-1">
              <Lightbulb className="h-4 w-4 mr-1" />
              {credits} credits
            </Badge>
          </div>
        </div>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="text-foreground font-medium">
              {Math.round(((currentQuestionIndex + 1) / questions.length) * 100)}%
            </span>
          </div>
          <Progress 
            value={((currentQuestionIndex + 1) / questions.length) * 100} 
            className="h-3"
          />
        </div>

        {/* Question Card */}
        <Card className="shadow-card card-gradient">
          <CardHeader>
            <CardTitle className="text-xl text-foreground leading-relaxed">
              {currentQuestion.question}
            </CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {/* Options */}
            <div className="space-y-3">
              {currentQuestion.options.map((option, index) => {
                const isSelected = selectedOption === index;
                const isCorrect = index === currentQuestion.correctAnswerIndex;
                const isUserAnswer = hasAnswered?.selectedAnswer === index;
                
                let buttonVariant: "default" | "outline" | "secondary" = "outline";
                let className = "h-auto p-4 text-left justify-start transition-smooth hover:border-primary";
                
                if (showAnswer || hasAnswered) {
                  if (isCorrect) {
                    className += " border-success bg-success/10 text-success";
                  } else if (isUserAnswer && !isCorrect) {
                    className += " border-destructive bg-destructive/10 text-destructive";
                  }
                } else if (isSelected) {
                  buttonVariant = "default";
                  className += " quiz-gradient text-white";
                }

                return (
                  <Button
                    key={index}
                    variant={buttonVariant}
                    onClick={() => handleOptionSelect(index)}
                    disabled={showAnswer || !!hasAnswered}
                    className={cn("w-full", className)}
                  >
                    <span className="mr-3 text-sm font-medium">
                      {String.fromCharCode(65 + index)}.
                    </span>
                    <span className="flex-1">{option}</span>
                    {showAnswer || hasAnswered ? (
                      isCorrect ? (
                        <CheckCircle className="h-5 w-5 ml-2" />
                      ) : isUserAnswer ? (
                        <XCircle className="h-5 w-5 ml-2" />
                      ) : null
                    ) : null}
                  </Button>
                );
              })}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between items-center pt-4">
              <Button
                variant="outline"
                onClick={handlePreviousQuestion}
                disabled={currentQuestionIndex === 0}
                className="transition-smooth"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Previous
              </Button>

              <Button
                variant="outline"
                onClick={handleUseHint}
                disabled={!canUseHint}
                className="transition-smooth"
              >
                <Lightbulb className="mr-2 h-4 w-4" />
                Hint (-2 credits)
              </Button>

              <Button
                onClick={handleNextQuestion}
                disabled={selectedOption === null && !hasAnswered}
                className="quiz-gradient transition-bounce hover:scale-105"
              >
                {isLastQuestion ? "Finish Quiz" : "Next"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default QuizTaking;