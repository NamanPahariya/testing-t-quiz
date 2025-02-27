import React, { useEffect, useState, useRef } from "react";
import SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs";
import { CountdownCircleTimer } from "react-countdown-circle-timer";
import { Card, CardContent } from "../ui/card";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { Label } from "../ui/label";
import { CheckCircle2, XCircle, Timer } from "lucide-react";
import { useBeforeUnload, useNavigate } from "react-router-dom";

import { Progress } from "../ui/progress";
import ConnectionAlertBadge from "../Resuable/connectio";
import {
  Leaderboard,
  LogoutButton,
  QuizEnd,
  RefreshMessage,
  RenderSubmitSection,
  WelcomeContent,
} from "./QuizComponents";

// import WakeLockManager from "./WakeLockManager";

const QuizPage = () => {
  const baseUrl = import.meta.env.VITE_BASE_URL;
  const [questions, setQuestions] = useState([]);
  console.log("questions", questions);
  const [currentQuestion, setCurrentQuestion] = useState([]);
  console.log(currentQuestion, "currentquestions");
  const [selectedOption, setSelectedOption] = useState("");
  const [quizEnded, setQuizEnded] = useState(false);
  const [quizEndMessage, setQuizEndMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [waitingForNextQuestion, setWaitingForNextQuestion] = useState(false);
  const [timeUp, setTimeUp] = useState(false);
  const [isCorrectSelection, setIsCorrectSelection] = useState(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [questionCount, setQuestionCount] = useState(1);
  // const [questionLength, setQuestionLength] = useState(() => {
  //   const storedLength = sessionStorage.getItem("initialQuestionLength");
  //   return storedLength ? parseInt(storedLength, 10) : 0;
  // });
  const [questionLength,setQuestionLength] = useState('');
  const [remainingTime, setRemainingTime] = useState(null);
  const [leaderboard, setLeaderboard] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [ElapsedTimes, setElapsedTimes] = useState(0);
  const [showRefreshMessage, setShowRefreshMessage] = useState(false);
  const [isRefreshed, setIsRefreshed] = useState(false);

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  const [userStats, setUserStats] = useState({
    score: 0,
    rank: 0,
    name: sessionStorage.getItem("username"),
  });

  const CONNECTION_STATES = {
    DISCONNECTED: "disconnected",
    CONNECTING: "connecting",
    CONNECTED: "connected",
    RECONNECTING: "reconnecting",
  };

  // References that need to be tracked
  const stompClientRef = useRef(null);
  const heartbeatTimeoutRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const connectionCheckIntervalRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 10;
  const [connectionState, setConnectionState] = useState(
    CONNECTION_STATES.DISCONNECTED
  );

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
    if (
      (connectionState === CONNECTION_STATES.CONNECTING ||
        connectionState === CONNECTION_STATES.CONNECTED) &&
      !isReconnect
    ) {
      console.log(
        "Already connecting or connected, skipping connection attempt"
      );
      return;
    }

    setConnectionState(
      isReconnect
        ? CONNECTION_STATES.RECONNECTING
        : CONNECTION_STATES.CONNECTING
    );

    // If reconnecting, make sure previous connection is properly closed
    if (isReconnect && stompClientRef.current) {
      await safeDeactivateClient();
    }

    try {
      // Create socket with a timeout to handle hanging connections
      const socket = new SockJS(`${baseUrl}/quiz-websocket`, null, {
        transports: [
          "websocket", // Primary
          "xhr-streaming", // Fallback
          "xhr-polling", // Secondary fallback
          "jsonp-polling", // Last resort
        ],
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
          return Math.min(1000 * Math.pow(0.5, attempt), 30000);
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
            const length = broadcastedQuestions.length;
            if (length > 0) {
              setQuestionLength(length);
            }
            console.log("Received questions:", broadcastedQuestions);
            // if (
            //   broadcastedQuestions.length > 0 &&
            //   !sessionStorage.getItem("initialQuestionLength")
            // ) {
            //   sessionStorage.setItem("initialQuestionLength", length);
            // }
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
          client.subscribe(
            `/topic/currentQuestion/${sessionCode}`,
            (message) => {
              const newQuestion = JSON.parse(message.body);
              console.log("Received new question:", newQuestion.question);
              // const storedLength = sessionStorage.getItem(
              //   "initialQuestionLength"
              // );
              // if (storedLength) {
              //   setQuestionLength(storedLength);
              // }
             const length = newQuestion.length;
             if(length){
              setQuestionLength(length)
             }
              if (!quizEnded && newQuestion) {
                setSelectedOption("");
                setCurrentQuestion(newQuestion.question);
                setWaitingForNextQuestion(false);
                setTimeUp(false);
                setIsCorrectSelection(null);
                setIsSubmitted(false);
                setQuestionCount((prev) => prev + 1);
                setIsRefreshed(false);
              }
            }
          );

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
                setIsCorrectSelection(
                  selectedOption === currentQuestion.correctAnswer
                );
              }
            }
          });

          // Subscribe to leaderboard
          client.subscribe(`/topic/leaderboard/${sessionCode}`, (message) => {
            const leaderboardData = JSON.parse(message.body);
            if (leaderboardData) {
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
                      name: userDetails.name,
                    });
                  }
                }
              );

              client.publish({
                destination: `/app/userLeaderboard/${sessionCode}`,
                body: name,
              });
            }
          });
        },

        onStompError: (frame) => {
          console.error("STOMP error:", frame);
          handleConnectionFailure();
        },

        onWebSocketClose: () => {
          console.log("WebSocket connection closed");
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
          console.error("WebSocket error:", event);
          handleConnectionFailure();
        },

        debug: (str) => {
          // Limit debug logging to reduce console noise
          if (
            str.includes("error") ||
            str.includes("fail") ||
            str.includes("connect")
          ) {
            console.debug(str);
          }
        },
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
        console.log("connection is good");
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
      console.error(
        `Failed to reconnect after ${maxReconnectAttempts} attempts`
      );
      // Could show an error UI to the user here
      return;
    }

    const delay = Math.min(
      1000 * Math.pow(1.5, reconnectAttemptsRef.current),
      1000
    );
    console.log(
      `Attempting to reconnect in ${delay}ms (attempt ${
        reconnectAttemptsRef.current + 1
      }/${maxReconnectAttempts})`
    );

    reconnectTimeoutRef.current = setTimeout(() => {
      reconnectAttemptsRef.current++;
      connectWebSocket(true);
    }, delay);
  };

  // Monitor network changes (works in modern browsers)
  const setupNetworkMonitoring = () => {
    // Check if the Network Information API is available
    if (
      "connection" in navigator &&
      "addEventListener" in navigator.connection
    ) {
      navigator.connection.addEventListener("change", () => {
        console.log("Network conditions changed, checking connection");
        if (stompClientRef.current && !stompClientRef.current.connected) {
          console.log(
            "Network changed and disconnected, attempting to reconnect"
          );
          attemptReconnect();
        } else {
          console.log("you are already connected");
        }
      });
    }

    // Add event listener for online/offline events (works in all browsers)
    window.addEventListener("online", () => {
      console.log("Browser reports online status");
      if (stompClientRef.current && !stompClientRef.current.connected) {
        console.log("Device came online, attempting to reconnect");
        attemptReconnect();
      }
    });

    window.addEventListener("offline", () => {
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
      if (heartbeatTimeoutRef.current)
        clearTimeout(heartbeatTimeoutRef.current);
      if (reconnectTimeoutRef.current)
        clearTimeout(reconnectTimeoutRef.current);
      if (connectionCheckIntervalRef.current)
        clearInterval(connectionCheckIntervalRef.current);

      // Safely deactivate client
      await safeDeactivateClient();
    };
  }, []);

  useEffect(() => {
    if (questionLength && currentQuestionIndex >= 0) {
      setProgress(((currentQuestionIndex + 1) / questionLength) * 100);
    }
  }, [currentQuestionIndex, questionLength]);

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
      if (
        connectionState !== CONNECTION_STATES.DISCONNECTED &&
        stompClientRef.current &&
        !stompClientRef.current.connected
      ) {
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
      // sessionStorage.removeItem("initialQuestionLength");

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
      sessionStorage.removeItem("username");
      sessionStorage.removeItem("sessionCode");
      sessionStorage.removeItem("userId");
      sessionStorage.removeItem("quizPageLeaving");
      // sessionStorage.removeItem("initialQuestionLength");
    };
  }, []);

  // Handle page refresh/close
  // useEffect(() => {
  //   const confirmationMessage =
  //     "Are you sure you want to leave? You will be logged out of the quiz.";
  //   let isUnloading = false;

  //   const handleBeforeUnload = (event) => {
  //     // Set flag only when actually unloading (refresh/close/navigate)
  //     sessionStorage.setItem("quizPageLeaving", "true");
  //     event.preventDefault();
  //     event.returnValue = confirmationMessage;
  //     return confirmationMessage;
  //   };

  //   // const handleVisibilityChange = () => {
  //   //   if (document.visibilityState === "hidden") {
  //   //     // Tab switched or minimized
  //   //     sessionStorage.setItem("quizPageLeaving", "true");
  //   //   } else {
  //   //     // Tab became active again - clear flag if still present
  //   //     sessionStorage.removeItem("quizPageLeaving");
  //   //   }
  //   // };

  //   // Check for existing flag on mount
  //   const wasLeaving = sessionStorage.getItem("quizPageLeaving");
  //   if (wasLeaving) {
  //     sessionStorage.removeItem("quizPageLeaving");
  //     const shouldStay = window.confirm(confirmationMessage);
  //     if (!shouldStay) {
  //       setShowRefreshMessage(true);
  //       setIsRefreshed(true); // Add this line
  //       setWaitingForNextQuestion(true);
  //     } else {
  //       handleLogout();
  //     }
  //   }

  //   // Add event listeners
  //   window.addEventListener("beforeunload", handleBeforeUnload);
  //   // document.addEventListener("visibilitychange", handleVisibilityChange);

  //   return () => {
  //     // Cleanup listeners
  //     window.removeEventListener("beforeunload", handleBeforeUnload);
  //     document.removeEventListener("visibilitychange", handleVisibilityChange);

  //     // Clear flag if component unmounts without page unload
  //     if (!isUnloading) {
  //       sessionStorage.removeItem("quizPageLeaving");
  //     }
  //   };
  // }, []);

  useEffect(() => {
    const handleBeforeUnload = (event) => {
      // Trigger the default browser prompt
      event.preventDefault();
      event.returnValue = ""; // Required for Chrome and other modern browsers
    };
  
    // Add the beforeunload event listener
    window.addEventListener("beforeunload", handleBeforeUnload);
  
    // Cleanup the event listener on component unmount
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
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
      if (response.ok) {
        // console.log(response,'response')
        const { message, elapsedTimes } = await response.json();
        const timeValue = elapsedTimes[0].ElapsedTime;
        console.log("message:", message, "elsapsedTimes:", timeValue);
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

  if (quizEnded) {
    if (showLeaderboard && leaderboard) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4">
          <div className="absolute top-4 right-4">
            <LogoutButton onLogout={handleLogout} />
          </div>
          <Leaderboard userStats={userStats} />
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4">
        <div className="absolute top-4 right-4">
          <LogoutButton onLogout={handleLogout} />
        </div>

        <QuizEnd quizEndMessage={quizEndMessage} />
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
        <span className="text-sm font-medium">{remainingTime}s</span>
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-8 overflow-x-hidden">
      {/* <ConnectionStatus /> */}
      <ConnectionStatusWithAlert />

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
                <div
                  className="space-y-6 py-6"
                  data-testid="question-container"
                >
                  <div className="mb-8">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Timer className="w-4 h-4 text-gray-500" />
                        <span
                          className="text-sm text-gray-600"
                          data-testid="question-progress"
                        >
                          Question {currentQuestionIndex + 1} of{" "}
                          {questionLength}
                        </span>
                      </div>
                      <div>{renderTimer()}</div>
                    </div>
                    <Progress
                      value={progress}
                      className="h-2"
                      data-testid="progress-bar"
                    />
                  </div>

                  <div
                    key={currentQuestion?.id}
                    className={`relative ${
                      questionCount > 1 ? "animate-slide-in-right" : ""
                    } overflow-hidden`}
                    data-testid="current-question"
                  >
                    <div
                      className="text-lg font-medium mb-4"
                      data-testid="question-text"
                    >
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
                        const isCorrectAnswer =
                          currentQuestion.correctAnswer === option.value;
                        const isSelectedOption =
                          selectedOption === option.value;

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
                              <span
                                className="break-words pr-8"
                                data-testid={`option-text-${i + 1}`}
                              >
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

                  <div
                    className="flex justify-between items-center pt-4"
                    data-testid="submit-button"
                  >
                    <RenderSubmitSection
                      isSubmitted={isSubmitted}
                      timeUp={timeUp}
                      ElapsedTimes={ElapsedTimes}
                      handleSubmit={handleSubmit}
                      isSubmitting={isSubmitting}
                      selectedOption={selectedOption}
                    />
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
