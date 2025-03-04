import React, { useEffect, useRef, useState, useCallback } from "react";
import PropTypes from "prop-types";
import SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs";
import { useLocation, useNavigate } from "react-router-dom";
import { Copy, Presentation, Users, MessageCircle, Link, X } from "lucide-react";
import QRCode from "react-qr-code";

import { Button } from "../ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";

// FloatingAvatars Component with PropTypes
const FloatingAvatars = ({ participants }) => {
  const [positions, setPositions] = useState([]);
  
  const generatePosition = useCallback(() => ({
    x: Math.random() * 120 - 60,
    y: Math.random() * 120 - 60,
    scale: 0.9 + Math.random() * 0.5
  }), []);

  const getAvatarUrl = useCallback((name) => {
    const avatarStyles = [
      'adventurer', 'avataaars', 'big-smile', 'bottts',
      'fun-emoji', 'micah', 'miniavs', 'personas'
    ];
    const backgroundColors = ['b6e3f4', 'c0aede', 'd1d4f9', 'ffd5dc', 'ffdfbf'];
    
    const hash = name.split('').reduce((acc, char) => {
      return ((acc << 5) - acc) + char.charCodeAt(0);
    }, 0);
    
    const style = avatarStyles[Math.abs(hash) % avatarStyles.length];
    const bgColor = backgroundColors[Math.abs(hash >> 4) % backgroundColors.length];
    
    return `https://api.dicebear.com/7.x/${style}/svg?seed=${hash}&backgroundColor=${bgColor}&size=250`;
  }, []);

  useEffect(() => {
    setPositions(participants.map((p) => ({
      ...generatePosition(),
      url: getAvatarUrl(p.name),
      id: p.name // Using name as unique identifier
    })));
  }, [participants, generatePosition, getAvatarUrl]);

  return (
    <div className="fixed bottom-48 right-48 w-80 h-80">
      <div className="relative w-full h-full">
        {positions.map((pos) => (
          <div
            key={pos.id}
            className="absolute left-1/2 top-1/2 transition-all duration-1000 ease-in-out"
            style={{
              transform: `translate(-50%, -50%) translate(${pos.x}px, ${pos.y}px) scale(${pos.scale})`,
            }}
          >
            <div className="relative">
              <img
                src={pos.url}
                alt={`Avatar for ${pos.id}`}
                className="w-24 h-24 rounded-full bg-white shadow-xl"
              />
              <div className="absolute inset-0 rounded-full bg-blue-200 opacity-20" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

FloatingAvatars.propTypes = {
  participants: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string.isRequired,
      sessionCode: PropTypes.string.isRequired,
    })
  ).isRequired,
};

// Main PresentQues Component
const PresentQues = () => {
  const baseUrl = import.meta.env.VITE_BASE_URL;
  const clientUrl = import.meta.env.VITE_CLIENT_URL || window.location.origin;

  const [questions, setQuestions] = useState({});
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

  const handleResize = useCallback(() => {
    setIsMobile(window.innerWidth < 768);
  }, []);

  const copyToClipboard = useCallback(async (text, setTooltip, setMessage, defaultMessage) => {
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
  }, []);

  const handleParticipantJoin = useCallback((message) => {
    try {
      const response = JSON.parse(message.body);
      if (response.sessionCode && response.name) {
        setParticipants((prev) => {
          if (!prev.find((p) => p.name === response.name)) {
            return [...prev, {
              name: response.name,
              sessionCode: response.sessionCode,
            }];
          }
          return prev;
        });
      }
    } catch (error) {
      console.error("Error parsing joined students message:", error);
    }
  }, []);

  const handleParticipantLeave = useCallback((message) => {
    try {
      const response = message.body;
      const match = response.match(/User (.*?) left the quiz/);
      if (match && match[1]) {
        const leavingUser = match[1];
        setParticipants((prev) =>
          prev.filter((p) => p.name !== leavingUser)
        );
      }
    } catch (error) {
      console.error("Error handling leave message:", error);
    }
  }, []);

  const handleQuestionsBroadcast = useCallback((questionMessage) => {
    const broadcastedQuestions = JSON.parse(questionMessage.body);
    setQuestions(broadcastedQuestions);
  }, []);

  useEffect(() => {
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [handleResize]);

  useEffect(() => {
    if (!stompClientRef.current) {
      // const socket = new SockJS(`${baseUrl}/quiz-websocket`);
      const client = new Client({
        webSocketFactory: () => new SockJS(`${baseUrl}/quiz-websocket`),
        onConnect: () => {
          console.log("WebSocket connected in PresentQues");

          client.subscribe("/topic/joinedStudents", handleParticipantJoin);
          client.subscribe("/topic/LeaveStudents", handleParticipantLeave);
          client.subscribe(
            `/topic/currentQuestion/${code}`,
            handleQuestionsBroadcast
          );
        },
        reconnectDelay: 1000,
        heartbeatIncoming: 500,
        heartbeatOutgoing: 500,
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
  }, [code, handleParticipantJoin, handleParticipantLeave, handleQuestionsBroadcast]);

  useEffect(() => {
    if (questions && questions.question) {
      navigate("/questions", { state: { questions } });
      localStorage.setItem("code", code);
    }
  }, [questions, navigate, code]);

  const presentQuestions = useCallback(() => {
    if (stompClientRef.current) {
      stompClientRef.current.publish({
        destination: `/app/nextQuestion/${code}`,
        body: JSON.stringify({ index: 0 }),
      });
    }
  }, [code]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-blue-50">
      {/* Main content section */}
      <div className="w-full max-w-[2400px] mx-auto px-16 py-16">
        {/* Header */}
        <div className="text-center space-y-8 mb-24">
          <h1 className="text-8xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Telusko Quiz
          </h1>
          <div className="mt-16 space-y-8">
            <h2 className="text-5xl text-gray-700">Join the Quiz at</h2>
            <div className="relative group flex items-center justify-center space-x-4">
              <a
                href="https://telusq.telusko.com/join"
                className="text-7xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent hover:from-indigo-600 hover:to-blue-600 transition-all duration-300 break-all sm:break-normal"
              >
                telusq.telusko.com/join
              </a>
              <TooltipProvider>
                <Tooltip open={isLinkTooltipOpen}>
                  <TooltipTrigger asChild>
                    <Button
                      variant="secondary"
                      size="lg"
                      onClick={() => copyToClipboard(joinUrl, setIsLinkTooltipOpen, setLinkTooltipMessage, "Copy link")}
                      className="hover:bg-blue-100 h-16 w-16"
                    >
                      <Link className="h-10 w-10" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="text-xl p-4">
                    <p>{linkTooltipMessage}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </div>

        {/* Quiz Code and QR Section */}
        <div className="p-16 rounded-3xl w-full">
          <div className="flex flex-row items-center justify-between gap-16">
            <div className="text-center w-full">
              <div className="text-6xl font-medium text-gray-600 mb-12">Quiz Code</div>
              <div className="flex items-center justify-center space-x-8">
                <code className="text-9xl font-mono font-bold text-blue-600">{code}</code>
                <TooltipProvider>
                  <Tooltip open={isTooltipOpen}>
                    <TooltipTrigger asChild>
                      <Button
                        variant="secondary"
                        size="lg"
                        onClick={() => copyToClipboard(code, setIsTooltipOpen, setTooltipMessage, "Copy code")}
                        className="hover:bg-blue-100 h-24 w-24"
                      >
                        <Copy className="h-12 w-12" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="text-xl p-4">
                      <p>{tooltipMessage}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>

            <div className="h-80 w-px bg-gray-300" />

            <div className="flex flex-col items-center space-y-8 w-full">
              <div className="rounded-xl shadow-2xl p-6 bg-white">
                <QRCode value={joinUrl} size={520} />
              </div>
              <p className="text-4xl font-medium text-gray-600 text-center mt-8">
                Scan to join the quiz session
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-24 flex flex-row items-center justify-center gap-12">
          <Button
            variant="outline"
            size="lg"
            className="text-3xl h-24 px-12"
            onClick={() => setShowParticipants(true)}
          >
            <Users className="h-10 w-10 mr-4" />
            {participants.length} Participants
          </Button>
          <Button
            size="lg"
            className="w-auto bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-xl h-24 text-3xl px-12"
            onClick={presentQuestions}
          >
            <Presentation className="h-12 w-12 mr-6" />
            Present Questions
          </Button>
        </div>
      </div>

      {/* Participants Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 w-[450px] bg-white shadow-2xl transform transition-transform duration-300 ease-in-out z-50 
          ${showParticipants ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="h-full flex flex-col">
          <div className="flex justify-between items-center p-8 border-b">
            <h2 className="text-4xl font-semibold">Quiz Participants</h2>
            <Button
              variant="ghost"
              size="icon"
              className="h-16 w-16"
              onClick={() => setShowParticipants(false)}
            >
              <X className="h-10 w-10" />
            </Button>
          </div>
          <div className="flex-grow overflow-y-auto p-8">
            {participants.length === 0 ? (
              <p className="text-center text-gray-500 py-8 text-2xl">
                No participants have joined yet
              </p>
            ) : (
              <ul className="space-y-4">
                {participants.map((participant) => (
                  <li
                    key={participant.name}
                    className="flex items-center space-x-4 p-4 rounded-xl bg-gray-50"
                  >
                    <Users className="h-8 w-8 text-gray-500" />
                    <span className="break-all text-2xl">{participant.name}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Floating Elements */}
      <FloatingAvatars participants={participants} />

      <button
        className="fixed bottom-12 right-12 sm:bottom-24 sm:right-24 group focus:outline-none"
        onClick={() => setShowParticipants(true)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            setShowParticipants(true);
          }
        }}
        aria-label={`View ${participants.length} Participants`}
        tabIndex={0}
      >
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="h-32 w-32 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 flex items-center justify-center shadow-2xl relative">
                <MessageCircle className="h-16 w-16 text-white" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-white text-3xl font-bold">
                    {participants.length}
                  </span>
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent className="text-xl p-4">
              <p>View Participants</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </button>

      {/* Overlay */}
      {showParticipants && (
        <button
          className="fixed inset-0 bg-black bg-opacity-5 z-40"
          onClick={() => setShowParticipants(false)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              setShowParticipants(false);
            }
          }}
          aria-label="Close participants panel"
          tabIndex={0}
        />
      )}
    </div>
  );
};

export default PresentQues;