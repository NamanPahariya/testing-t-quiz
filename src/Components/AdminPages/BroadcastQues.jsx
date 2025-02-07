import React, { useEffect, useRef, useState, useMemo } from "react";
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

const BroadcastQues = () => {
  const baseUrl = import.meta.env.VITE_BASE_URL;
  const location = useLocation();
  const navigate = useNavigate();

  const initialQuestions = useMemo(
    () => location.state?.questions || [],
    [location.state]
  );

  const code = localStorage.getItem("code");
  const [questions, setQuestions] = useState(initialQuestions);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [quizEnded, setQuizEnded] = useState(false);
  const [quizEndMessage, setQuizEndMessage] = useState("");
  const [progress, setProgress] = useState(0);
  const [isTimeUp, setIsTimeUp] = useState(false);
  const [isLinkTooltipOpen, setIsLinkTooltipOpen] = useState(false);
  const [linkTooltipMessage, setLinkTooltipMessage] = useState("Copy link");
    
  

  const clientUrl = import.meta.env.VITE_CLIENT_URL || window.location.origin;
  const joinUrl = `${clientUrl}/join/${code}`;

  const stompClientRef = useRef(null);

  useEffect(() => {
    if (questions.length > 0) {
      setCurrentQuestion(questions[0]);
      setProgress((1 / questions.length) * 100);
      setIsTimeUp(false)
    }

    const socket = new SockJS(`${baseUrl}/quiz-websocket`);
    const client = new Client({
      webSocketFactory: () => socket,
      onConnect: () => {
        console.log("WebSocket connected");

        client.subscribe(`/topic/quizQuestions/${code}`, (message) => {
          const receivedData = JSON.parse(message.body);

          if (receivedData.isQuizEnd) {
            setQuizEnded(true);
            setQuizEndMessage(receivedData.message);
            return;
          }

          const receivedQuestions = receivedData;

          if (!quizEnded) {
            setQuestions(receivedQuestions);
            if (receivedQuestions.length > 0) {
              setCurrentQuestion(receivedQuestions[0]);
              setCurrentQuestionIndex(0);
              setProgress((1 / receivedQuestions.length) * 100);
              setIsTimeUp(false)
            }
          }
        });

        client.subscribe(`/topic/currentQuestion/${code}`, (message) => {
          const receivedQuestion = JSON.parse(message.body);
          setCurrentQuestion(receivedQuestion);
          setIsTimeUp(false)
        });
      },
    });

    stompClientRef.current = client;
    stompClientRef.current.activate();

    return () => {
      if (stompClientRef.current) {
        stompClientRef.current.deactivate();
      }
    };
  }, [questions, quizEnded]);

  const getOptionsArray = (question) => {
    if (!question) return [];
    return [
      { id: "option1", value: question.option1 },
      { id: "option2", value: question.option2 },
      { id: "option3", value: question.option3 },
      { id: "option4", value: question.option4 },
    ];
  };

  const presentNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      const nextIndex = currentQuestionIndex + 1;
      setCurrentQuestionIndex(nextIndex);
      setCurrentQuestion(questions[nextIndex]);
      setProgress(((nextIndex + 1) / questions.length) * 100);
      setIsTimeUp(false)

      stompClientRef.current.publish({
        destination: `/app/nextQuestion/${code}`,
        body: JSON.stringify({ index: nextIndex }),
      });
    } else {
      stompClientRef.current.publish({
        destination: `/topic/quizQuestions/${code}`,
        body: JSON.stringify({
          message: "The quiz has ended. Thank you for participating!",
          isQuizEnd: true,
        }),
      });
    }
  };

  const handleTimerComplete = ()=>{
    setIsTimeUp(true);
    return { shouldRepeat: false };
  }

  if (quizEnded) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <Card className="w-full max-w-xl">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-gray-900">
              Quiz Completed!
            </CardTitle>
            <CardDescription className="text-gray-600 mt-2">
              {quizEndMessage}
            </CardDescription>
            <Button
              variant="secondary"
              onClick={() => navigate("/leaderboard")}
            >
              LeaderBoard <TrendingUp className="h-4 w-4" />
            </Button>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <Card className="w-full max-w-xl">
          <CardHeader>
            <Skeleton className="h-8 w-3/4 mx-auto mb-4" />
            <Skeleton className="h-4 w-1/2 mx-auto" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setLinkTooltipMessage("Copied!");
      setIsLinkTooltipOpen(true);

      setTimeout(() => {
        setLinkTooltipMessage("Copy link");
        setIsLinkTooltipOpen(false);
      }, 1200);
    } catch (err) {
      console.error("Failed to copy:", err);
      setLinkTooltipMessage("Failed to copy");
      setIsLinkTooltipOpen(true);

      setTimeout(() => {
        setLinkTooltipMessage("Copy link");
        setIsLinkTooltipOpen(false);
      }, 1500);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <div className="w-full flex flex-col items-center justify-center space-y-4 mt-8 mb-12">
      <h2 className="text-2xl text-gray-700 font-medium">Join the Quiz at</h2>
      <div className="flex items-center justify-center space-x-3">
        <a 
          href={`https://${joinUrl}`}
          className="text-4xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent hover:from-indigo-600 hover:to-blue-600 transition-all duration-300"
        >
          telusq.telusko.com/join
        </a>
        <TooltipProvider>
          <Tooltip open={isLinkTooltipOpen}>
            <TooltipTrigger asChild>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => copyToClipboard(`${joinUrl}`)}
                className="hover:bg-blue-100"
              >
                <Link className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{linkTooltipMessage}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
      <div className="w-full max-w-4xl">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Timer className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600">
                Question {currentQuestionIndex + 1} of {questions.length}
              </span>
            </div>
            <CountdownCircleTimer
              key={currentQuestionIndex}
              isPlaying
              duration={currentQuestion.timeLimit}
              size={90}
              strokeWidth={4}
              colors={["#10B981", "#F59E0B", "#EF4444"]}
              colorsTime={[
                Math.floor(currentQuestion.timeLimit * 0.7),
                Math.floor(currentQuestion.timeLimit * 0.3),
                0,
              ]}
              onComplete={handleTimerComplete}
            >
              {({ remainingTime }) => (
                <span className="text-sm font-medium">{remainingTime}s</span>
              )}
            </CountdownCircleTimer>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <Card className="w-full">
          <CardHeader>
            <CardTitle className="text-xl font-semibold leading-tight">
              {currentQuestion.questionText}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">

            {getOptionsArray(currentQuestion).map((option) => {
                const isCorrectOption = isTimeUp && currentQuestion.correctAnswer === option.id;
                return (
                  <div key={option.id} className="flex items-center space-x-2">
                    <Label
                      htmlFor={option.id}
                      className={`flex-1 p-4 rounded-lg transition-colors cursor-pointer flex justify-between items-center
                        ${isCorrectOption 
                          ? 'bg-green-100 hover:bg-green-200' 
                          : 'bg-gray-50 hover:bg-gray-100'
                        }`}
                    >
                      <span>{option.value}</span>
                      {isCorrectOption && (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      )}
                    </Label>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end mt-6">
              {currentQuestionIndex === questions.length - 1 ? (
                <Button
                  onClick={presentNextQuestion}
                  className="px-6"
                  variant="default"
                >
                  Finish
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-12 w-12 rounded-full"
                  onClick={presentNextQuestion}
                >
                  <LucideCircleChevronRight
                    style={{ width: "40px", height: "40px" }}
                  />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BroadcastQues;