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
import { Button } from "../ui/button";
import { Progress } from "../ui/progress";
import { Label } from "../ui/label";
import { Skeleton } from "../ui/skeleton";
import { Timer, ChevronRight } from "lucide-react";

import useEmblaCarousel from "embla-carousel-react";

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
  const [emblaRef, emblaApi] = useEmblaCarousel();

  const stompClientRef = useRef(null);

  useEffect(() => {
    if (questions.length > 0) {
      setCurrentQuestion(questions[0]);
      setProgress((1 / questions.length) * 100);
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
            }
          }
        });

        client.subscribe(`/topic/currentQuestion/${code}`, (message) => {
          const receivedQuestion = JSON.parse(message.body);
          setCurrentQuestion(receivedQuestion);
        });
      },
    });

    stompClientRef.current = client;
    stompClientRef.current.activate();

    return () => {
      if (stompClientRef.current) stompClientRef.current.deactivate();
    };
  }, [questions, quizEnded]);

  const getOptionsArray = (question) => {
    if (!question) return [];
    return [
      { id: "1", value: question.option1 },
      { id: "2", value: question.option2 },
      { id: "3", value: question.option3 },
      { id: "4", value: question.option4 },
    ];
  };

  const presentNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      const nextIndex = currentQuestionIndex + 1;
      setCurrentQuestionIndex(nextIndex);
      setCurrentQuestion(questions[nextIndex]);
      setProgress(((nextIndex + 1) / questions.length) * 100);

      if (emblaApi) {
        emblaApi.scrollNext();
      }

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

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4">
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
                Math.floor(currentQuestion.timeLimit * 0.7), // Green phase (70% of time)
                Math.floor(currentQuestion.timeLimit * 0.3), // Yellow phase (30% of time)
                0, // Red phase (last few seconds)
              ]}
              onComplete={() => ({ shouldRepeat: false })}
            >
              {({ remainingTime }) => (
                <span className="text-sm font-medium">{remainingTime}s</span>
              )}
            </CountdownCircleTimer>
          </div>
          <Progress value={progress} className="h-2" />
          <button onClick={() => navigate("/leaderboard")}>Leaderboard</button>
        </div>

        <div className="overflow-hidden" ref={emblaRef}>
          <div className="flex">
            {questions.map((question, index) => (
              <div key={index} className="flex-[0_0_100%] min-w-0">
                <Card className="w-full">
                  <CardHeader>
                    <CardTitle className="text-xl font-semibold leading-tight">
                      {question.questionText}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {getOptionsArray(question).map((option) => (
                        <div
                          key={option.id}
                          className="flex items-center space-x-2"
                        >
                          <Label
                            htmlFor={option.id}
                            className="flex-1 p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
                          >
                            {option.value}
                          </Label>
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-end mt-6">
                      {index === questions.length - 1 ? (
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
                          className="h-8 w-8 rounded-full"
                          onClick={presentNextQuestion}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BroadcastQues;
