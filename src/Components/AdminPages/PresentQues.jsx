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

// Custom hook for viewport size
const useViewportSize = () => {
  const [viewport, setViewport] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
    scale: 1,
    is4K: window.innerWidth >= 3840,
    is2K: window.innerWidth >= 2560 && window.innerWidth < 3840,
    isFullHD: window.innerWidth >= 1920 && window.innerWidth < 2560,
    isMobile: window.innerWidth < 768
  });

  useEffect(() => {
    const calculateScale = (width) => {
      if (width >= 3840) return 2;       // 4K
      if (width >= 2560) return 1.5;     // 2K/1440p
      if (width >= 1920) return 1.25;    // Full HD
      return 1;                          // Base scale
    };

    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      setViewport({
        width,
        height,
        scale: calculateScale(width),
        is4K: width >= 3840,
        is2K: width >= 2560 && width < 3840,
        isFullHD: width >= 1920 && width < 2560,
        isMobile: width < 768
      });
    };

    handleResize(); // Initial calculation
    window.addEventListener('resize', handleResize);
    
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return viewport;
};

// FloatingAvatars Component with PropTypes
const FloatingAvatars = ({ participants, viewport }) => {
  const [positions, setPositions] = useState([]);
  
  const generatePosition = useCallback(() => {
    // Scale the range based on viewport size
    const range = viewport.is4K ? 100 : viewport.is2K ? 80 : 40;
    
    return {
      x: Math.random() * range * 2 - range,
      y: Math.random() * range * 2 - range,
      scale: 0.8 + Math.random() * 0.4
    };
  }, [viewport]);

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
    
    // Scale avatar size based on viewport
    const size = viewport.is4K ? 300 : viewport.is2K ? 200 : 150;
    
    return `https://api.dicebear.com/7.x/${style}/svg?seed=${hash}&backgroundColor=${bgColor}&size=${size}`;
  }, [viewport]);

  useEffect(() => {
    setPositions(participants.map((p) => ({
      ...generatePosition(),
      url: getAvatarUrl(p.name),
      id: p.name // Using name as unique identifier
    })));
  }, [participants, generatePosition, getAvatarUrl]);

  // Calculate size based on viewport
  const getAvatarSize = () => {
    if (viewport.is4K) return 'w-20 h-20';
    if (viewport.is2K) return 'w-16 h-16';
    if (viewport.isFullHD) return 'w-14 h-14';
    return 'w-12 h-12';
  };

  // Calculate container size based on viewport
  const getContainerSize = () => {
    if (viewport.is4K) return 'w-64 h-64';
    if (viewport.is2K) return 'w-56 h-56';
    if (viewport.isFullHD) return 'w-48 h-48';
    return 'w-40 h-40';
  };

  return (
    <div className={`fixed bottom-24 right-24 ${getContainerSize()}`}>
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
                className={`${getAvatarSize()} rounded-full bg-white shadow-lg`}
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
  viewport: PropTypes.object.isRequired,
};

