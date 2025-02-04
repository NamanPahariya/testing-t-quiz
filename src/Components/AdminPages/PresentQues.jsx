import React, { useEffect, useRef, useState } from "react";
import SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs";
import { useLocation, useNavigate } from "react-router-dom";
import { Copy, Presentation, Users, Timer, MessageCircle, QrCode, Link, X } from "lucide-react";
import QRCode from "react-qr-code";

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
} from "../ui/dialog";

const PresentQues = () => {
  const baseUrl = import.meta.env.VITE_BASE_URL;
  const clientUrl = import.meta.env.VITE_CLIENT_URL || window.location.origin;

  const [questions, setQuestions] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [isTooltipOpen, setIsTooltipOpen] = useState(false);
  const [tooltipMessage, setTooltipMessage] = useState("Copy code");
  const [showParticipants, setShowParticipants] = useState(false);
  const [isLinkTooltipOpen, setIsLinkTooltipOpen] = useState(false);
  const [linkTooltipMessage, setLinkTooltipMessage] = useState("Copy link");
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const navigate = useNavigate();
  const stompClientRef = useRef(null);
  const location = useLocation();
  const { code } = location.state || {};

  const joinUrl = `${clientUrl}/join/${code}`;

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

  const copyToClipboard = async (text, setTooltip, setMessage, defaultMessage) => {
    try {
      await navigator.clipboard.writeText(text);
      setMessage("Copied!");
      setTooltip(true);

      setTimeout(() => {
        setMessage(defaultMessage);
        setTooltip(false);
      }, 1200);
    } catch (err) {
      console.error("Failed to copy:", err);
      setMessage("Failed to copy");
      setTooltip(true);

      setTimeout(() => {
        setMessage(defaultMessage);
        setTooltip(false);
      }, 1500);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-blue-50">
      <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="text-center space-y-4 mb-8 sm:mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Telusko Quiz
          </h1>
          <div className="mt-6 sm:mt-8 space-y-4">
            <h2 className="text-xl sm:text-2xl text-gray-700">Join the Quiz at</h2>
            <div className="relative group flex items-center justify-center space-x-2">
              <a 
                href="https://telusq.telusko.com/join" 
                className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent hover:from-indigo-600 hover:to-blue-600 transition-all duration-300 break-all sm:break-normal"
              >
                telusq.telusko.com/join
              </a>
              <TooltipProvider>
                <Tooltip open={isLinkTooltipOpen}>
                  <TooltipTrigger asChild>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => copyToClipboard(joinUrl, setIsLinkTooltipOpen, setLinkTooltipMessage, "Copy link")}
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
        </div>

        <div className="grid gap-6">
          <Card className="border-2 border-blue-100 shadow-lg">
            <CardContent className="p-4 sm:p-8">
              <div className="flex flex-col items-center space-y-6 sm:space-y-8">
                <div className="w-full flex flex-wrap justify-center gap-3">
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

                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 sm:p-6 rounded-xl w-full">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                    <div className="text-center w-full sm:w-auto">
                      <div className="text-md font-medium text-gray-600 mb-3">Quiz Code</div>
                      <div className="flex items-center justify-center space-x-3">
                        <code className="text-3xl sm:text-4xl font-mono font-bold text-blue-600">{code}</code>
                        <TooltipProvider>
                          <Tooltip open={isTooltipOpen}>
                            <TooltipTrigger asChild>
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => copyToClipboard(code, setIsTooltipOpen, setTooltipMessage, "Copy code")}
                                className="hover:bg-blue-100"
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

                    {!isMobile && <div className="hidden sm:block h-48 w-px bg-gray-300" />}

                    <div className="flex flex-col items-center space-y-2 w-full sm:w-auto">
                      <div className="bg-white p-3 sm:p-4 rounded-lg shadow-md">
                        <QRCode value={joinUrl} size={isMobile ? 120 : 150} />
                      </div>
                      <p className="text-xs sm:text-sm text-gray-600 text-center">
                        Scan to join the quiz session
                      </p>
                    </div>
                  </div>
                </div>

                <div className="w-full max-w-md">
                  <HoverCard>
                    <HoverCardTrigger asChild>
                      <Button
                        size="lg"
                        className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md h-12 sm:h-14 text-base sm:text-lg"
                        onClick={presentQuestions}
                      >
                        <Presentation className="h-5 w-5 sm:h-6 sm:w-6 mr-2" />
                        Present Questions
                      </Button>
                    </HoverCardTrigger>
                    <HoverCardContent>
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold">Launch Interactive Session</h4>
                        <p className="text-sm">Start the quiz for all participants</p>
                      </div>
                    </HoverCardContent>
                  </HoverCard>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Participants Slider (Left Side) */}
      <div 
        className={`fixed inset-y-0 left-0 w-80 bg-white shadow-lg transform transition-transform duration-300 ease-in-out z-50 
          ${showParticipants ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="h-full flex flex-col">
          <div className="flex justify-between items-center p-4 border-b">
            <h2 className="text-xl font-semibold">Quiz Participants</h2>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setShowParticipants(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          <div className="flex-grow overflow-y-auto p-4">
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
                    <span className="break-all">{participant.name}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Floating Button to Open Participants Slider */}
      <div className="fixed bottom-4 right-4 sm:bottom-10 sm:right-10">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className="relative cursor-pointer group"
                onClick={() => setShowParticipants(true)}
              >
                <div className="h-12 w-12 sm:h-16 sm:w-16 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 flex items-center justify-center shadow-lg relative">
                  <MessageCircle className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-white text-base sm:text-lg font-bold">
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
    </div>
  );
};

export default PresentQues;