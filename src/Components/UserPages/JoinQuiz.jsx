import React, { useEffect, useState, useCallback } from "react";
import SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs";
import Aos from "aos";
import "aos/dist/aos.css";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";

const JoinQuiz = () => {
  const baseUrl = import.meta.env.VITE_BASE_URL;

  const [client, setClient] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [sessionCode, setSessionCode] = useState("");
  const [studentName, setStudentName] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
    Aos.init({ duration: 2000 });
  }, []);

  // Initialize WebSocket connection
  const initializeWebSocket = useCallback(() => {
    if (isConnecting) return null;

    setIsConnecting(true);
    const socket = new SockJS(`${baseUrl}/quiz-websocket`);
    const stompClient = new Client({
      webSocketFactory: () => socket,
      onConnect: () => {
        console.log("WebSocket connected");
        setIsConnecting(false);
        setClient(stompClient);

        stompClient.subscribe("/topic/joinedStudents", (message) => {
          const response = message.body;
          console.log("Received join message:", response);
          if (!response.includes("Invalid session code!")) {
            navigate("/quiz");
          } else {
            toast.error("Invalid session code!");
            setStudentName("");
            setSessionCode("");
          }
        });
      },
      onWebSocketClose: () => {
        console.log("WebSocket connection closed");
        setClient(null);
        setIsConnecting(false);
      },
      onWebSocketError: (error) => {
        console.error("WebSocket error:", error);
        setIsConnecting(false);
        toast.error("Failed to connect to server. Please try again.");
      },
    });

    stompClient.activate();
    return stompClient;
  }, [baseUrl, navigate, isConnecting]);

  // Handle join quiz action
  const handleJoinQuiz = useCallback(() => {
    if (!sessionCode || !studentName) {
      toast.error("Please enter both name and session code");
      return;
    }

    if (!client) {
      const newClient = initializeWebSocket();
      if (newClient) {
        // Wait for connection before sending join message
        const checkConnection = setInterval(() => {
          if (newClient.connected) {
            clearInterval(checkConnection);
            newClient.publish({
              destination: "/app/joinQuiz",
              body: JSON.stringify({
                name: studentName,
                sessionCode,
              }),
            });
            localStorage.setItem("sessionCode", sessionCode);
          }
        }, 100);
      }
    } else {
      // If already connected, send join message directly
      client.publish({
        destination: "/app/joinQuiz",
        body: JSON.stringify({
          name: studentName,
          sessionCode,
        }),
      });
      localStorage.setItem("sessionCode", sessionCode);
    }
  }, [client, sessionCode, studentName, initializeWebSocket]);

  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-white via-gray-100 to-gray-200 text-gray-800"
      data-aos="fade-zoom-in"
    >
      <h1 className="bg-gradient-to-r from-blue-400 to-teal-300 text-gray-900 text-4xl p-5 mb-10 rounded-3xl shadow-lg transition-transform duration-500 ease-in-out font-bold">
        Join Quiz
      </h1>

      <div className="flex flex-col items-center bg-white bg-opacity-70 backdrop-blur-sm rounded-xl p-6 shadow-lg space-y-4 w-full max-w-md">
        <input
          type="text"
          placeholder="Enter your name"
          value={studentName}
          onChange={(e) => setStudentName(e.target.value)}
          className="w-full bg-white text-gray-800 border-2 border-gray-300 rounded-lg px-4 py-3 transition-shadow duration-300 focus:border-blue-400 focus:ring focus:ring-blue-200 focus:outline-none placeholder-gray-500"
        />
        <input
          type="text"
          placeholder="Enter session code"
          value={sessionCode}
          onChange={(e) => setSessionCode(e.target.value)}
          className="w-full bg-white text-gray-800 border-2 border-gray-300 rounded-lg px-4 py-3 transition-shadow duration-300 focus:border-blue-400 focus:ring focus:ring-blue-200 focus:outline-none placeholder-gray-500"
        />
        <button
          onClick={handleJoinQuiz}
          disabled={isConnecting}
          className={`w-full bg-gradient-to-r from-teal-400 to-blue-400 text-white rounded-full px-6 py-3 text-lg font-semibold shadow-md transition-all duration-300 ease-in-out transform hover:scale-105 hover:shadow-lg ${
            isConnecting ? "opacity-50 cursor-not-allowed" : ""
          }`}
        >
          {isConnecting ? "Connecting..." : "Join Quiz"}
        </button>
      </div>
    </div>
  );
};

export default JoinQuiz;
