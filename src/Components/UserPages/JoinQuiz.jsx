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
  }, []);

  const validateUser = async () => {
    try {
      const response = await fetch(`${baseUrl}/api/quiz/validate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: studentName,
          sessionCode,
        }),
      });

      if (!response.ok) {
        const errorMessage = await response.text();
        throw new Error(errorMessage || "Validation failed!");
      }

      const responseData = await response.text(); // Parse as plain text
      console.log("Validation successful:", responseData);

      if (responseData.includes("Session code valid")) {
        toast.success("Successfully validated!");
        return true;
      } else {
        throw new Error("Unexpected response from server.");
      }
    } catch (error) {
      console.error("Validation error:", error);
      toast.error(error.message);
      return false;
    }
  };

  const establishWebSocketConnection = () =>
    new Promise((resolve) => {
      if (!client) {
        const socket = new SockJS(`${baseUrl}/quiz-websocket`);
        const stompClient = new Client({
          webSocketFactory: () => socket,
          onConnect: () => {
            console.log("WebSocket connected");
            setClient(stompClient);
            resolve(stompClient);
          },
          onWebSocketClose: () => {
            console.log("WebSocket connection closed");
          },
          onWebSocketError: (error) => {
            console.error("WebSocket error:", error);
            toast.error("WebSocket connection failed.");
          },
        });

        stompClient.activate();
      } else {
        resolve(client);
      }
    });

  const joinQuiz = async () => {
    if (!studentName || !sessionCode) {
      toast.error("Please enter your name and session code!");
      return;
    }

    const isValid = await validateUser();
    if (!isValid) {
      setSessionCode("");
      setStudentName("");
      return;
    }

    try {
      const stompClient = await establishWebSocketConnection();

      // Subscribe to the topic for joined students
      console.log("Subscribing to /topic/joinedStudents...");
      stompClient.subscribe("/topic/joinedStudents", (message) => {
        const response = message.body; // Backend sends a plain string message
        console.log("Received join message:", response);

        // toast.success(response); // Notify user of success
        navigate("/quiz");
      });

      // Publish the joinQuiz message
      console.log("Publishing joinQuiz message...");
      stompClient.publish({
        destination: "/app/joinQuiz",
        body: `${studentName}`, // Adjusted payload format
      });

      console.log(
        `Sent joinQuiz message for ${studentName} with session code: ${sessionCode}`
      );

      localStorage.setItem("sessionCode", sessionCode);
    } catch (error) {
      console.error("Error in joining quiz:", error);
      toast.error("Could not join the quiz.");
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
