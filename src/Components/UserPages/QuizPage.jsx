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
  Medal,
  Timer,
  X,
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

import { Progress } from "../ui/progress";
import { Toast, ToastProvider, ToastViewport, ToastClose, ToastDescription, ToastTitle } from '../ui/toast';
import { AnimatedCounter } from "./AnimateCounter";
import ConnectionAlertBadge from "../Resuable/connectio";


// import WakeLockManager from "./WakeLockManager";

const QuizPage = () => {
  const baseUrl = import.meta.env.VITE_BASE_URL;
  const [questions, setQuestions] = useState([]);
  console.log('questions',questions);
  const [currentQuestion, setCurrentQuestion] = useState([]);
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
  const [questionLength, setQuestionLength] = useState(() => {
    // Try to retrieve from sessionStorage first
    const storedLength = sessionStorage.getItem('initialQuestionLength');
    return storedLength ? parseInt(storedLength, 10) : 0;
  });
  const [remainingTime, setRemainingTime] = useState(null);
  const [leaderboard, setLeaderboard] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [ElapsedTimes,setElapsedTimes] = useState(0);
  const [showRefreshMessage, setShowRefreshMessage] = useState(false);
  const [isRefreshed, setIsRefreshed] = useState(false);

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [progress, setProgress] = useState(0);

    const [topUsers, setTopUsers] = useState([]);

    const [userStats, setUserStats] = useState({
      score: 0,
      rank: 0,
      name: sessionStorage.getItem("username")
    });
  
    const CONNECTION_STATES = {
      DISCONNECTED: 'disconnected',
      CONNECTING: 'connecting',
      CONNECTED: 'connected',
      RECONNECTING: 'reconnecting'
    };
    
    // References that need to be tracked
    const stompClientRef = useRef(null);
    const heartbeatTimeoutRef = useRef(null);
    const reconnectTimeoutRef = useRef(null);
    const connectionCheckIntervalRef = useRef(null);
    const reconnectAttemptsRef = useRef(0);
    const maxReconnectAttempts = 10;
    const [connectionState, setConnectionState] = useState(CONNECTION_STATES.DISCONNECTED);

  const sessionCode = sessionStorage.getItem("sessionCode");
  const name = sessionStorage.getItem("username");
  const userId = sessionStorage.getItem("userId");
  const navigate = useNavigate();


// Safely deactivate the client and return a Promise
const safeDeactivateClient = async () => {
  return new Promise((resolve) => {
    if (stompClientRef.current && stompClientRef.current.connected) {
      console.log("Safely deactivating STOMP client...");
      // First clear any pending timeouts
      if (heartbeatTimeoutRef.current) {
        clearTimeout(heartbeatTimeoutRef.current);
        heartbeatTimeoutRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      
      // Set a backup timeout to resolve in case deactivation hangs
      const backupTimeout = setTimeout(() => {
        console.warn("STOMP client deactivation timed out");
        resolve();
      }, 2000);
      
      // Try deactivating properly
      try {
        stompClientRef.current.deactivate();
        stompClientRef.current.onWebSocketClose = () => {
          clearTimeout(backupTimeout);
          resolve();
        };
      } catch (error) {
        console.error("Error during deactivation:", error);
        clearTimeout(backupTimeout);
        resolve();
      }
    } else {
      // If already disconnected, resolve immediately
      resolve();
    }
  });
};


const connectWebSocket = async (isReconnect = false) => {
  // Don't try to reconnect if already connecting or connected
  if ((connectionState === CONNECTION_STATES.CONNECTING || 
       connectionState === CONNECTION_STATES.CONNECTED) && !isReconnect) {
    console.log("Already connecting or connected, skipping connection attempt");
    return;
  }
  
  setConnectionState(isReconnect ? CONNECTION_STATES.RECONNECTING : CONNECTION_STATES.CONNECTING);
  
  // If reconnecting, make sure previous connection is properly closed
  if (isReconnect && stompClientRef.current) {
    await safeDeactivateClient();
  }

  try {
    // Create socket with a timeout to handle hanging connections
    const socket = new SockJS(`${baseUrl}/quiz-websocket`,null,{
      transports: [
        'websocket',      // Primary
        'xhr-streaming',  // Fallback
        'xhr-polling',    // Secondary fallback
        'jsonp-polling'   // Last resort
      ]
    });


   
    
    // Track socket errors separately
    socket.onerror = (error) => {
      console.error("SockJS socket error:", error);
    };
    
    const client = new Client({
      webSocketFactory: () => socket,
      heartbeatIncoming: 500, // 25 seconds, matching backend
      heartbeatOutgoing: 500, // 25 seconds, matching backend
      // Apply exponential backoff for reconnect - this helps with network transitions
      reconnectDelay: (attempt) => {
        // Start with 1-2 seconds, grow exponentially, cap at 30-60 seconds
        return Math.min(1000 * Math.pow(500, attempt), 30000);
      },
      
            
      onConnect: () => {
        console.log("Connected to WebSocket");
        setConnectionState(CONNECTION_STATES.CONNECTED);
        reconnectAttemptsRef.current = 0; // Reset reconnect attempts on successful connection
        
        // Setup heartbeat monitoring
        setupHeartbeatMonitoring();
        
        // Subscribe to quiz questions
        client.subscribe(`/topic/quizQuestions/${sessionCode}`, (message) => {
          const broadcastedQuestions = JSON.parse(message.body);
          console.log("Received questions:", broadcastedQuestions);
          if (broadcastedQuestions.length > 0 && 
            !sessionStorage.getItem('initialQuestionLength')) {
            const length = broadcastedQuestions.length;
            sessionStorage.setItem('initialQuestionLength', length.toString());
            setQuestionLength(length);
          }
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

        // Subscribe to current question
        client.subscribe(`/topic/currentQuestion/${sessionCode}`, (message) => {
          const newQuestion = JSON.parse(message.body);
          console.log("Received new question:", newQuestion);
          if (!quizEnded && newQuestion) {
            setSelectedOption("");
            setCurrentQuestion(newQuestion);
            setWaitingForNextQuestion(false);
            setTimeUp(false);
            setIsCorrectSelection(null);
            setIsSubmitted(false);
            setQuestionCount((prev) => prev + 1);
            setIsRefreshed(false);
          }
        });

        // Subscribe to timer updates
        client.subscribe(`/topic/timer/${sessionCode}`, (message) => {
          const timerData = JSON.parse(message.body);
          console.log("Timer update:", timerData);
          
          setRemainingTime(timerData.remainingTime);
          setCurrentQuestionIndex(timerData.questionIndex);
          
          // Check if timer has reached 0
          if (timerData.remainingTime === 0) {
            setTimeUp(true);
            setWaitingForNextQuestion(true);
            if (currentQuestion && selectedOption) {
              setIsCorrectSelection(selectedOption === currentQuestion.correctAnswer);
            }
          }
        });

        // Subscribe to leaderboard
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
          }
        });
      },
      
      onStompError: (frame) => {
        console.error('STOMP error:', frame);
        handleConnectionFailure();
      },
      
      onWebSocketClose: () => {
        console.log('WebSocket connection closed');
        // Clear heartbeat monitoring
        if (heartbeatTimeoutRef.current) {
          clearTimeout(heartbeatTimeoutRef.current);
          heartbeatTimeoutRef.current = null;
        }
        
        // Only attempt reconnect if not intentionally disconnecting
        if (connectionState !== CONNECTION_STATES.DISCONNECTED) {
          setConnectionState(CONNECTION_STATES.DISCONNECTED);
          attemptReconnect();
        }
      },
      
      onWebSocketError: (event) => {
        console.error('WebSocket error:', event);
        handleConnectionFailure();
      },
      
      debug: (str) => {
        // Limit debug logging to reduce console noise
        if (str.includes('error') || str.includes('fail') || str.includes('connect')) {
          console.debug(str);
        }
      }
    });

    stompClientRef.current = client;
    stompClientRef.current.activate();
  } catch (error) {
    console.error("Error creating STOMP client:", error);
    handleConnectionFailure();
  }
};

// Set up heartbeat monitoring to detect stale connections
const setupHeartbeatMonitoring = () => {
  if (heartbeatTimeoutRef.current) {
    clearTimeout(heartbeatTimeoutRef.current);
  }
  
  heartbeatTimeoutRef.current = setTimeout(() => {
    console.log("Checking connection health...");
    if (stompClientRef.current && !stompClientRef.current.connected) {
      console.warn("Connection appears stale despite no close event");
      attemptReconnect();
    } else {
      // Re-schedule the check if connection is healthy
console.log("connection is good")
      setupHeartbeatMonitoring();
    }
  }, 15000); // Check every 30 seconds
};

// Handle connection failures with exponential backoff
const handleConnectionFailure = () => {
  setConnectionState(CONNECTION_STATES.DISCONNECTED);
  attemptReconnect();
};

// Attempt to reconnect with exponential backoff
const attemptReconnect = () => {
  // Clear any existing reconnect attempts
  if (reconnectTimeoutRef.current) {
    clearTimeout(reconnectTimeoutRef.current);
  }
  
  // Stop after maximum attempts
  if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
    console.error(`Failed to reconnect after ${maxReconnectAttempts} attempts`);
    // Could show an error UI to the user here
    return;
  }
  
  const delay = Math.min(1000 * Math.pow(1.5, reconnectAttemptsRef.current), 1000);
  console.log(`Attempting to reconnect in ${delay}ms (attempt ${reconnectAttemptsRef.current + 1}/${maxReconnectAttempts})`);
  
  reconnectTimeoutRef.current = setTimeout(() => {
    reconnectAttemptsRef.current++;
    connectWebSocket(true);
  }, delay);
};

