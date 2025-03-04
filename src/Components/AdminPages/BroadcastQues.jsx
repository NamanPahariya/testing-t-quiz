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

// Custom hook for screen size
const useScreenSize = () => {
  const [screenSize, setScreenSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
    is4K: window.innerWidth >= 3840,
    is2K: window.innerWidth >= 2560 && window.innerWidth < 3840,
    isFullHD: window.innerWidth >= 1920 && window.innerWidth < 2560,
  });
  
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      setScreenSize({
        width,
        height,
        is4K: width >= 3840,
        is2K: width >= 2560 && width < 3840,
        isFullHD: width >= 1920 && width < 2560,
      });
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  return screenSize;
};

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
  const screenSize = useScreenSize();

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

  // Responsive sizing for timer
  const getTimerSize = () => {
    if (screenSize.is4K) return 140;
    if (screenSize.is2K) return 120;
    if (screenSize.isFullHD) return 100;
    return 90; // Default
  };

  // Responsive stroke width for timer
  const getTimerStrokeWidth = () => {
    if (screenSize.is4K) return 8;
    if (screenSize.is2K) return 6;
    return 4; // Default
  };

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

  // Calculate container width based on screen size
  const getContainerWidth = () => {
    if (screenSize.is4K) return 'max-w-7xl';
    if (screenSize.is2K) return 'max-w-6xl';
    if (screenSize.isFullHD) return 'max-w-5xl';
    return 'max-w-4xl';
  };

  if (quizState.quizEnded) {
    return (
      <QuizEndScreen 
        message={quizState.quizEndMessage} 
        onNavigate={() => navigate("/leaderboard")} 
        screenSize={screenSize}
      />
    );
  }

  if (!quizState.currentQuestion) {
    return <LoadingScreen screenSize={screenSize} />;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-6 lg:p-8 2k-screen:p-10 4k-screen:p-12">
      <JoinSection 
        joinUrl={joinUrl}
        tooltipState={tooltipState}
        onCopy={copyToClipboard}
        screenSize={screenSize}
      />
      
      <div className={`w-full ${getContainerWidth()}`}>
        <QuizProgress
          currentIndex={quizState.currentQuestionIndex}
          totalQuestions={quizState.questionLength}
          progress={quizState.progress}
          timeLimit={quizState.currentQuestion.timeLimit}
          onTimerComplete={handleTimerComplete}
          timerSize={getTimerSize()}
          strokeWidth={getTimerStrokeWidth()}
          screenSize={screenSize}
        />

        <QuizCard
          question={quizState.currentQuestion}
          isTimeUp={quizState.isTimeUp}
          isLastQuestion={quizState.currentQuestionIndex === quizState.questionLength - 1}
          onNext={presentNextQuestion}
          screenSize={screenSize}
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
const QuizEndScreen = ({ message, onNavigate, screenSize }) => (
  <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-6 lg:p-8">
    <Card className={`w-full ${screenSize.is4K ? 'max-w-4xl' : screenSize.is2K ? 'max-w-3xl' : 'max-w-xl'}`}>
      <CardHeader className="text-center p-6 md:p-8 lg:p-10 2k-screen:p-12 4k-screen:p-16">
        <CardTitle className="text-2xl md:text-3xl 2k-screen:text-4xl 4k-screen:text-5xl font-bold text-gray-900 mb-4">
          Quiz Completed!
        </CardTitle>
        <CardDescription className="text-gray-600 text-base md:text-lg 2k-screen:text-xl 4k-screen:text-2xl mt-2 mb-6">
          {message}
        </CardDescription>
        <Button 
          variant="secondary" 
          onClick={onNavigate}
          className="text-sm md:text-base 2k-screen:text-lg 4k-screen:text-xl p-2 md:p-3 2k-screen:p-4 4k-screen:p-5"
        >
          LeaderBoard <TrendingUp className="h-4 w-4 md:h-5 md:w-5 2k-screen:h-6 2k-screen:w-6 ml-2" />
        </Button>
      </CardHeader>
    </Card>
  </div>
);

QuizEndScreen.propTypes = {
  message: PropTypes.string.isRequired,
  onNavigate: PropTypes.func.isRequired,
  screenSize: PropTypes.object.isRequired,
};

// Component for loading screen
const LoadingScreen = ({ screenSize }) => (
  <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
    <Card className={`w-full ${screenSize.is4K ? 'max-w-4xl' : screenSize.is2K ? 'max-w-3xl' : 'max-w-xl'} p-4 md:p-6 2k-screen:p-8 4k-screen:p-10`}>
      <CardHeader className="p-4 md:p-6 2k-screen:p-8 4k-screen:p-10">
        <Skeleton className="h-8 md:h-10 2k-screen:h-12 4k-screen:h-16 w-3/4 mx-auto mb-4" />
        <Skeleton className="h-4 md:h-5 2k-screen:h-6 4k-screen:h-8 w-1/2 mx-auto" />
      </CardHeader>
      <CardContent className="p-4 md:p-6 2k-screen:p-8 4k-screen:p-10">
        <div className="space-y-4 md:space-y-6 2k-screen:space-y-8 4k-screen:space-y-10">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-12 md:h-16 2k-screen:h-20 4k-screen:h-24 w-full" />
          ))}
        </div>
      </CardContent>
    </Card>
  </div>
);

