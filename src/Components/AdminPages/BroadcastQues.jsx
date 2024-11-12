import { Client } from "@stomp/stompjs";
import React, { useEffect, useRef, useState, useMemo } from "react";
import { useLocation } from "react-router-dom";
import SockJS from "sockjs-client";

const BroadcastQues = () => {
  const baseUrl = import.meta.env.VITE_BASE_URL;

  const location = useLocation();

  const initialQuestions = useMemo(
    () => location.state?.questions || [],
    [location.state]
  );
  const code = localStorage.getItem("code");
  // const { code } = location.state || "";
  console.log(code, "code");
  const [questions, setQuestions] = useState(initialQuestions);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [quizEnded, setQuizEnded] = useState(false); // State to track quiz end message
  const [quizEndMessage, setQuizEndMessage] = useState(""); // State to store quiz end message

  const stompClientRef = useRef(null);

  useEffect(() => {
    if (questions.length > 0) {
      setCurrentQuestion(questions[0]);
    }

    const socket = new SockJS(`${baseUrl}/quiz-websocket`);
    const client = new Client({
      webSocketFactory: () => socket,
      onConnect: () => {
        console.log("WebSocket connected");

        // Subscribe to the topic for quiz questions
        client.subscribe(`/topic/quizQuestions/${code}`, (message) => {
          const receivedData = JSON.parse(message.body);

          // Check if the received message is about the quiz ending
          if (receivedData.isQuizEnd) {
            console.log("Quiz has ended for all users.");
            setQuizEnded(true); // Update the state to show quiz ended message
            setQuizEndMessage(receivedData.message);
            return;
          }

          const receivedQuestions = receivedData;
          console.log("Received broadcasted questions:", receivedQuestions);

          // Update questions only if the quiz has not ended
          if (!quizEnded) {
            setQuestions(receivedQuestions);
            if (receivedQuestions.length > 0) {
              setCurrentQuestion(receivedQuestions[0]);
              setCurrentQuestionIndex(0); // Reset index to 0 when new questions are received
            }
          }
        });

        // Subscribe to the topic for the current question
        client.subscribe(`/topic/currentQuestion/${code}`, (message) => {
          const receivedQuestion = JSON.parse(message.body);
          console.log("Received current question:", receivedQuestion);
          setCurrentQuestion(receivedQuestion);
        });
      },
    });

    stompClientRef.current = client;
    stompClientRef.current.activate();

    return () => {
      if (stompClientRef.current) stompClientRef.current.deactivate();
    };
  }, [questions, quizEnded]); // Added quizEnded to the dependency array

  const getOptionsArray = (question) => {
    if (!question) return [];
    return [
      question.option1,
      question.option2,
      question.option3,
      question.option4,
    ];
  };

  const presentNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      const nextIndex = currentQuestionIndex + 1;
      setCurrentQuestionIndex(nextIndex);
      setCurrentQuestion(questions[nextIndex]);

      console.log("Publishing next question index:", nextIndex);
      stompClientRef.current.publish({
        destination: `/app/nextQuestion/${code}`,
        body: JSON.stringify({ index: nextIndex }),
      });
    } else {
      stompClientRef.current.publish({
        destination: `/topic/quizQuestions/${code}`, // Ensure this matches your backend topic for quiz end
        body: JSON.stringify({
          message: "The quiz has ended.Thank You for participating!",
          isQuizEnd: true,
        }),
      });
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-white via-gray-100 to-gray-200 p-8">
      <h2 className="text-blue-600 text-3xl font-bold mb-6 shadow-md rounded-lg p-4 bg-white">
        Quiz Questions
      </h2>
      {quizEnded ? (
        <div className="text-red-500 text-xl font-bold mb-4">
          {quizEndMessage}
        </div>
      ) : (
        <>
          {currentQuestion ? (
            <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-2xl border border-gray-200">
              <h3 className="text-2xl font-semibold text-gray-800 mb-4">
                {currentQuestion.questionText}
              </h3>
              <ul className="mt-4 space-y-2">
                {getOptionsArray(currentQuestion).map((option, i) => (
                  <li
                    key={i}
                    className="text-lg bg-gray-50 p-3 rounded-md shadow-sm border border-gray-300 hover:bg-blue-50 transition duration-200"
                  >
                    {option}
                  </li>
                ))}
              </ul>
              <div className="flex justify-end mt-6 space-x-4">
                <button
                  onClick={presentNextQuestion}
                  className="bg-gradient-to-r from-green-400 to-teal-500 text-white p-3 rounded-lg font-bold shadow-md transition duration-300 hover:scale-105"
                >
                  Next
                </button>
              </div>
            </div>
          ) : (
            <p className="text-gray-700 text-lg">Loading questions...</p>
          )}
        </>
      )}
    </div>
  );
};

export default BroadcastQues;
