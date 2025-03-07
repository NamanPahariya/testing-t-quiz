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

// Custom hook to detect 4K resolution
const use4KDisplay = () => {
  const [is4K, setIs4K] = useState(false);
  
  useEffect(() => {
    const checkResolution = () => {
      setIs4K(window.innerWidth >= 3800 && window.innerHeight >= 2000);
    };
    
    checkResolution();
    window.addEventListener('resize', checkResolution);
    
    return () => window.removeEventListener('resize', checkResolution);
  }, []);
  
  return is4K;
};

// FloatingAvatars Component with PropTypes
const FloatingAvatars = ({ participants }) => {
  const is4K = use4KDisplay();
  const [positions, setPositions] = useState([]);
  
  const generatePosition = useCallback(() => ({
    x: Math.random() * (is4K ? 180 : 80) - (is4K ? 90 : 40),
    y: Math.random() * (is4K ? 180 : 80) - (is4K ? 90 : 40),
    scale: 0.8 + Math.random() * (is4K ? 0.7 : 0.4)
  }), [is4K]);

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
    
    return `https://api.dicebear.com/7.x/${style}/svg?seed=${hash}&backgroundColor=${bgColor}&size=${is4K ? 300 : 150}`;
  }, [is4K]);

  useEffect(() => {
    setPositions(participants.map((p) => ({
      ...generatePosition(),
      url: getAvatarUrl(p.name),
      id: p.name // Using name as unique identifier
    })));
  }, [participants, generatePosition, getAvatarUrl]);

  return (
    <div className={`fixed ${is4K ? 'bottom-64 right-64 w-128 h-128' : 'bottom-24 right-24 w-40 h-40'}`}>
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
                className={`${is4K ? 'w-32 h-32' : 'w-12 h-12'} rounded-full bg-white ${is4K ? 'shadow-2xl' : 'shadow-lg'}`}
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
  const is4K = use4KDisplay();
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
      <div className={`w-full ${is4K ? 'px-24 py-24' : 'max-w-6xl px-4 sm:px-6 lg:px-8 py-6'} mx-auto`}>
        {/* Header */}
        <div className={`text-center ${is4K ? 'space-y-12 mb-32' : 'space-y-4 mb-8 sm:mb-12'}`}>
          <h1 className={`${is4K ? 'text-9xl' : 'text-4xl sm:text-5xl'} font-bold tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent`}>
            Telusko Quiz
          </h1>
          <div className={`${is4K ? 'mt-24 space-y-12' : 'mt-6 sm:mt-8 space-y-4'}`}>
            <h2 className={`${is4K ? 'text-6xl' : 'text-2xl sm:text-3xl'} text-gray-700`}>Join the Quiz at</h2>
            <div className="relative group flex items-center justify-center space-x-2">
              <a
                href="https://telusq.telusko.com/join"
                className={`${is4K ? 'text-8xl' : 'text-3xl sm:text-4xl md:text-5xl'} font-bold tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent hover:from-indigo-600 hover:to-blue-600 transition-all duration-300 break-all sm:break-normal`}
              >
                telusq.telusko.com/join
              </a>
              <TooltipProvider>
                <Tooltip open={isLinkTooltipOpen}>
                  <TooltipTrigger asChild>
                    <Button
                      variant="secondary"
                      size={is4K ? "lg" : "sm"}
                      onClick={() => copyToClipboard(joinUrl, setIsLinkTooltipOpen, setLinkTooltipMessage, "Copy link")}
                      className={`hover:bg-blue-100 ${is4K ? 'h-20 w-20' : ''}`}
                    >
                      <Link className={is4K ? "h-12 w-12" : "h-6 w-6"} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className={is4K ? "text-2xl p-6" : ""}>
                    <p>{linkTooltipMessage}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </div>

        {/* Quiz Code and QR Section */}
        {is4K ? (
          <div className="p-24 rounded-3xl w-full bg-white/40 shadow-xl mb-24">
            <div className="flex flex-row items-center justify-between">
              <div className="flex-1 text-center">
                <div className="text-7xl font-medium text-gray-600 mb-16">Quiz Code</div>
                <div className="flex items-center justify-center space-x-8">
                  <code className="text-[10rem] font-mono font-bold text-blue-600">{code}</code>
                  <TooltipProvider>
                    <Tooltip open={isTooltipOpen}>
                      <TooltipTrigger asChild>
                        <Button
                          variant="secondary"
                          size="lg"
                          onClick={() => copyToClipboard(code, setIsTooltipOpen, setTooltipMessage, "Copy code")}
                          className="hover:bg-blue-100 h-28 w-28"
                        >
                          <Copy className="h-16 w-16" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent className="text-2xl p-6">
                        <p>{tooltipMessage}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>

              <div className="h-96 w-px bg-gray-300 mx-20" />

              <div className="flex-1 flex flex-col items-center space-y-10">
                <div className="rounded-xl shadow-2xl p-8 bg-white">
                  <QRCode value={joinUrl} size={600} />
                </div>
                <p className="text-5xl font-medium text-gray-600 text-center mt-10">
                  Scan to join the quiz session
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className={`p-2 sm:p-8 rounded-xl w-full`}>
            <div className={`flex ${isMobile ? 'flex-col' : 'flex-row'} items-center justify-between gap-6`}>
              <div className={`text-center ${isMobile ? 'w-full' : 'w-auto'}`}>
                <div className="text-3xl sm:text-4xl font-medium text-gray-600 mb-6">Quiz Code</div>
                <div className="flex items-center justify-center space-x-4">
                  <code className="text-6xl sm:text-7xl font-mono font-bold text-blue-600">{code}</code>
                  <TooltipProvider>
                    <Tooltip open={isTooltipOpen}>
                      <TooltipTrigger asChild>
                        <Button
                          variant="secondary"
                          size="lg"
                          onClick={() => copyToClipboard(code, setIsTooltipOpen, setTooltipMessage, "Copy code")}
                          className="hover:bg-blue-100"
                        >
                          <Copy className="h-6 w-6" />
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

              <div className="flex flex-col items-center space-y-4 w-full sm:w-auto">
                <div className="rounded-lg shadow-lg">
                  <QRCode value={joinUrl} size={isMobile ? 160 : 280} />
                </div>
                <p className="text-xl sm:text-2xl font-medium text-gray-600 text-center">
                  Scan to join the quiz session
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className={`${is4K ? 'mt-32 mb-20' : 'mt-12'} flex ${isMobile ? 'flex-col' : 'flex-row'} items-center justify-center ${is4K ? 'gap-20' : 'gap-6'}`}>
          <Button
            variant="outline"
            size={is4K ? "lg" : "lg"}
            className={`${is4K ? 'text-4xl h-28 px-16' : 'text-lg'}`}
            onClick={() => setShowParticipants(true)}
          >
            <Users className={is4K ? "h-12 w-12 mr-6" : "h-5 w-5 mr-2"} />
            {participants.length} Participants
          </Button>
          <Button
            size="lg"
            className={`${isMobile ? 'w-full' : 'w-auto'} bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white ${is4K ? 'shadow-2xl h-28 text-4xl px-16' : 'shadow-md h-14 text-lg'}`}
            onClick={presentQuestions}
          >
            <Presentation className={is4K ? "h-14 w-14 mr-8" : "h-6 w-6 mr-2"} />
            Present Questions
          </Button>
        </div>
      </div>

      {/* Participants Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 ${is4K ? 'w-[600px]' : 'w-80'} bg-white shadow-lg transform transition-transform duration-300 ease-in-out z-50 
          ${showParticipants ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="h-full flex flex-col">
          <div className={`flex justify-between items-center ${is4K ? 'p-12' : 'p-4'} border-b`}>
            <h2 className={`${is4K ? 'text-5xl' : 'text-xl'} font-semibold`}>Quiz Participants</h2>
            <Button
              variant="ghost"
              size="icon"
              className={is4K ? "h-20 w-20" : ""}
              onClick={() => setShowParticipants(false)}
            >
              <X className={is4K ? "h-12 w-12" : "h-5 w-5"} />
            </Button>
          </div>
          <div className={`flex-grow overflow-y-auto ${is4K ? 'p-12' : 'p-4'}`}>
            {participants.length === 0 ? (
              <p className={`text-center text-gray-500 ${is4K ? 'py-12 text-3xl' : 'py-4'}`}>
                No participants have joined yet
              </p>
            ) : (
              <ul className={is4K ? "space-y-6" : "space-y-2"}>
                {participants.map((participant) => (
                  <li
                    key={participant.name}
                    className={`flex items-center ${is4K ? 'space-x-6 p-6 rounded-2xl' : 'space-x-2 p-2 rounded-lg'} bg-gray-50`}
                  >
                    <Users className={is4K ? "h-10 w-10" : "h-4 w-4"} text-gray-500 />
                    <span className={`break-all ${is4K ? 'text-3xl' : ''}`}>{participant.name}</span>
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
        className={`fixed ${is4K ? 'bottom-20 right-20' : 'bottom-4 right-4 sm:bottom-10 sm:right-10'} group focus:outline-none`}
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
              <div className={`${is4K ? 'h-40 w-40' : 'h-12 w-12 sm:h-16 sm:w-16'} rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 flex items-center justify-center ${is4K ? 'shadow-2xl' : 'shadow-lg'} relative`}>
                <MessageCircle className={`${is4K ? 'h-20 w-20' : 'h-8 w-8 sm:h-10 sm:w-10'} text-white`} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className={`text-white ${is4K ? 'text-4xl' : 'text-base sm:text-lg'} font-bold`}>
                    {participants.length}
                  </span>
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent className={is4K ? "text-2xl p-6" : ""}>
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