// Monitor network changes (works in modern browsers)
const setupNetworkMonitoring = () => {
  // Check if the Network Information API is available
  if ('connection' in navigator && 'addEventListener' in navigator.connection) {
    navigator.connection.addEventListener('change', () => {
      console.log("Network conditions changed, checking connection");
      if (stompClientRef.current && !stompClientRef.current.connected) {
        console.log("Network changed and disconnected, attempting to reconnect");
        attemptReconnect();
      }
      else{
        console.log('you are already connected')
      }
    });
  }
  
  // Add event listener for online/offline events (works in all browsers)
  window.addEventListener('online', () => {
    console.log("Browser reports online status");
    if (stompClientRef.current && !stompClientRef.current.connected) {
      console.log("Device came online, attempting to reconnect");
      attemptReconnect();
    }
  });
  
  window.addEventListener('offline', () => {
    console.log("Browser reports offline status");
    // No need to do anything here, the socket will close on its own
  });
};

useEffect(() => {
  connectWebSocket();
  setupNetworkMonitoring();
  
  // Clean up function
  return async () => {
    console.log("Component unmounting, cleaning up connections");
    setConnectionState(CONNECTION_STATES.DISCONNECTED);
    
    // Clear all timeouts and intervals
    if (heartbeatTimeoutRef.current) clearTimeout(heartbeatTimeoutRef.current);
    if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    if (connectionCheckIntervalRef.current) clearInterval(connectionCheckIntervalRef.current);
    
    // Safely deactivate client
    await safeDeactivateClient();
  };
}, []);
  
  useEffect(() => {
    const storedLength = sessionStorage.getItem('initialQuestionLength');
    if (storedLength) {
      setProgress(((currentQuestionIndex + 1) / parseInt(storedLength, 10)) * 100);
    }
  }, [currentQuestionIndex]);

  // useEffect(() => {
  //   const checkConnection = () => {
  //     if (stompClientRef.current && !stompClientRef.current.connected) {
  //       console.log("Connection lost, attempting to reconnect...");
  //       try {
  //         stompClientRef.current.deactivate();
  //         connectWebSocket();
  //         if(stompClientRef.current.connected){
  //         console.log("Reconnection successful");
  //         }
  //       } catch (error) {
  //         console.error("Reconnection failed:", error);
  //       }
  //     }
  //   };

  //   // Check connection every 30 seconds (twice the heartbeat interval)
  //   const connectionCheckInterval = setInterval(checkConnection, 50000);

  //   return () => {
  //     clearInterval(connectionCheckInterval);
  //   };
  // }, []);

 // Handle visibility changes (browser tab switching, mobile app background)