// Main PresentQues Component
const PresentQues = () => {
  const baseUrl = import.meta.env.VITE_BASE_URL;
  const clientUrl = import.meta.env.VITE_CLIENT_URL || window.location.origin;
  const viewport = useViewportSize();

  const [questions, setQuestions] = useState({});
  const [participants, setParticipants] = useState([]);
  const [isTooltipOpen, setIsTooltipOpen] = useState(false);
  const [tooltipMessage, setTooltipMessage] = useState("Copy code");
  const [showParticipants, setShowParticipants] = useState(false);
  const [isLinkTooltipOpen, setIsLinkTooltipOpen] = useState(false);
  const [linkTooltipMessage, setLinkTooltipMessage] = useState("Copy link");

  const navigate = useNavigate();
  const stompClientRef = useRef(null);
  const location = useLocation();
  const { code } = location.state || {};

  const joinUrl = `${clientUrl}/join/${code}`;

  // Get QR code size based on viewport
  const getQRCodeSize = () => {
    if (viewport.is4K) return 400;
    if (viewport.is2K) return 350;
    if (viewport.isFullHD) return 300;
    if (viewport.isMobile) return 160;
    return 280;
  };

  // Get sidebar width based on viewport
  const getSidebarWidth = () => {
    if (viewport.is4K) return 'w-128'; // Custom width class
    if (viewport.is2K) return 'w-96';
    return 'w-80';
  };

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

  // Calculate max-width for the main content based on viewport
  const getContentMaxWidth = () => {
    if (viewport.is4K) return 'max-w-8xl'; // Super large container for 4K
    if (viewport.is2K) return 'max-w-7xl';
    if (viewport.isFullHD) return 'max-w-6xl';
    return 'max-w-6xl';
  };

  // Get font sizes based on viewport
  const getHeadingClass = () => {
    if (viewport.is4K) return 'text-7xl';
    if (viewport.is2K) return 'text-6xl';
    if (viewport.isFullHD) return 'text-5xl';
    return 'text-4xl sm:text-5xl';
  };

  const getSubheadingClass = () => {
    if (viewport.is4K) return 'text-4xl';
    if (viewport.is2K) return 'text-3xl';
    if (viewport.isFullHD) return 'text-2xl sm:text-3xl';
    return 'text-2xl sm:text-3xl';
  };

  const getJoinLinkClass = () => {
    if (viewport.is4K) return 'text-7xl';
    if (viewport.is2K) return 'text-6xl';
    if (viewport.isFullHD) return 'text-5xl';
    return 'text-3xl sm:text-4xl md:text-5xl';
  };

  const getCodeFontClass = () => {
    if (viewport.is4K) return 'text-9xl';
    if (viewport.is2K) return 'text-8xl';
    if (viewport.isFullHD) return 'text-7xl';
    return 'text-6xl sm:text-7xl';
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-blue-50">
      {/* Main content section */}
      <div className={`w-full ${getContentMaxWidth()} mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12 py-6 md:py-8 lg:py-10 xl:py-12`}>
        {/* Header */}
        <div className="text-center space-y-4 md:space-y-6 lg:space-y-8 mb-8 sm:mb-12 lg:mb-16">
          <h1 className={`${getHeadingClass()} font-bold tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent`}>
            Telusko Quiz
          </h1>
          <div className="mt-6 sm:mt-8 md:mt-10 lg:mt-12 space-y-4 md:space-y-6">
            <h2 className={`${getSubheadingClass()} text-gray-700`}>Join the Quiz at</h2>
            <div className="relative group flex items-center justify-center space-x-2 md:space-x-3 lg:space-x-4">
              <a
                href="https://telusq.telusko.com/join"
                className={`${getJoinLinkClass()} font-bold tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent hover:from-indigo-600 hover:to-blue-600 transition-all duration-300 break-all sm:break-normal`}
              >
                telusq.telusko.com/join
              </a>
              <TooltipProvider>
                <Tooltip open={isLinkTooltipOpen}>
                  <TooltipTrigger asChild>
                    <Button
                      variant="secondary"
                      size={viewport.is4K || viewport.is2K ? "lg" : "sm"}
                      onClick={() => copyToClipboard(joinUrl, setIsLinkTooltipOpen, setLinkTooltipMessage, "Copy link")}
                      className="hover:bg-blue-100"
                    >
                      <Link className={viewport.is4K ? "h-8 w-8" : viewport.is2K ? "h-7 w-7" : viewport.isFullHD ? "h-6 w-6" : "h-6 w-6"} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className={viewport.is4K || viewport.is2K ? "text-lg p-3" : "p-2"}>
                    <p>{linkTooltipMessage}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </div>

        {/* Quiz Code and QR Section */}
        <div className="p-2 sm:p-6 md:p-8 lg:p-10 xl:p-12 rounded-xl w-full">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 md:gap-8 lg:gap-10">
            <div className="text-center w-full sm:w-auto">
              <div className={`${getSubheadingClass()} font-medium text-gray-600 mb-6 md:mb-8 lg:mb-10`}>Quiz Code</div>
              <div className="flex items-center justify-center space-x-4 md:space-x-6">
                <code className={`${getCodeFontClass()} font-mono font-bold text-blue-600`}>{code}</code>
                <TooltipProvider>
                  <Tooltip open={isTooltipOpen}>
                    <TooltipTrigger asChild>
                      <Button
                        variant="secondary"
                        size={viewport.is4K || viewport.is2K ? "lg" : viewport.isFullHD ? "default" : "lg"}
                        onClick={() => copyToClipboard(code, setIsTooltipOpen, setTooltipMessage, "Copy code")}
                        className="hover:bg-blue-100"
                      >
                        <Copy className={viewport.is4K ? "h-8 w-8" : viewport.is2K ? "h-7 w-7" : "h-6 w-6"} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className={viewport.is4K || viewport.is2K ? "text-lg p-3" : "p-2"}>
                      <p>{tooltipMessage}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>

            {!viewport.isMobile && <div className="hidden sm:block h-48 md:h-56 lg:h-64 xl:h-72 w-px bg-gray-300" />}

            <div className="flex flex-col items-center space-y-4 md:space-y-6 w-full sm:w-auto">
              <div className="rounded-lg shadow-lg p-2 md:p-3 lg:p-4 bg-white">
                <QRCode value={joinUrl} size={getQRCodeSize()} />
              </div>
              <p className={`${viewport.is4K ? "text-3xl" : viewport.is2K ? "text-2xl" : viewport.isFullHD ? "text-xl" : "text-xl sm:text-2xl"} font-medium text-gray-600 text-center`}>
                Scan to join the quiz session
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-12 md:mt-16 lg:mt-20 flex flex-col sm:flex-row items-center justify-center gap-6 md:gap-8">
          <Button
            variant="outline"
            size={viewport.is4K || viewport.is2K ? "lg" : "default"}
            className={`${viewport.is4K ? "text-2xl h-16" : viewport.is2K ? "text-xl h-14" : viewport.isFullHD ? "text-lg h-12" : "text-lg"}`}
            onClick={() => setShowParticipants(true)}
          >
            <Users className={viewport.is4K ? "h-7 w-7 mr-3" : viewport.is2K ? "h-6 w-6 mr-3" : "h-5 w-5 mr-2"} />
            {participants.length} Participants
          </Button>
          <Button
            size={viewport.is4K || viewport.is2K ? "lg" : "default"}
            className={`
              w-full sm:w-auto 
              bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 
              text-white shadow-md 
              ${viewport.is4K ? "text-2xl h-16" : viewport.is2K ? "text-xl h-14" : viewport.isFullHD ? "text-lg h-12" : "h-14 text-lg"}
            `}
            onClick={presentQuestions}
          >
            <Presentation className={viewport.is4K ? "h-8 w-8 mr-3" : viewport.is2K ? "h-7 w-7 mr-3" : "h-6 w-6 mr-2"} />
            Present Questions
          </Button>
        </div>
      </div>

      {/* Participants Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 ${getSidebarWidth()} bg-white shadow-lg transform transition-transform duration-300 ease-in-out z-50 
          ${showParticipants ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="h-full flex flex-col">
          <div className="flex justify-between items-center p-4 md:p-6 lg:p-8 border-b">
            <h2 className={`${viewport.is4K ? "text-3xl" : viewport.is2K ? "text-2xl" : "text-xl"} font-semibold`}>Quiz Participants</h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowParticipants(false)}
            >
              <X className={viewport.is4K ? "h-7 w-7" : viewport.is2K ? "h-6 w-6" : "h-5 w-5"} />
            </Button>
          </div>
          <div className="flex-grow overflow-y-auto p-4 md:p-6 lg:p-8">
            {participants.length === 0 ? (
              <p className={`text-center text-gray-500 py-4 md:py-6 lg:py-8 ${viewport.is4K ? "text-xl" : viewport.is2K ? "text-lg" : ""}`}>
                No participants have joined yet
              </p>
            ) : (
              <ul className="space-y-2 md:space-y-3 lg:space-y-4">
                {participants.map((participant) => (
                  <li
                    key={participant.name}
                    className={`
                      flex items-center space-x-2 md:space-x-3
                      p-2 md:p-3 lg:p-4
                      rounded-lg bg-gray-50
                      ${viewport.is4K ? "text-xl" : viewport.is2K ? "text-lg" : ""}
                    `}
                  >
                    <Users className={viewport.is4K ? "h-6 w-6" : viewport.is2K ? "h-5 w-5" : "h-4 w-4"} text-gray-500 />
                    <span className="break-all">{participant.name}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Floating Elements */}
      <FloatingAvatars participants={participants} viewport={viewport} />

      <button
        className={`
          fixed 
          bottom-4 right-4 sm:bottom-10 sm:right-10 
          ${viewport.is4K ? "bottom-16 right-16" : viewport.is2K ? "bottom-12 right-12" : ""}
          group focus:outline-none
        `}
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
              <div className={`
                ${viewport.is4K ? "h-24 w-24" : viewport.is2K ? "h-20 w-20" : viewport.isFullHD ? "h-18 w-18" : "h-12 w-12 sm:h-16 sm:w-16"}
                rounded-full 
                bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 
                flex items-center justify-center shadow-lg relative
              `}>
                <MessageCircle className={viewport.is4K ? "h-16 w-16" : viewport.is2K ? "h-12 w-12" : "h-8 w-8 sm:h-10 sm:w-10"} text-white />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className={`
                    text-white font-bold
                    ${viewport.is4K ? "text-2xl" : viewport.is2K ? "text-xl" : "text-base sm:text-lg"}
                  `}>
                    {participants.length}
                  </span>
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent className={viewport.is4K || viewport.is2K ? "text-lg p-3" : ""}>
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