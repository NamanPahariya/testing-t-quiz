import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import PropTypes from 'prop-types';
import { Client } from "@stomp/stompjs";
import { CountdownCircleTimer } from "react-countdown-circle-timer";
import { useLocation, useNavigate } from "react-router-dom";
import SockJS from "sockjs-client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import { Button } from "../ui/button";
import { Progress } from "../ui/progress";
import { Label } from "../ui/label";
import { Skeleton } from "../ui/skeleton";
import {
  Timer,
  TrendingUp,
  LucideCircleChevronRight,
  CheckCircle2,
  Link,
} from "lucide-react";

// Constants
const TOOLTIP_COPY_DURATION = 1200;
const TOOLTIP_ERROR_DURATION = 1500;
const INITIAL_TOOLTIP_MESSAGE = "Copy link";

// Custom hook for WebSocket connection
const useWebSocket = (baseUrl, code, onMessageReceived, onCurrentQuestionReceived) => {
  const stompClientRef = useRef(null);

  useEffect(() => {
    const client = new Client({
      webSocketFactory: () => new SockJS(`${baseUrl}/quiz-websocket`),
      onConnect: () => {
        console.log("WebSocket connected");

        client.subscribe(`/topic/quizQuestions/${code}`, onMessageReceived);
        client.subscribe(`/topic/currentQuestion/${code}`, onCurrentQuestionReceived);
      },
      // Add reconnection strategy
      reconnectDelay: 1000,
      heartbeatIncoming: 500,
      heartbeatOutgoing: 500,
    });

    stompClientRef.current = client;
    stompClientRef.current.activate();

    return () => {
      if (stompClientRef.current?.connected) {
        stompClientRef.current.deactivate();
      }
    };
  }, [baseUrl, code, onMessageReceived, onCurrentQuestionReceived]);

  return stompClientRef;
};

// Custom hook for clipboard operations
const useClipboard = () => {
  const [tooltipState, setTooltipState] = useState({
    isOpen: false,
    message: INITIAL_TOOLTIP_MESSAGE,
  });

  const copyToClipboard = useCallback(async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setTooltipState({ isOpen: true, message: "Copied!" });

      setTimeout(() => {
        setTooltipState({ isOpen: false, message: INITIAL_TOOLTIP_MESSAGE });
      }, TOOLTIP_COPY_DURATION);
    } catch (err) {
      console.error("Failed to copy:", err);
      setTooltipState({ isOpen: true, message: "Failed to copy" });

      setTimeout(() => {
        setTooltipState({ isOpen: false, message: INITIAL_TOOLTIP_MESSAGE });
      }, TOOLTIP_ERROR_DURATION);
    }
  }, []);

  return { tooltipState, copyToClipboard };
};