useEffect(() => {
  const handleVisibilityChange = () => {
    if (document.visibilityState === "visible") {
      console.log("Page became visible");
      // Check connection and reconnect if needed
      if (stompClientRef.current && !stompClientRef.current.connected) {
        console.log("Reconnecting after visibility change");
        // Reset reconnect attempts on manual visibility change
        reconnectAttemptsRef.current = 0;
        attemptReconnect();
      }
    } else {
      console.log("Page hidden");
      // On some platforms, we might want to pause certain activities
      // but keep connection open if possible
    }
  };

  document.addEventListener("visibilitychange", handleVisibilityChange);
  return () => {
    document.removeEventListener("visibilitychange", handleVisibilityChange);
  };
}, []);


// Optional: Add an interval check as a safety net for platforms with unreliable event handling
useEffect(() => {
  connectionCheckIntervalRef.current = setInterval(() => {
    if (connectionState !== CONNECTION_STATES.DISCONNECTED && 
        stompClientRef.current && !stompClientRef.current.connected) {
      console.log("Periodic check found disconnected client");
      attemptReconnect();
    }
  }, 60000); // Check every minute as a fallback

  return () => {
    if (connectionCheckIntervalRef.current) {
      clearInterval(connectionCheckIntervalRef.current);
    }
  };
}, [connectionState]);