LoadingScreen.propTypes = {
  screenSize: PropTypes.object.isRequired,
};

// Component for join section
const JoinSection = ({ joinUrl, tooltipState, onCopy, screenSize }) => (
  <div className="w-full flex flex-col items-center justify-center space-y-4 md:space-y-6 2k-screen:space-y-8 4k-screen:space-y-10 mt-8 mb-12">
    <h2 className="text-2xl md:text-3xl 2k-screen:text-4xl 4k-screen:text-5xl text-gray-700 font-medium">Join the Quiz at</h2>
    <div className="flex items-center justify-center space-x-3 md:space-x-4">
      <a
        href={`https://${joinUrl}`}
        className={`
          text-3xl md:text-4xl 2k-screen:text-5xl 4k-screen:text-6xl 
          font-bold tracking-tight 
          bg-gradient-to-r from-blue-600 to-indigo-600 
          bg-clip-text text-transparent 
          hover:from-indigo-600 hover:to-blue-600 
          transition-all duration-300
        `}
      >
        telusq.telusko.com/join
      </a>
      <TooltipProvider>
        <Tooltip open={tooltipState.isOpen}>
          <TooltipTrigger asChild>
            <Button
              variant="secondary"
              size={screenSize.is4K || screenSize.is2K ? "lg" : "sm"}
              onClick={() => onCopy(joinUrl)}
              className="hover:bg-blue-100"
            >
              <Link className={`${screenSize.is4K ? 'h-6 w-6' : screenSize.is2K ? 'h-5 w-5' : 'h-4 w-4'}`} />
            </Button>
          </TooltipTrigger>
          <TooltipContent className={screenSize.is4K || screenSize.is2K ? 'text-lg p-3' : 'text-sm p-2'}>
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
  screenSize: PropTypes.object.isRequired,
};

// Component for quiz progress
const QuizProgress = ({ 
  currentIndex, 
  totalQuestions, 
  progress, 
  timeLimit, 
  onTimerComplete,
  timerSize,
  strokeWidth,
  screenSize
}) => (
  <div className="mb-6 md:mb-8 2k-screen:mb-10 4k-screen:mb-12">
    <div className="flex items-center justify-between mb-2 md:mb-4">
      <div className="flex items-center gap-2 md:gap-3">
        <Timer className={`
          ${screenSize.is4K ? 'w-6 h-6' : screenSize.is2K ? 'w-5 h-5' : 'w-4 h-4'} 
          text-gray-500
        `} />
        <span className={`
          ${screenSize.is4K ? 'text-xl' : screenSize.is2K ? 'text-lg' : screenSize.isFullHD ? 'text-base' : 'text-sm'} 
          text-gray-600
        `}>
          Question {currentIndex + 1} of {totalQuestions}
        </span>
      </div>
      <CountdownCircleTimer
        key={currentIndex}
        isPlaying
        duration={timeLimit}
        size={timerSize}
        strokeWidth={strokeWidth}
        colors={["#10B981", "#F59E0B", "#EF4444"]}
        colorsTime={[
          Math.floor(timeLimit * 0.7),
          Math.floor(timeLimit * 0.3),
          0,
        ]}
        onComplete={onTimerComplete}
      >
        {({ remainingTime }) => (
          <span className={`
            ${screenSize.is4K ? 'text-2xl' : screenSize.is2K ? 'text-xl' : screenSize.isFullHD ? 'text-lg' : 'text-sm'} 
            font-medium
          `}>
            {remainingTime}s
          </span>
        )}
      </CountdownCircleTimer>
    </div>
    <Progress 
      value={progress} 
      className={screenSize.is4K ? 'h-4' : screenSize.is2K ? 'h-3' : 'h-2'} 
    />
  </div>
);

