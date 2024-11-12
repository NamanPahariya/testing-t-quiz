import React, { useEffect, useRef, useState } from "react";
import Aos from "aos";
import "aos/dist/aos.css";
import SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs";
import { useLocation, useNavigate } from "react-router-dom";

const PresentQues = () => {
  const baseUrl = import.meta.env.VITE_BASE_URL;

  const [questions, setQuestions] = useState([]);
  const [tooltipMessage, setTooltipMessage] = useState("Copy to clipboard");
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const navigate = useNavigate();
  const stompClientRef = useRef(null);
  const location = useLocation();

  const { code } = location.state || {};

  useEffect(() => {
    Aos.init({ duration: 2000 });
  }, []);

  const presentQuestions = () => {
    if (!stompClientRef.current) {
      const socket = new SockJS(`${baseUrl}/quiz-websocket`);
      const client = new Client({
        webSocketFactory: () => socket,
        onConnect: () => {
          console.log("WebSocket connected");

          // Subscribe to receive session code
          client.subscribe(
            `/topic/quizQuestions/${code}`,
            (questionMessage) => {
              const broadcastedQuestions = JSON.parse(questionMessage.body);
              setQuestions(broadcastedQuestions);
              console.log(
                "Received questions for session:",
                broadcastedQuestions
              );
            }
          );

          // Request to start quiz, triggering the session code generation
          client.publish({
            destination: `/app/broadcastQuestions/${code}`,
            body: JSON.stringify({}),
          });
          console.log("Broadcasting questions for session:", code);
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
      console.log("Navigating to PresentQues with questions:", questions);
      navigate("/questions", { state: { questions } });
      localStorage.setItem("code", code);
    }
  }, [questions, navigate]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(code).then(() => {
      setTooltipMessage("Copied!");
      setTooltipVisible(true);
      setTimeout(() => {
        setTooltipMessage("Copy to clipboard");
        setTooltipVisible(false);
      }, 2000);
    });
  };

  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-white via-gray-100 to-gray-200 text-gray-800"
      data-aos="fade-zoom-in"
    >
      <h2 className="bg-gradient-to-r from-blue-400 to-teal-400 text-gray-900 text-3xl p-5 rounded-2xl shadow-md mb-8 font-bold">
        Join at Telusko Quiz | Use code
        <div className="relative inline-block ml-3">
          <div
            className={`absolute z-10 ${
              tooltipVisible ? "visible opacity-100" : "invisible opacity-0"
            } inline-block px-3 py-2 text-sm font-medium text-black bg-gray-100 transition-opacity duration-300 rounded-lg shadow-sm tooltip`}
            style={{
              bottom: "100%",
              left: "50%",
              transform: "translateX(-50%)",
            }}
          >
            <span>{tooltipMessage}</span>
          </div>

          <span
            className="flex items-center bg-gray-100 text-gray-700 border border-gray-300 rounded-lg p-2 cursor-pointer"
            onClick={copyToClipboard}
            onMouseOver={() => setTooltipVisible(true)}
            onMouseLeave={() => setTooltipVisible(false)}
          >
            {code}
          </span>
        </div>
      </h2>

      <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md text-center">
        <p className="text-gray-700 text-lg mb-4">
          Use the above Quiz code to join the quiz.
        </p>
        <button
          className="w-full bg-gradient-to-r from-green-400 to-teal-500 text-white rounded-lg px-8 py-3 font-semibold shadow-md transition-all duration-300 ease-in-out transform hover:scale-105 hover:shadow-lg"
          onClick={presentQuestions}
        >
          Present Questions
        </button>
      </div>
    </div>
  );
};

export default PresentQues;