const ConnectionStatusWithAlert = () => {
  return (
    <ConnectionAlertBadge 
      connectionState={connectionState}
      reconnectAttempts={reconnectAttemptsRef.current}
      maxReconnectAttempts={maxReconnectAttempts}
      onManualReconnect={handleManualReconnect}
    />
  );
};
  
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
      sessionStorage.removeItem("username");
      sessionStorage.removeItem("sessionCode");
      sessionStorage.removeItem("userId");
      sessionStorage.removeItem("quizPageLeaving");
      sessionStorage.removeItem("initialQuestionLength");

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
    const confirmationMessage = "Are you sure you want to leave? You will be logged out of the quiz.";
    let isUnloading = false;
  
    const handleBeforeUnload = (event) => {
      // Set flag only when actually unloading (refresh/close/navigate)
      sessionStorage.setItem("quizPageLeaving", "true");
      event.preventDefault();
      event.returnValue = confirmationMessage;
      return confirmationMessage;
    };
  
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        // Tab switched or minimized
        sessionStorage.setItem("quizPageLeaving", "true");
      } else {
        // Tab became active again - clear flag if still present
        sessionStorage.removeItem("quizPageLeaving");
      }
    };
  
    // Check for existing flag on mount
    const wasLeaving = sessionStorage.getItem("quizPageLeaving");
    if (wasLeaving) {
      sessionStorage.removeItem("quizPageLeaving");
      const shouldStay = window.confirm(confirmationMessage);
      if (!shouldStay) {
        setShowRefreshMessage(true);
        setIsRefreshed(true); // Add this line
        setWaitingForNextQuestion(true);
      } else {
        handleLogout();
      }
    }
  
    // Add event listeners
    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("visibilitychange", handleVisibilityChange);
  
    return () => {
      // Cleanup listeners
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      
      // Clear flag if component unmounts without page unload
      if (!isUnloading) {
        sessionStorage.removeItem("quizPageLeaving");
      }
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
      if(response.ok){
        // console.log(response,'response')
        const { message, elapsedTimes } = await response.json();
const timeValue = elapsedTimes[0].ElapsedTime; 
console.log('message:',message, "elsapsedTimes:",timeValue)
setElapsedTimes(timeValue);
        
      }
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

 


  // Add RefreshMessage component
  const RefreshMessage = () => (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <Card className="w-full max-w-xl shadow-lg">
        <CardHeader className="text-center">
          {/* <AlertCircle className="w-12 h-12 mx-auto text-yellow-500 mb-4" /> */}
          <CardTitle className="text-2xl font-bold text-gray-900">
            Page Refreshed 🙁
          </CardTitle>
          <CardDescription className="text-gray-600 mt-4">
            No problem! You'll be able to continue when the next question appears.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center mt-4">
            <div className="flex space-x-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );



  const getMedalIcon = (rank) => {
    if (rank === 1) return <Crown className="w-8 h-8 text-yellow-500" />;
    if (rank === 2) return <Medal className="w-8 h-8 text-gray-400" />;
    if (rank === 3) return <Medal className="w-8 h-8 text-amber-600" />;
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
                {userStats.rank === 1 &&
                <Trophy className="w-16 h-16 mx-auto text-yellow-500 mb-2 animate-bounce" />
    }
                {userStats?.name && name && (
                  <div className="space-y-6">
                    {/* Profile Section */}
                    <div className="flex flex-col items-center justify-center p-4">
                      <div className="relative">
                        <div className="w-20 h-20 rounded-full bg-gradient-to-r from-blue-100 to-purple-100 flex items-center justify-center mb-3 shadow-lg animate-pulse">
                        {userStats.rank <= 3 ? getMedalIcon(userStats.rank) : <span className="text-2xl font-bold text-yellow-600">#{userStats.rank}</span>}
                        </div>
                        {userStats.rank<=3?
                        <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1 shadow-md">
                          <div className="bg-green-500 rounded-full w-6 h-6 flex items-center justify-center">
                            <p className="text-xs font-bold text-white">#{userStats.rank}</p>
                          </div>
                        </div>:''}
                      </div>
                      <h2 className="text-2xl font-bold text-gray-900 mt-2">{userStats.name}</h2>
                      <p className="text-sm text-gray-500">Quiz Stats</p>
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
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4">
        <div className="absolute top-4 right-4">
          <LogoutButton onLogout={handleLogout} />
        </div>
        
        <Card className="w-full max-w-xl transform transition-all duration-500 ease-in-out hover:scale-105">
          <CardHeader className="text-center">
            <Trophy className="w-12 h-12 mx-auto text-yellow-500 mb-4" />
            <CardTitle className="text-2xl font-bold text-gray-900">
              Quiz Completed!
            </CardTitle>
            <CardDescription className="text-gray-600 mt-2">
              {quizEndMessage || "The quiz has ended. Please wait for the final results..."}
            </CardDescription>
          </CardHeader>
        </Card>
         {/* Loading animation and message */}
         <div className="mt-8 flex flex-col items-center space-y-4">
            <div className="flex justify-center space-x-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
              <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
            </div>
            <div className="text-md font-medium text-gray-600 text-center">
              Stay tuned! Leaderboard coming soon...
            </div>
            <div className="text-sm text-gray-500">
              Don't leave just yet - see where you rank among others!
            </div>
          </div>
      </div>
    );
  }


  const renderTimer = () => (
    <CountdownCircleTimer
      key={`${currentQuestion?.id}-${remainingTime}`}
      isPlaying={!timeUp && !quizEnded && remainingTime > 0}
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
      onComplete={() => ({ shouldRepeat: false })}
    >
      {({ remainingTime }) => (
        <span className="text-sm font-medium">
          {remainingTime}s
        </span>
      )}
    </CountdownCircleTimer>
  );


  const handleManualReconnect = () => {
    console.log("Manual reconnection requested by user");
    // Reset reconnect attempts counter
    reconnectAttemptsRef.current = 0;
    // Try to reconnect
    attemptReconnect();
  };

  const renderSubmitSection = () => {
    if (isSubmitted || timeUp) {
      return (
        <div className="space-y-4">
        <Alert className="mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {timeUp
              ? "Time's up! Wait for the next question..."
              : "Answer submitted! Wait for the next question..."}
          </AlertDescription>
        </Alert>
        {isSubmitted && (
 <ToastProvider>
 <Toast 
        duration={5000} 
        className="fixed top-4 left-1/2 transform -translate-x-1/2 w-full max-w-md bg-gray-800 shadow-lg rounded-lg border border-gray-700 p-4 flex items-center space-x-4"
      >
        <div className="flex items-center space-x-3">
          <Clock className="h-6 w-6 text-blue-400" />
          <div className="flex-1">
            <ToastTitle className="text-sm font-semibold text-white">
              Answer Submitted
            </ToastTitle>
            <ToastDescription className="text-sm text-gray-300">
              Your submission time was <AnimatedCounter finalValue={ElapsedTimes} /> seconds
            </ToastDescription>
          </div>
          <ToastClose className="text-gray-400 hover:text-gray-200">
            <X className="h-4 w-4" />
          </ToastClose>
        </div>
      </Toast>
 <ToastViewport />
</ToastProvider>
)}
      </div>
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
    {/* <ConnectionStatus /> */}
    <ConnectionStatusWithAlert/>

    {showRefreshMessage && isRefreshed ? (
      <RefreshMessage />
    ) : (
      <div className="max-w-3xl mx-auto">
        <LogoutButton onLogout={handleLogout} />
        <Card className="border-none shadow-lg" data-testid="quiz-card">
          <CardContent>
            {currentQuestion.length === 0 ? (
              <WelcomeContent />
            ) : (
              <div className="space-y-6 py-6" data-testid="question-container">
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Timer className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-600" data-testid="question-progress">
                        Question {currentQuestionIndex + 1} of {questionLength}
                      </span>
                      </div>
              <div>{renderTimer()}</div> 
            </div>
            <Progress value={progress} className="h-2" data-testid="progress-bar" />
          </div>
               

                <div
                  key={currentQuestion?.id}
                  className={`relative ${questionCount > 1 ? "animate-slide-in-right" : ""} overflow-hidden`}
                  data-testid="current-question"
                >
                  <div className="text-lg font-medium mb-4" data-testid="question-text">
                    {currentQuestion?.questionText}
                  </div>

                  <RadioGroup
                    value={selectedOption}
                    onValueChange={handleOptionChange}
                    className="space-y-3"
                    disabled={waitingForNextQuestion || timeUp || isSubmitted}
                    data-testid="options-container"
                  >
       {getOptionsArray(currentQuestion).map((option, i) => {
  const isCorrectAnswer = currentQuestion.correctAnswer === option.value;
  const isSelectedOption = selectedOption === option.value;

  return (
    <Label
      key={i}
      className={`relative flex items-center space-x-2 rounded-lg border p-4 transition-all cursor-pointer ${
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
      htmlFor={option.value}
      data-testid={`option-${i + 1}`}
    >
      <div className="flex min-w-0 flex-1 items-center space-x-2">
                            <RadioGroupItem
                              value={option.value}
                              id={option.value}
                              data-testid={`radio-${i + 1}`}
                            />
                            <span className="break-words pr-8" data-testid={`option-text-${i + 1}`}>
                              {option.label}
                            </span>
                          </div>
      {timeUp && (
        <div className="absolute right-4 flex-shrink-0">
          {isCorrectAnswer ? (
            <CheckCircle2 className="h-5 w-5 text-green-500" />
          ) : isSelectedOption ? (
            <XCircle className="h-5 w-5 text-red-500" />
          ) : null}
        </div>
      )}
    </Label>
  );
})}
      </RadioGroup>
    </div>

                <div className="flex justify-between items-center pt-4" data-testid="submit-button">
                  {renderSubmitSection()}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      )}
    </div>
  );
};

export default QuizPage;