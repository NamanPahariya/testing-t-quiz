import React, { useEffect, useState } from "react";
import SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs";
import Aos from "aos";
import "aos/dist/aos.css";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";

const JoinQuiz = () => {
  const baseUrl = import.meta.env.VITE_BASE_URL;

  const [client, setClient] = useState(null);
  const [sessionCode, setSessionCode] = useState("");
  const [studentName, setStudentName] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
    Aos.init({ duration: 2000 });

    const socket = new SockJS(`${baseUrl}/quiz-websocket`);
    const stompClient = new Client({
      webSocketFactory: () => socket,
      onConnect: () => {
        console.log("WebSocket connected");

        stompClient.subscribe("/topic/joinedStudents", (message) => {
          const response = message.body;
          console.log("Received join message:", response);
          if (!response.includes("Invalid session code!")) {
            navigate("/quiz", { state: { response } });
          } else {
            toast.error("Invalid session code!");
          }
        });

        stompClient.subscribe("/topic/validation", (message) => {
          const validationResponse = message.body;
          console.log("Received validation response:", validationResponse);

          if (validationResponse.includes("Invalid session code!")) {
            toast.error(validationResponse);
          } else {
            toast.success("Successfully joined the quiz!");
          }
        });
      },
      onWebSocketClose: () => {
        console.log("WebSocket connection closed");
      },
      onWebSocketError: (error) => {
        console.error("WebSocket error:", error);
      },
    });

    stompClient.activate();
    setClient(stompClient);

    return () => {
      // stompClient.deactivate(); // Cleanup on unmount
    };
  }, [navigate]);

  const joinQuiz = () => {
    if (client && sessionCode && studentName) {
      client.publish({
        destination: "/app/joinQuiz",
        body: JSON.stringify({
          name: studentName,
          sessionCode,
        }),
      });
      console.log(
        `Sent joinQuiz message for ${studentName} with session code: ${sessionCode}`
      );
      setSessionCode("");
      setStudentName("");
      localStorage.setItem("sessionCode", sessionCode);
    } else {
      toast.error("Please enter both your name and session code.");
    }
  };

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
          onClick={joinQuiz}
          className="w-full bg-gradient-to-r from-teal-400 to-blue-400 text-white rounded-full px-6 py-3 text-lg font-semibold shadow-md transition-all duration-300 ease-in-out transform hover:scale-105 hover:shadow-lg"
        >
          Join Quiz
        </button>
      </div>
    </div>
  );
};

export default JoinQuiz;