QuizProgress.propTypes = {
  currentIndex: PropTypes.number.isRequired,
  totalQuestions: PropTypes.number.isRequired,
  progress: PropTypes.number.isRequired,
  timeLimit: PropTypes.number.isRequired,
  onTimerComplete: PropTypes.func.isRequired,
  timerSize: PropTypes.number.isRequired,
  strokeWidth: PropTypes.number.isRequired,
  screenSize: PropTypes.object.isRequired,
};

// Component for quiz card
const QuizCard = ({ question, isTimeUp, isLastQuestion, onNext, screenSize }) => {
  const options = [
    { id: "option1", value: question.option1 },
    { id: "option2", value: question.option2 },
    { id: "option3", value: question.option3 },
    { id: "option4", value: question.option4 },
  ];

  return (
    <Card className="w-full shadow-lg">
      <CardHeader className="p-6 md:p-8 2k-screen:p-10 4k-screen:p-12">
        <CardTitle className={`
          ${screenSize.is4K ? 'text-4xl' : screenSize.is2K ? 'text-3xl' : screenSize.isFullHD ? 'text-2xl' : 'text-xl'} 
          font-semibold leading-tight
        `}>
          {question.questionText}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 md:p-8 2k-screen:p-10 4k-screen:p-12 pt-0">
        <div className="space-y-4 md:space-y-6 2k-screen:space-y-8">
          {options.map((option) => {
            const isCorrectOption = isTimeUp && question.correctAnswer === option.id;
            return (
              <div key={option.id} className="flex items-center space-x-2">
                <Label
                  htmlFor={option.id}
                  className={`
                    flex-1 p-4 md:p-5 2k-screen:p-6 4k-screen:p-8 
                    rounded-lg transition-colors cursor-pointer 
                    flex justify-between items-center
                    ${screenSize.is4K ? 'text-xl' : screenSize.is2K ? 'text-lg' : screenSize.isFullHD ? 'text-base' : 'text-sm'}
                    ${isCorrectOption 
                      ? 'bg-green-100 hover:bg-green-200' 
                      : 'bg-gray-50 hover:bg-gray-100'
                    }
                  `}
                >
                  <span>{option.value}</span>
                  {isCorrectOption && (
                    <CheckCircle2 className={`
                      ${screenSize.is4K ? 'h-8 w-8' : screenSize.is2K ? 'h-7 w-7' : screenSize.isFullHD ? 'h-6 w-6' : 'h-5 w-5'} 
                      text-green-600
                    `} />
                  )}
                </Label>
              </div>
            );
          })}
        </div>

        <div className="flex justify-end mt-6 md:mt-8 2k-screen:mt-10 4k-screen:mt-12">
          {isLastQuestion ? (
            <Button
              onClick={onNext}
              className={`
                px-6 md:px-8 2k-screen:px-10 
                py-2 md:py-3 2k-screen:py-4 
                ${screenSize.is4K ? 'text-xl' : screenSize.is2K ? 'text-lg' : screenSize.isFullHD ? 'text-base' : 'text-sm'}
              `}
              variant="default"
            >
              Finish
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className={`
                ${screenSize.is4K ? 'h-20 w-20' : screenSize.is2K ? 'h-16 w-16' : screenSize.isFullHD ? 'h-14 w-14' : 'h-12 w-12'} 
                rounded-full
              `}
              onClick={onNext}
            >
              <LucideCircleChevronRight
                style={{ 
                  width: screenSize.is4K ? '60px' : screenSize.is2K ? '50px' : screenSize.isFullHD ? '45px' : '40px', 
                  height: screenSize.is4K ? '60px' : screenSize.is2K ? '50px' : screenSize.isFullHD ? '45px' : '40px' 
                }}
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
  screenSize: PropTypes.object.isRequired,
};

export default BroadcastQues;