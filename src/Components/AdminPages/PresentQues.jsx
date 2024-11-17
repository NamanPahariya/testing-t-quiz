import React, { useEffect, useRef, useState } from "react";
import SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs";
import { useLocation, useNavigate } from "react-router-dom";
import { Copy, Presentation, Users, Timer } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

const PresentQues = () => {
  const baseUrl = import.meta.env.VITE_BASE_URL;
  const [questions, setQuestions] = useState([]);
  const [isTooltipOpen, setIsTooltipOpen] = useState(false);
  const [tooltipMessage, setTooltipMessage] = useState("Copy code");
  const navigate = useNavigate();
  const stompClientRef = useRef(null);
  const location = useLocation();
  const { code } = location.state || {};

  const presentQuestions = () => {
    if (!stompClientRef.current) {
      const socket = new SockJS(`${baseUrl}/quiz-websocket`);
      const client = new Client({
        webSocketFactory: () => socket,
        onConnect: () => {
          client.subscribe(
            `/topic/quizQuestions/${code}`,
            (questionMessage) => {
              const broadcastedQuestions = JSON.parse(questionMessage.body);
              setQuestions(broadcastedQuestions);
            }
          );

          client.publish({
            destination: `/app/broadcastQuestions/${code}`,
            body: JSON.stringify({}),
          });
        },
        onWebSocketError: (error) => {
          console.error("WebSocket error:", error);
        },
      });

      stompClientRef.current = client;
      stompClientRef.current.activate();
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

      // Reset tooltip after 1.5 seconds
      setTimeout(() => {
        setTooltipMessage("copy code");
        setIsTooltipOpen(false);
      }, 1200);
    } catch (err) {
      console.error("Failed to copy:", err);
      setTooltipMessage("Failed to copy");
      setIsTooltipOpen(true);

      // Reset tooltip after error
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
                  <Badge variant="outline" className="text-sm">
                    <Users className="h-3 w-3 mr-1" />0 Participants
                  </Badge>
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
    </div>
  );
};

export default PresentQues;
