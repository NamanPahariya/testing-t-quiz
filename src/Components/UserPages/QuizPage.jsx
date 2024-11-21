import React, { useEffect, useState, useRef } from "react";
import SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs";
import { CountdownCircleTimer } from "react-countdown-circle-timer";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../ui/card";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { Label } from "../ui/label";
import { Button } from "../ui/button";
import {
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  Radio,
  Trophy,
  LogOut,
} from "lucide-react";
import { Alert, AlertDescription } from "../ui/alert";
import { useNavigate } from "react-router-dom";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../ui/alert-dialog";
const QuizPage = () => {
  const baseUrl = import.meta.env.VITE_BASE_URL;
  const [questions, setQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [selectedOption, setSelectedOption] = useState("");
  const [quizEnded, setQuizEnded] = useState(false);
  const [quizEndMessage, setQuizEndMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [waitingForNextQuestion, setWaitingForNextQuestion] = useState(false);
  const [timeUp, setTimeUp] = useState(false);
  const [isCorrectSelection, setIsCorrectSelection] = useState(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [questionCount, setQuestionCount] = useState(1);
  const stompClientRef = useRef(null);
  const sessionCode = localStorage.getItem("sessionCode");
  const navigate = useNavigate();
  // WebSocket connection and other existing functions remain the same
  useEffect(() => {
    const socket = new SockJS(`${baseUrl}/quiz-websocket`);
    const client = new Client({
      webSocketFactory: () => socket,
      onConnect: () => {
        client.subscribe(`/topic/quizQuestions/${sessionCode}`, (message) => {
          const broadcastedQuestions = JSON.parse(message.body);
          if (broadcastedQuestions.isQuizEnd) {
            setQuizEnded(true);
            setQuizEndMessage(broadcastedQuestions.message);
          }
          if (!quizEnded) {
            setQuestions(broadcastedQuestions);
            setCurrentQuestion(broadcastedQuestions[0]);
            setWaitingForNextQuestion(false);
            setTimeUp(false);
          }
        });

        client.subscribe(`/topic/currentQuestion/${sessionCode}`, (message) => {
          const newQuestion = JSON.parse(message.body);
          if (!quizEnded && newQuestion) {
            setSelectedOption("");
            setCurrentQuestion(newQuestion);
            setWaitingForNextQuestion(false);
            setTimeUp(false);
            setIsCorrectSelection(null);
            setIsSubmitted(false);
            setQuestionCount((prev) => prev + 1);
          }
        });
      },
    });

    stompClientRef.current = client;
    stompClientRef.current.activate();

    return () => {
      if (stompClientRef.current) stompClientRef.current.deactivate();
    };
  }, [quizEnded]);

  const getOptionsArray = (question) => {
    if (!question) return [];
    return [
      { label: question.option1, value: "option1" },
      { label: question.option2, value: "option2" },
      { label: question.option3, value: "option3" },
      { label: question.option4, value: "option4" },
    ];
  };

  const handleOptionChange = (optionValue) => {
    setSelectedOption(optionValue);
    setIsCorrectSelection(null);
    setIsSubmitted(false);
  };

  const handleLogout = () => {
    const name = localStorage.getItem("username");
    const sessionCode = localStorage.getItem("sessionCode");

    try {
      // Only attempt to publish and deactivate if the connection is active
      if (stompClientRef.current && stompClientRef.current.connected) {
        stompClientRef.current.publish({
          destination: "/app/leaveQuiz",
          body: JSON.stringify({ name, sessionCode }),
        });
        stompClientRef.current.deactivate();
      }
    } catch (error) {
      console.warn("Error during STOMP cleanup:", error);
    } finally {
      // Always clean up localStorage and navigate
      localStorage.removeItem("username");
      localStorage.removeItem("sessionCode");
      navigate("/join");
    }
  };

  useEffect(() => {
    const handlePopState = (event) => {
      event.preventDefault();
      handleLogout();
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  // Handle page refresh/close
  // useBeforeUnload(
  //   React.useCallback((event) => {
  //     handleLogout();
  //     event.preventDefault();
  //     return (event.returnValue =
  //       "Are you sure you want to leave? You will be logged out of the quiz.");
  //   }, [])
  // );

  // Handle component unmount
  useEffect(() => {
    return () => {
      handleLogout();
    };
  }, []);

  const handleSubmit = async () => {
    if (!selectedOption || !currentQuestion || timeUp) return;

    setIsSubmitting(true);
    setIsSubmitted(true);
    try {
      const requestBody = [
        {
          question: { id: currentQuestion.id },
          selectedOption: selectedOption,
          isCorrect: selectedOption === currentQuestion.correctAnswer,
          timestamp: new Date().toISOString(),
        },
      ];
      const response = await fetch(`${baseUrl}/api/quiz/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);
      setWaitingForNextQuestion(true);
    } catch (error) {
      console.error("Error submitting answer:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (timeUp && isSubmitted && selectedOption) {
      setIsCorrectSelection(selectedOption === currentQuestion.correctAnswer);
    }
  }, [timeUp, isSubmitted, selectedOption, currentQuestion]);

  const LogoutButton = ({ onLogout }) => (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          // variant="destructive"
          className="fixed top-4 right-4 z-50"
          size="sm"
        >
          <LogOut className="mr-2 h-4 w-4" />
          {/* Leave */}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure you want to leave?</AlertDialogTitle>
          <AlertDialogDescription>
            This will end your quiz session and you'll need to rejoin with a new
            code.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onLogout}>Leave</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  const WelcomeContent = () => (
    <div className="text-center space-y-6 py-8">
      <div className="flex justify-center">
        <Radio className="h-16 w-16 text-blue-500 animate-pulse" />
      </div>
      <CardTitle className="text-2xl text-blue-700">
        Welcome to the Interactive Quiz!
      </CardTitle>
      <CardDescription className="text-lg">
        Get ready for an exciting learning experience!
      </CardDescription>
      <div className="space-y-4 max-w-md mx-auto text-gray-600">
        <div className="bg-blue-50 rounded-lg p-4">
          <h3 className="font-semibold mb-2">How to Participate:</h3>
          <ul className="text-sm space-y-2 text-left">
            <li>• Questions will appear here when the host starts</li>
            <li>• You'll have 15 seconds to answer each question</li>
            <li>• Select your answer and click Submit</li>
            <li>• Instant feedback will show if you're correct</li>
          </ul>
        </div>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Stay on this page - the quiz will begin automatically
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );

  if (quizEnded) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <LogoutButton onLogout={handleLogout} />
        <Card className="w-full max-w-xl">
          <CardHeader className="text-center">
            <Trophy className="w-12 h-12 mx-auto text-yellow-500 mb-4" />
            <CardTitle className="text-2xl font-bold text-gray-900">
              Quiz Completed!
            </CardTitle>
            <CardDescription className="text-gray-600 mt-2">
              {quizEndMessage ||
                "The quiz has ended. Thank you for participating!"}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const renderSubmitSection = () => {
    if (isSubmitted || timeUp) {
      return (
        <Alert className="mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {timeUp
              ? "Time's up! Wait for the next question..."
              : "Answer submitted! Wait for the next question..."}
          </AlertDescription>
        </Alert>
      );
    }

    return (
      <Button
        onClick={handleSubmit}
        disabled={!selectedOption || isSubmitting}
        className="w-full max-w-xs mx-auto"
        variant={isSubmitting ? "outline" : "default"}
      >
        {isSubmitting ? "Submitting..." : "Submit Answer"}
      </Button>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-8 overflow-x-hidden">
      <LogoutButton onLogout={handleLogout} />
      <div className="max-w-3xl mx-auto">
        <Card className="border-none shadow-lg">
          <CardContent>
            {questions.length === 0 ? (
              <WelcomeContent />
            ) : (
              <div className="space-y-6 py-6">
                <CardHeader className="p-0 flex flex-col items-start space-y-4 md:space-y-0 md:flex-row md:items-center md:justify-between">
                  <div className="flex flex-col items-start space-y-2">
                    <CardTitle className="text-2xl text-blue-700">
                      Current Question
                    </CardTitle>
                    <CardDescription>
                      Select the best answer for the question below
                    </CardDescription>
                  </div>
                  <div className="flex items-center ml-auto">
                    <CountdownCircleTimer
                      key={currentQuestion?.id}
                      isPlaying={true}
                      duration={currentQuestion.timeLimit}
                      size={90}
                      strokeWidth={4}
                      colors={["#10B981", "#F59E0B", "#EF4444"]}
                      colorsTime={[
                        Math.floor(currentQuestion.timeLimit * 0.7), // Green phase (70% of time)
                        Math.floor(currentQuestion.timeLimit * 0.3), // Yellow phase (30% of time)
                        0, // Red phase (last few seconds)
                      ]}
                      onComplete={() => {
                        setTimeUp(true);
                        setWaitingForNextQuestion(true);
                        return { shouldRepeat: false };
                      }}
                    >
                      {({ remainingTime }) => (
                        <span className="text-sm font-medium">
                          {remainingTime}s
                        </span>
                      )}
                    </CountdownCircleTimer>
                  </div>
                </CardHeader>

                <div
                  key={currentQuestion?.id}
                  className={`relative ${
                    questionCount > 1 ? "animate-slide-in-right" : ""
                  } overflow-hidden`}
                >
                  <div className="text-lg font-medium mb-4">
                    {currentQuestion?.questionText}
                  </div>

                  <RadioGroup
                    value={selectedOption}
                    onValueChange={handleOptionChange}
                    className="space-y-3"
                    disabled={waitingForNextQuestion || timeUp}
                  >
                    {getOptionsArray(currentQuestion).map((option, i) => {
                      const isCorrectAnswer =
                        currentQuestion.correctAnswer === option.value;
                      const isSelectedOption = selectedOption === option.value;

                      return (
                        <div
                          key={i}
                          className={`relative flex items-center space-x-2 rounded-lg border p-4 transition-all ${
                            timeUp && isSubmitted
                              ? isCorrectAnswer
                                ? "border-green-500 bg-green-50"
                                : isSelectedOption
                                ? "border-red-500 bg-red-50"
                                : "border-gray-200"
                              : isSelectedOption
                              ? "border-blue-500 bg-blue-50"
                              : "border-gray-200 hover:border-gray-300"
                          }`}
                        >
                          <RadioGroupItem
                            value={option.value}
                            id={option.value}
                          />
                          <Label
                            className="flex-1 cursor-pointer"
                            htmlFor={option.value}
                          >
                            {option.label}
                          </Label>

                          {timeUp && isSubmitted && (
                            <span className="absolute right-4">
                              {isCorrectAnswer ? (
                                <CheckCircle2 className="h-5 w-5 text-green-500" />
                              ) : isSelectedOption ? (
                                <XCircle className="h-5 w-5 text-red-500" />
                              ) : null}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </RadioGroup>
                </div>

                <div className="flex justify-between items-center pt-4">
                  {renderSubmitSection()}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default QuizPage;
