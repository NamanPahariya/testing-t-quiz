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

// Custom hook to detect 4K resolution
const use4KDisplay = () => {
  const [is4K, setIs4K] = useState(false);
  
  useEffect(() => {
    const checkResolution = () => {
      setIs4K(window.innerWidth >= 3800 && window.innerHeight >= 2000);
    };
    
    checkResolution();
    window.addEventListener('resize', checkResolution);
    
    return () => window.removeEventListener('resize', checkResolution);
  }, []);
  
  return is4K;
};

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
  const is4K = use4KDisplay();
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
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      {is4K ? (
        <div className="w-full h-full flex flex-col items-center">
          <JoinSection 
            joinUrl={joinUrl}
            tooltipState={tooltipState}
            onCopy={copyToClipboard}
          />
          
          <div className="w-full px-24">
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
      ) : (
        <>
          <JoinSection 
            joinUrl={joinUrl}
            tooltipState={tooltipState}
            onCopy={copyToClipboard}
          />
          
          <div className="w-full max-w-4xl">
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
        </>
      )}
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
const QuizEndScreen = ({ message, onNavigate }) => {
  const is4K = use4KDisplay();
  
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Card className={`${is4K ? 'max-w-6xl p-16 w-full' : 'w-full max-w-xl'}`}>
        <CardHeader className={`text-center ${is4K ? 'p-20' : ''}`}>
          <CardTitle className={`${is4K ? 'text-7xl mb-12' : 'text-2xl'} font-bold text-gray-900`}>
            Quiz Completed!
          </CardTitle>
          <CardDescription className={`text-gray-600 ${is4K ? 'text-4xl mb-16' : 'mt-2'}`}>
            {message}
          </CardDescription>
          <Button 
            variant="secondary" 
            onClick={onNavigate}
            className={is4K ? "text-3xl px-12 py-8 h-auto" : ""}
          >
            View Leaderboard <TrendingUp className={is4K ? "h-10 w-10 ml-6" : "h-4 w-4"} />
          </Button>
        </CardHeader>
      </Card>
    </div>
  );
};

QuizEndScreen.propTypes = {
  message: PropTypes.string.isRequired,
  onNavigate: PropTypes.func.isRequired,
};