// Main component
const BroadcastQues = () => {
  const baseUrl = import.meta.env.VITE_BASE_URL;
  const location = useLocation();
  const navigate = useNavigate();
  const code = localStorage.getItem("code");

  const initialQuestions = useMemo(
    () => location.state?.questions || [],
    [location.state]
  );

  const [quizState, setQuizState] = useState({
    questionLength: initialQuestions.length,
    currentQuestion: initialQuestions.question||null,
    currentQuestionIndex: 0,
    quizEnded: false,
    quizEndMessage: "",
    progress: 0,
    isTimeUp: false,
  });

  const clientUrl = import.meta.env.VITE_CLIENT_URL || window.location.origin;
  const joinUrl = `${clientUrl}/join/${code}`;
  const { tooltipState, copyToClipboard } = useClipboard();

  // WebSocket message handlers
  const handleQuizMessage = useCallback((message) => {
    const receivedData = JSON.parse(message.body);

    if (receivedData.isQuizEnd) {
      setQuizState(prev => ({
        ...prev,
        quizEnded: true,
        quizEndMessage: receivedData.message,
      }));
      return;
    }
  }, [quizState.quizEnded]);

  const handleCurrentQuestion = useCallback((message) => {
    const receivedQuestion = JSON.parse(message.body);
    setQuizState(prev => ({
      ...prev,
      currentQuestion: receivedQuestion.question,
      isTimeUp: false,
    }));
  }, []);

  const stompClientRef = useWebSocket(
    baseUrl,
    code,
    handleQuizMessage,
    handleCurrentQuestion
  );

  // Question navigation
  const presentNextQuestion = useCallback(() => {
    const { currentQuestionIndex, questionLength } = quizState;
    
    if (currentQuestionIndex < questionLength - 1) {
      const nextIndex = currentQuestionIndex + 1;
      setQuizState(prev => ({
        ...prev,
        currentQuestionIndex: nextIndex,
        progress: ((nextIndex + 1) /questionLength ) * 100,
        isTimeUp: false,
      }));

      stompClientRef.current?.publish({
        destination: `/app/nextQuestion/${code}`,
        body: JSON.stringify({ index: nextIndex }),
      });
    } else {
      stompClientRef.current?.publish({
        destination: `/topic/quizQuestions/${code}`,
        body: JSON.stringify({
          message: "The quiz has ended. Thank you for participating!",
          isQuizEnd: true,
        }),
      });
    }
  }, [quizState, code]);

  const handleTimerComplete = useCallback(() => {
    setQuizState(prev => ({ ...prev, isTimeUp: true }));
    return { shouldRepeat: false };
  }, []);

  if (quizState.quizEnded) {
    return (
      <QuizEndScreen 
        message={quizState.quizEndMessage} 
        onNavigate={() => navigate("/leaderboard")} 
      />
    );
  }

  if (!quizState.currentQuestion) {
    return <LoadingScreen />;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-12">
      <JoinSection 
        joinUrl={joinUrl}
        tooltipState={tooltipState}
        onCopy={copyToClipboard}
      />
      
      <div className="w-full max-w-[3000px] px-16">
        <QuizProgress
          currentIndex={quizState.currentQuestionIndex}
          totalQuestions={quizState.questionLength}
          progress={quizState.progress}
          timeLimit={quizState.currentQuestion.timeLimit}
          onTimerComplete={handleTimerComplete}
        />

        <QuizCard
          question={quizState.currentQuestion}
          isTimeUp={quizState.isTimeUp}
          isLastQuestion={quizState.currentQuestionIndex === quizState.questionLength - 1}
          onNext={presentNextQuestion}
        />
      </div>
    </div>
  );
};

const QuestionType = PropTypes.shape({
  questionText: PropTypes.string.isRequired,
  option1: PropTypes.string.isRequired,
  option2: PropTypes.string.isRequired,
  option3: PropTypes.string.isRequired,
  option4: PropTypes.string.isRequired,
  correctAnswer: PropTypes.string.isRequired,
  timeLimit: PropTypes.number.isRequired,
});

// Component for quiz end screen
const QuizEndScreen = ({ message, onNavigate }) => (
  <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
    <Card className="w-full max-w-4xl p-8">
      <CardHeader className="text-center p-12">
        <CardTitle className="text-6xl font-bold text-gray-900 mb-8">
          Quiz Completed!
        </CardTitle>
        <CardDescription className="text-gray-600 text-3xl mb-12">
          {message}
        </CardDescription>
        <Button 
          variant="secondary" 
          onClick={onNavigate}
          className="text-2xl px-8 py-6 h-auto"
        >
          View Leaderboard <TrendingUp className="h-8 w-8 ml-4" />
        </Button>
      </CardHeader>
    </Card>
  </div>
);

QuizEndScreen.propTypes = {
  message: PropTypes.string.isRequired,
  onNavigate: PropTypes.func.isRequired,
};

// Component for loading screen
const LoadingScreen = () => (
  <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
    <Card className="w-full max-w-4xl p-8">
      <CardHeader className="p-12">
        <Skeleton className="h-16 w-3/4 mx-auto mb-8" />
        <Skeleton className="h-8 w-1/2 mx-auto" />
      </CardHeader>
      <CardContent className="p-12">
        <div className="space-y-8">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </CardContent>
    </Card>
  </div>
);

