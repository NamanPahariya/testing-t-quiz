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
  TrendingUp,
  CrownIcon,
  Crown,
  Medal
} from "lucide-react";
import { Alert, AlertDescription } from "../ui/alert";
import { useBeforeUnload, useNavigate } from "react-router-dom";
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

// import WakeLockManager from "./WakeLockManager";

const QuizPage = () => {
  const baseUrl = import.meta.env.VITE_BASE_URL;
  const [questions, setQuestions] = useState([]);
  console.log('questions',questions);

  const [currentQuestion, setCurrentQuestion] = useState(null);
  console.log(currentQuestion,'currentquestions')
  const [selectedOption, setSelectedOption] = useState("");
  const [quizEnded, setQuizEnded] = useState(false);
  const [quizEndMessage, setQuizEndMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [waitingForNextQuestion, setWaitingForNextQuestion] = useState(false);
  const [timeUp, setTimeUp] = useState(false);
  const [isCorrectSelection, setIsCorrectSelection] = useState(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [questionCount, setQuestionCount] = useState(1);
  const [questionStartTime, setQuestionStartTime] = useState(null);
  const [remainingTime, setRemainingTime] = useState(null);
  const [leaderboard, setLeaderboard] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

    const [topUsers, setTopUsers] = useState([]);

    const [userStats, setUserStats] = useState({
      score: 0,
      rank: 0,
      name: localStorage.getItem("username")
    });
  
  const stompClientRef = useRef(null);
  const heartbeatTimeoutRef = useRef(null);

  const sessionCode = localStorage.getItem("sessionCode");
  const name = localStorage.getItem("username");
  const userId = localStorage.getItem("userId");
  const navigate = useNavigate();
  // WebSocket connection and other existing functions remain the same
 
    // const connectValue = localStorage.getItem('connected');
    // console.log(connectValue,'connectedValue')
    // if(!connectValue){
    //   localStorage.setItem('connected',false);
    //   return;
    // }

    const connectWebSocket = () =>{
    const socket = new SockJS(`${baseUrl}/quiz-websocket`);
    const client = new Client({
      webSocketFactory: () => socket,
      heartbeatIncoming: 25000, // 25 seconds, matching backend
      heartbeatOutgoing: 25000, // 25 seconds, matching backend
      reconnectDelay: 5000,     // 5 seconds delay before reconnect attempt
      onConnect: () => {
        console.log("Connected to WebSocket");
        // localStorage.setItem('connected',true);
        client.subscribe(`/topic/quizQuestions/${sessionCode}`, (message) => {
          const broadcastedQuestions = JSON.parse(message.body);
          console.log("Received questions:", broadcastedQuestions);
          if (broadcastedQuestions.isQuizEnd) {
            setQuizEnded(true);
            setQuizEndMessage(broadcastedQuestions.message);
          }
          if (!quizEnded) {
            setQuestions(broadcastedQuestions);
            setCurrentQuestion(broadcastedQuestions[0]);
            handleNewQuestion(broadcastedQuestions[0]);
            setWaitingForNextQuestion(false);
            setTimeUp(false);
          }
        });

        client.subscribe(`/topic/currentQuestion/${sessionCode}`, (message) => {
          const newQuestion = JSON.parse(message.body);
          console.log("Received new question:", newQuestion);
          if (!quizEnded && newQuestion) {
            setSelectedOption("");
            setQuestions(newQuestion);
            setCurrentQuestion(newQuestion);
            handleNewQuestion(newQuestion);
            setWaitingForNextQuestion(false);
            setTimeUp(false);
            setIsCorrectSelection(null);
            setIsSubmitted(false);
            setQuestionCount((prev) => prev + 1);
          }
        });

        client.subscribe(`/topic/leaderboard/${sessionCode}`, (message) => {
          const leaderboardData = JSON.parse(message.body);
          if(leaderboardData){
            setTopUsers(leaderboardData);
            console.log(leaderboardData, "leaderboard");
            console.log("Setting leaderboard state to true");
          setLeaderboard(true);
          setShowLeaderboard(true); 

          const userLeaderboardSubscription = client.subscribe(
            `/topic/userLeaderboard/${sessionCode}`, 
            (userMessage) => {
              const userDetails = JSON.parse(userMessage.body);
              console.log(userDetails, "userDetails");
              if (!userDetails.error && userDetails.name === name) {
                console.log("updating for the current name", name);
                setUserStats({
                  score: userDetails.score,
                  rank: userDetails.rank,
                  name: userDetails.name
                });
              }
            }
          );

          client.publish({
            destination: `/app/userLeaderboard/${sessionCode}`,
            body: name
          });

          

          // Clean up subscription when leaderboard is hidden
          return () => {
            userLeaderboardSubscription.unsubscribe();
          };


          }
          
        });
        
      },
      onStompError: (frame) => {
        console.error('STOMP error:', frame);
      },
      onWebSocketClose: () => {
        console.log('WebSocket connection closed');
        // Clear any existing heartbeat timeout
        if (heartbeatTimeoutRef.current) {
          clearTimeout(heartbeatTimeoutRef.current);
        }
      },
      onWebSocketError: (event) => {
        console.error('WebSocket error:', event);
      },
      debug: (str) => {
        console.debug(str);
      }
    });

    

    stompClientRef.current = client;
    stompClientRef.current.activate();
  }

  useEffect(() => {
    connectWebSocket();
    return () => {
      console.log("Deactivating stompClient");
      if (heartbeatTimeoutRef.current) {
        clearTimeout(heartbeatTimeoutRef.current);
      }
      if (stompClientRef.current) stompClientRef.current.deactivate();
    };
  }, []);

  useEffect(() => {
    const checkConnection = () => {
      if (stompClientRef.current && !stompClientRef.current.connected) {
        console.log("Connection lost, attempting to reconnect...");
        try {
          stompClientRef.current.deactivate();
          connectWebSocket();
          if(stompClientRef.current.connected){
          console.log("Reconnection successful");
          }
        } catch (error) {
          console.error("Reconnection failed:", error);
        }
      }
    };

    // Check connection every 30 seconds (twice the heartbeat interval)
    const connectionCheckInterval = setInterval(checkConnection, 50000);

    return () => {
      clearInterval(connectionCheckInterval);
    };
  }, []);

  const handleNewQuestion = (question) => {
    if (!question || !question.timestamp) return;
    
    // Parse the question start time
    const [hours, minutes, seconds] = question.timestamp.split(':').map(Number);
    
    // Get current time
    const now = new Date();
    const questionStart = new Date(now);
    questionStart.setHours(hours, minutes, seconds, 0);
    
    // Calculate elapsed time in seconds
    const elapsedSeconds = Math.floor((now - questionStart) / 1000);
    
    // Calculate remaining time
    const remainingSeconds = Math.max(0, question.timeLimit - elapsedSeconds);
    
    setQuestionStartTime(question.timestamp);
    setRemainingTime(remainingSeconds);
    
    // If time is already up when joining
    if (remainingSeconds <= 0) {
      setTimeUp(true);
      setWaitingForNextQuestion(true);
    }
  };


  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        // Check connection status when page becomes visible
        if (stompClientRef.current && !stompClientRef.current.connected) {
          console.log("Reconnecting after visibility change...");
          stompClientRef.current.deactivate();
          connectWebSocket();
          if(stompClientRef.current.connected){
            console.log('reconnected successfully after visibility change');
          }
        }
        // Existing question refresh logic
        if (currentQuestion) {
          handleNewQuestion(currentQuestion);
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [currentQuestion]);
  
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

  const handleLogout = async () => {
    try {
      // Only attempt to publish and deactivate if the connection is active
      if (stompClientRef.current && stompClientRef.current.connected) {
       await stompClientRef.current.publish({
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
      localStorage.removeItem("userId");
      localStorage.removeItem("quizPageLeaving");

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
  useEffect(() => {
    let isRefreshing = false;
    let confirmationMessage = "Are you sure you want to leave? You will be logged out of the quiz.";

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden" && !isRefreshing) {
        // Set a flag when leaving the page
        localStorage.setItem("quizPageLeaving", "true");
      }
    };

    const handleBeforeUnload = (event) => {
      isRefreshing = true;
      event.preventDefault();
      event.returnValue = confirmationMessage;
      return confirmationMessage;
    };

    // Check if we're returning from a refresh attempt
    const wasLeaving = localStorage.getItem("quizPageLeaving");
    if (wasLeaving === "true") {
      // Clear the flag
      localStorage.removeItem("quizPageLeaving");
      
      // Show a modal or handle the return as needed
      const shouldStay = window.confirm(confirmationMessage);
      if (shouldStay) {
        handleLogout();
      }
    }

    // Add event listeners
    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Cleanup
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      localStorage.removeItem("quizPageLeaving");
    };
  }, []);

  const handleSubmit = async () => {
    if (!selectedOption || !currentQuestion || timeUp) return;

    setIsSubmitting(true);
    try {
      const requestBody = [
        {
          question: { id: currentQuestion.id },
          selectedOption: selectedOption,
          isCorrect: selectedOption === currentQuestion.correctAnswer,
          timestamp: new Date().toISOString(),
          name,
          userId,
          sessionCode,
        },
      ];
      const response = await fetch(`${baseUrl}/api/quiz/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);
      setIsSubmitted(true);
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

 






  const getMedalIcon = (rank) => {
    if (rank === 1) return <Crown className="w-8 h-8 text-yellow-500 animate-bounce" />;
    if (rank === 2) return <Medal className="w-8 h-8 text-gray-400 animate-pulse" />;
    if (rank === 3) return <Medal className="w-8 h-8 text-amber-600 animate-pulse" />;
    return null;
  };
  
  if (quizEnded) {
    if (showLeaderboard && leaderboard) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4">
          <div className="absolute top-4 right-4">
            <LogoutButton onLogout={handleLogout} />
          </div>
  
          <div className="w-full max-w-2xl transform transition-all duration-500 ease-in-out">
            <Card className="w-full shadow-lg">
              <CardHeader className="text-center">
                <Trophy className="w-16 h-16 mx-auto text-yellow-500 mb-2 animate-bounce" />
                {userStats?.name && name && (
                  <div className="space-y-6">
                    {/* Profile Section */}
                    <div className="flex flex-col items-center justify-center p-4">
                      <div className="relative">
                        <div className="w-20 h-20 rounded-full bg-gradient-to-r from-blue-100 to-purple-100 flex items-center justify-center mb-3 shadow-lg">
                          {getMedalIcon(userStats.rank)}
                        </div>
                        <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1 shadow-md">
                          <div className="bg-green-500 rounded-full w-6 h-6 flex items-center justify-center">
                            <p className="text-xs font-bold text-white">#{userStats.rank}</p>
                          </div>
                        </div>
                      </div>
                      <h2 className="text-2xl font-bold text-gray-900 mt-2">{userStats.name}</h2>
                      <p className="text-sm text-gray-500">Quiz Champion</p>
                    </div>
  
                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-4 px-4 sm:px-6">
                      <div className="bg-white rounded-xl p-4 shadow-md hover:shadow-lg transition-shadow duration-300 transform hover:-translate-y-1">
                        <div className="flex flex-col items-center">
                          <div className="rounded-full bg-blue-100 p-2 mb-2">
                            <Trophy className="w-6 h-6 text-blue-600" />
                          </div>
                          <p className="text-3xl font-bold text-gray-900">{userStats.score}</p>
                          <p className="text-sm text-gray-500">Total Score</p>
                        </div>
                      </div>
  
                      <div className="bg-white rounded-xl p-4 shadow-md hover:shadow-lg transition-shadow duration-300 transform hover:-translate-y-1">
                        <div className="flex flex-col items-center">
                          <div className="rounded-full bg-purple-100 p-2 mb-2">
                            <Medal className="w-6 h-6 text-purple-600" />
                          </div>
                          <p className="text-3xl font-bold text-gray-900">#{userStats.rank}</p>
                          <p className="text-sm text-gray-500">Global Rank</p>
                        </div>
                      </div>
                    </div>
  
                    {/* Achievement Badge */}
                    <div className="mt-6 px-4 sm:px-6">
                      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 border border-gray-100">
                        <div className="flex items-center justify-center space-x-2">
                          <Crown className="w-5 h-5 text-yellow-500" />
                          <p className="text-sm font-medium text-gray-700">
                            {userStats.rank <= 3 ? "Top Performer!" : "Great Performance!"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardHeader>
            </Card>
          </div>
        </div>
      );
    }
    
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4">
        <div className="absolute top-4 right-4">
          <LogoutButton onLogout={handleLogout} />
        </div>
        
        <Card className="w-full max-w-xl transform transition-all duration-500 ease-in-out hover:scale-105">
          <CardHeader className="text-center">
            <Trophy className="w-12 h-12 mx-auto text-yellow-500 mb-4 animate-bounce" />
            <CardTitle className="text-2xl font-bold text-gray-900">
              Quiz Completed!
            </CardTitle>
            <CardDescription className="text-gray-600 mt-2">
              {quizEndMessage || "The quiz has ended. Please wait for the final results..."}
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
         {/*<WakeLockManager /> */}

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
        key={`${currentQuestion?.id}-${remainingTime}`}
        isPlaying={!timeUp && !quizEnded}
        duration={currentQuestion?.timeLimit || 0}
        initialRemainingTime={remainingTime}
        size={90}
        strokeWidth={4}
        colors={["#10B981", "#F59E0B", "#EF4444"]}
        colorsTime={[
          Math.floor((currentQuestion?.timeLimit || 0) * 0.7),
          Math.floor((currentQuestion?.timeLimit || 0) * 0.3),
          0,
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
                    disabled={waitingForNextQuestion || timeUp || isSubmitted}
                  >
                    {getOptionsArray(currentQuestion).map((option, i) => {
                      const isCorrectAnswer =
                        currentQuestion.correctAnswer === option.value;
                      const isSelectedOption = selectedOption === option.value;

                      return (
                        <div
                          key={i}
                          className={`relative flex items-center space-x-2 rounded-lg border p-4 transition-all ${
                            timeUp 
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

                          {timeUp  && (
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