// Component for loading screen
const LoadingScreen = () => {
  const is4K = use4KDisplay();
  
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Card className={`${is4K ? 'max-w-6xl w-full p-16' : 'w-full max-w-xl'}`}>
        <CardHeader className={is4K ? "p-20" : ""}>
          <Skeleton className={`${is4K ? 'h-20' : 'h-8'} w-3/4 mx-auto ${is4K ? 'mb-12' : 'mb-4'}`} />
          <Skeleton className={`${is4K ? 'h-12' : 'h-4'} w-1/2 mx-auto`} />
        </CardHeader>
        <CardContent className={is4K ? "p-20" : ""}>
          <div className={`${is4K ? 'space-y-12' : 'space-y-4'}`}>
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className={`${is4K ? 'h-32' : 'h-12'} w-full`} />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Component for join section
const JoinSection = ({ joinUrl, tooltipState, onCopy }) => {
  const is4K = use4KDisplay();
  
  return (
    <div className={`w-full flex flex-col items-center justify-center ${is4K ? 'space-y-12 mt-24 mb-32' : 'space-y-4 mt-8 mb-12'}`}>
      <h2 className={`${is4K ? 'text-7xl' : 'text-2xl'} text-gray-700 font-medium`}>Join the Quiz at</h2>
      <div className={`flex items-center justify-center ${is4K ? 'space-x-8' : 'space-x-3'}`}>
        <a
          href={`https://${joinUrl}`}
          className={`${is4K ? 'text-8xl' : 'text-4xl'} font-bold tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent hover:from-indigo-600 hover:to-blue-600 transition-all duration-300`}
        >
          telusq.telusko.com/join
        </a>
        <TooltipProvider>
          <Tooltip open={tooltipState.isOpen}>
            <TooltipTrigger asChild>
              <Button
                variant="secondary"
                size={is4K ? "lg" : "sm"}
                onClick={() => onCopy(joinUrl)}
                className={`hover:bg-blue-100 ${is4K ? 'h-20 w-20' : ''}`}
              >
                <Link className={is4K ? "h-10 w-10" : "h-4 w-4"} />
              </Button>
            </TooltipTrigger>
            <TooltipContent className={is4K ? "text-3xl p-6" : ""}>
              <p>{tooltipState.message}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
};

JoinSection.propTypes = {
  joinUrl: PropTypes.string.isRequired,
  tooltipState: PropTypes.shape({
    isOpen: PropTypes.bool.isRequired,
    message: PropTypes.string.isRequired,
  }).isRequired,
  onCopy: PropTypes.func.isRequired,
};

// Component for quiz progress
const QuizProgress = ({ currentIndex, totalQuestions, progress, timeLimit, onTimerComplete }) => {
  const is4K = use4KDisplay();
  
  return (
    <div className={is4K ? "mb-20" : "mb-8"}>
      <div className={`flex items-center justify-between ${is4K ? 'mb-8' : 'mb-2'}`}>
        <div className={`flex items-center ${is4K ? 'gap-6' : 'gap-2'}`}>
          <Timer className={is4K ? "w-12 h-12" : "w-4 h-4"} text-gray-500 />
          <span className={`${is4K ? 'text-3xl' : 'text-sm'} text-gray-600`}>
            Question {currentIndex + 1} of {totalQuestions}
          </span>
        </div>
        <CountdownCircleTimer
          key={currentIndex}
          isPlaying
          duration={timeLimit}
          size={is4K ? 220 : 90}
          strokeWidth={is4K ? 12 : 4}
          colors={["#10B981", "#F59E0B", "#EF4444"]}
          colorsTime={[
            Math.floor(timeLimit * 0.7),
            Math.floor(timeLimit * 0.3),
            0,
          ]}
          onComplete={onTimerComplete}
        >
          {({ remainingTime }) => (
            <span className={`${is4K ? 'text-5xl' : 'text-sm'} font-medium`}>{remainingTime}s</span>
          )}
        </CountdownCircleTimer>
      </div>
      <Progress value={progress} className={is4K ? "h-6" : "h-2"} />
    </div>
  );
};

QuizProgress.propTypes = {
  currentIndex: PropTypes.number.isRequired,
  totalQuestions: PropTypes.number.isRequired,
  progress: PropTypes.number.isRequired,
  timeLimit: PropTypes.number.isRequired,
  onTimerComplete: PropTypes.func.isRequired,
};

// Component for quiz card
const QuizCard = ({ question, isTimeUp, isLastQuestion, onNext }) => {
  const is4K = use4KDisplay();
  const options = [
    { id: "option1", value: question.option1 },
    { id: "option2", value: question.option2 },
    { id: "option3", value: question.option3 },
    { id: "option4", value: question.option4 },
  ];

  return (
    <Card className={`w-full ${is4K ? 'shadow-2xl' : ''}`}>
      <CardHeader className={is4K ? "p-20 pb-12" : ""}>
        <CardTitle className={`${is4K ? 'text-6xl' : 'text-xl'} font-semibold leading-tight`}>
          {question.questionText}
        </CardTitle>
      </CardHeader>
      <CardContent className={is4K ? "p-20 pt-0" : ""}>
        <div className={is4K ? "space-y-12" : "space-y-4"}>
          {options.map((option) => {
            const isCorrectOption = isTimeUp && question.correctAnswer === option.id;
            return (
              <div key={option.id} className={`flex items-center ${is4K ? 'space-x-6' : 'space-x-2'}`}>
                <Label
                  htmlFor={option.id}
                  className={`flex-1 ${is4K ? 'p-10 rounded-xl text-4xl' : 'p-4 rounded-lg'} transition-colors cursor-pointer flex justify-between items-center
                    ${isCorrectOption 
                      ? 'bg-green-100 hover:bg-green-200' 
                      : is4K ? 'bg-gray-50 hover:bg-gray-100':'bg-gray-50 hover:bg-gray-100'
                    }`}
                >
                  <span>{option.value}</span>
                  {isCorrectOption && (
                    <CheckCircle2 className={`${is4K ? 'h-12 w-12' : 'h-5 w-5'} text-green-600`} />
                  )}
                </Label>
              </div>
            );
          })}
        </div>

        <div className={`flex justify-end ${is4K ? 'mt-16' : 'mt-6'}`}>
          {isLastQuestion ? (
            <Button
              onClick={onNext}
              className={is4K ? "px-16 py-8 text-3xl h-auto" : "px-6"}
              variant="default"
            >
              Finish
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className={`${is4K ? 'h-32 w-32' : 'h-12 w-12'} rounded-full`}
              onClick={onNext}
            >
              <LucideCircleChevronRight
                style={{ width: is4K ? "100px" : "40px", height: is4K ? "100px" : "40px" }}
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