// Component for join section
const JoinSection = ({ joinUrl, tooltipState, onCopy }) => (
  <div className="w-full flex flex-col items-center justify-center space-y-8 mt-16 mb-24">
    <h2 className="text-5xl text-gray-700 font-medium">Join the Quiz at</h2>
    <div className="flex items-center justify-center space-x-6">
      <a
        href={`https://${joinUrl}`}
        className="text-7xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent hover:from-indigo-600 hover:to-blue-600 transition-all duration-300"
      >
        telusq.telusko.com/join
      </a>
      <TooltipProvider>
        <Tooltip open={tooltipState.isOpen}>
          <TooltipTrigger asChild>
            <Button
              variant="secondary"
              size="lg"
              onClick={() => onCopy(joinUrl)}
              className="hover:bg-blue-100 h-16 w-16"
            >
              <Link className="h-8 w-8" />
            </Button>
          </TooltipTrigger>
          <TooltipContent className="text-2xl p-4">
            <p>{tooltipState.message}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  </div>
);

JoinSection.propTypes = {
  joinUrl: PropTypes.string.isRequired,
  tooltipState: PropTypes.shape({
    isOpen: PropTypes.bool.isRequired,
    message: PropTypes.string.isRequired,
  }).isRequired,
  onCopy: PropTypes.func.isRequired,
};

// Component for quiz progress
const QuizProgress = ({ currentIndex, totalQuestions, progress, timeLimit, onTimerComplete }) => (
  <div className="mb-16">
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-4">
        <Timer className="w-8 h-8 text-gray-500" />
        <span className="text-2xl text-gray-600">
          Question {currentIndex + 1} of {totalQuestions}
        </span>
      </div>
      <CountdownCircleTimer
        key={currentIndex}
        isPlaying
        duration={timeLimit}
        size={180}
        strokeWidth={8}
        colors={["#10B981", "#F59E0B", "#EF4444"]}
        colorsTime={[
          Math.floor(timeLimit * 0.7),
          Math.floor(timeLimit * 0.3),
          0,
        ]}
        onComplete={onTimerComplete}
      >
        {({ remainingTime }) => (
          <span className="text-4xl font-medium">{remainingTime}s</span>
        )}
      </CountdownCircleTimer>
    </div>
    <Progress value={progress} className="h-4" />
  </div>
);

QuizProgress.propTypes = {
  currentIndex: PropTypes.number.isRequired,
  totalQuestions: PropTypes.number.isRequired,
  progress: PropTypes.number.isRequired,
  timeLimit: PropTypes.number.isRequired,
  onTimerComplete: PropTypes.func.isRequired,
};

// Component for quiz card
const QuizCard = ({ question, isTimeUp, isLastQuestion, onNext }) => {
  const options = [
    { id: "option1", value: question.option1 },
    { id: "option2", value: question.option2 },
    { id: "option3", value: question.option3 },
    { id: "option4", value: question.option4 },
  ];

  return (
    <Card className="w-full shadow-2xl">
      <CardHeader className="p-12 pb-6">
        <CardTitle className="text-5xl font-semibold leading-tight">
          {question.questionText}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-12 pt-6">
        <div className="space-y-8">
          {options.map((option) => {
            const isCorrectOption = isTimeUp && question.correctAnswer === option.id;
            return (
              <div key={option.id} className="flex items-center space-x-4">
                <Label
                  htmlFor={option.id}
                  className={`flex-1 p-8 rounded-xl transition-colors cursor-pointer flex justify-between items-center text-3xl
                    ${isCorrectOption 
                      ? 'bg-green-100 hover:bg-green-200' 
                      : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                >
                  <span>{option.value}</span>
                  {isCorrectOption && (
                    <CheckCircle2 className="h-10 w-10 text-green-600" />
                  )}
                </Label>
              </div>
            );
          })}
        </div>

        <div className="flex justify-end mt-12">
          {isLastQuestion ? (
            <Button
              onClick={onNext}
              className="px-12 py-6 text-2xl h-auto"
              variant="default"
            >
              Finish
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="h-24 w-24 rounded-full"
              onClick={onNext}
            >
              <LucideCircleChevronRight
                style={{ width: "80px", height: "80px" }}
              />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

QuizCard.propTypes = {
  question: QuestionType.isRequired,
  isTimeUp: PropTypes.bool.isRequired,
  isLastQuestion: PropTypes.bool.isRequired,
  onNext: PropTypes.func.isRequired,
};

export default BroadcastQues;