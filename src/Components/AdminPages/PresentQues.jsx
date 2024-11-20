import React, { useEffect, useRef, useState } from "react";
import SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs";
import { useLocation, useNavigate } from "react-router-dom";
import { Copy, Presentation, Users, Timer, MessageCircle } from "lucide-react";

import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import { Badge } from "../ui/badge";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "../ui/hover-card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../ui/alert-dialog";

const PresentQues = () => {
  const baseUrl = import.meta.env.VITE_BASE_URL;
  const [questions, setQuestions] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [isTooltipOpen, setIsTooltipOpen] = useState(false);
  const [tooltipMessage, setTooltipMessage] = useState("Copy code");
  const [showParticipants, setShowParticipants] = useState(false);
  const navigate = useNavigate();
  const stompClientRef = useRef(null);
  const location = useLocation();
  const { code } = location.state || {};

  useEffect(() => {
    if (!stompClientRef.current) {
      const socket = new SockJS(`${baseUrl}/quiz-websocket`);
      const client = new Client({
        webSocketFactory: () => socket,
        onConnect: () => {
          console.log("WebSocket connected in PresentQues");

          // Subscribe to joined students topic to track participants
          client.subscribe("/topic/joinedStudents", (message) => {
            try {
              const response = JSON.parse(message.body);
              console.log("New participant joined:", response);

              if (response.sessionCode && response.name) {
                setParticipants((prev) => {
                  // Only add if not already in the list
                  if (!prev.find((p) => p.name === response.name)) {
                    return [
                      ...prev,
                      {
                        name: response.name,
                        sessionCode: response.sessionCode,
                      },
                    ];
                  }
                  return prev;
                });
              }
            } catch (error) {
              console.error("Error parsing joined students message:", error);
            }
          });

          // Subscribe to leave students topic
          client.subscribe("/topic/LeaveStudents", (message) => {
            try {
              const response = message.body;
              console.log("Participant left message:", response);

              // Extract name from the response string
              // Response format: "User {name} left the quiz with session code: {sessionCode}"
              const match = response.match(/User (.*?) left the quiz/);
              if (match && match[1]) {
                const leavingUser = match[1];

                // Remove the participant from the list
                setParticipants((prev) =>
                  prev.filter((p) => p.name !== leavingUser)
                );

                console.log(`Participant ${leavingUser} removed from the list`);
              }
            } catch (error) {
              console.error("Error handling leave message:", error);
            }
          });

          // Subscribe to questions
          client.subscribe(
            `/topic/quizQuestions/${code}`,
            (questionMessage) => {
              const broadcastedQuestions = JSON.parse(questionMessage.body);
              setQuestions(broadcastedQuestions);
            }
          );
        },
        onWebSocketError: (error) => {
          console.error("WebSocket error:", error);
        },
      });

      stompClientRef.current = client;
      stompClientRef.current.activate();
    }

    return () => {
      if (stompClientRef.current) {
        stompClientRef.current.deactivate();
      }
    };
  }, [code]);

  const presentQuestions = () => {
    if (stompClientRef.current) {
      stompClientRef.current.publish({
        destination: `/app/broadcastQuestions/${code}`,
        body: JSON.stringify({}),
      });
    }
  };

  useEffect(() => {
    if (questions.length > 0) {
      navigate("/questions", { state: { questions } });
      localStorage.setItem("code", code);
    }
  }, [questions, navigate]);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setTooltipMessage("Copied!");
      setIsTooltipOpen(true);

      setTimeout(() => {
        setTooltipMessage("copy code");
        setIsTooltipOpen(false);
      }, 1200);
    } catch (err) {
      console.error("Failed to copy:", err);
      setTooltipMessage("Failed to copy");
      setIsTooltipOpen(true);

      setTimeout(() => {
        setTooltipMessage("Copy code");
        setIsTooltipOpen(false);
      }, 1500);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-blue-50">
      <div className="max-w-3xl mx-auto p-6">
        <div className="text-center space-y-4 mb-12">
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Telusko Quiz
          </h1>
          <p className="text-gray-600 text-lg">
            Welcome to the live quiz experience
          </p>
        </div>

        <div className="grid gap-6">
          <Card className="border-2 border-blue-100 shadow-lg">
            <CardContent className="p-8">
              <div className="flex flex-col items-center space-y-8">
                <div className="w-full flex justify-center space-x-4">
                  <Badge variant="secondary" className="text-sm">
                    <Timer className="h-3 w-3 mr-1" />
                    Ready to Start
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-sm"
                    onClick={() => setShowParticipants(true)}
                  >
                    <Users className="h-3 w-3 mr-1" />
                    {participants.length} Participants
                  </Button>
                </div>

                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl w-full max-w-md">
                  <div className="text-center">
                    <div className="text-md font-medium text-gray-600 mb-3">
                      Quiz Code
                    </div>
                    <div className="flex items-center justify-center space-x-3">
                      <code className="text-4xl font-mono font-bold text-blue-600">
                        {code}
                      </code>
                      <TooltipProvider>
                        <Tooltip open={isTooltipOpen}>
                          <TooltipTrigger asChild>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={copyToClipboard}
                              className="hover:bg-blue-100"
                              onMouseEnter={() => setIsTooltipOpen(true)}
                              onMouseLeave={() => {
                                if (tooltipMessage === "Copy code") {
                                  setIsTooltipOpen(false);
                                }
                              }}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{tooltipMessage}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                </div>

                <div className="w-full max-w-md">
                  <HoverCard>
                    <HoverCardTrigger asChild>
                      <Button
                        size="lg"
                        className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md h-14 text-lg"
                        onClick={presentQuestions}
                      >
                        <Presentation className="h-6 w-6 mr-2" />
                        Present Questions
                      </Button>
                    </HoverCardTrigger>
                    <HoverCardContent>
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold">
                          Launch Interactive Session
                        </h4>
                        <p className="text-sm">
                          Start the quiz for all participants
                        </p>
                      </div>
                    </HoverCardContent>
                  </HoverCard>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Floating Message Circle with User Count */}
      <div className="fixed bottom-10 right-10">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className="relative cursor-pointer group"
                onClick={() => setShowParticipants(true)}
              >
                <div className="h-16 w-16 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 flex items-center justify-center shadow-lg relative">
                  <MessageCircle className="h-10 w-10 text-white" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-white text-lg font-bold">
                      {participants.length}
                    </span>
                  </div>
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>View Participants</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <Dialog open={showParticipants} onOpenChange={setShowParticipants}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Quiz Participants</DialogTitle>
          </DialogHeader>
          <div className="max-h-96 overflow-y-auto">
            {participants.length === 0 ? (
              <p className="text-center text-gray-500 py-4">
                No participants have joined yet
              </p>
            ) : (
              <ul className="space-y-2">
                {participants.map((participant, index) => (
                  <li
                    key={index}
                    className="flex items-center space-x-2 p-2 rounded-lg bg-gray-50"
                  >
                    <Users className="h-4 w-4 text-gray-500" />
                    <span>{participant.name}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PresentQues;
