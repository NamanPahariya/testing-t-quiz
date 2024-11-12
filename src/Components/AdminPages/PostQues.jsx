import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { useLocation, useNavigate } from "react-router-dom";
import SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs";

const PostQues = () => {
  const baseUrl = import.meta.env.VITE_BASE_URL;
  // console.log(import.meta.env.VITE_BASE_URL, "URL");
  const navigate = useNavigate();
  const location = useLocation();
  const { quizTitle } = location.state || {};
  const [sessionCode, setSessionCode] = useState(""); // Store session code
  const [questions, setQuestions] = useState([
    // Initialize with an empty question
    {
      questionText: "",
      option1: "",
      option2: "",
      option3: "",
      option4: "",
      correctAnswer: "",
      sessionCode: sessionCode, // Add session_code to each question
      title: quizTitle,
    },
  ]);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const stompClientRef = useRef(null);

  // WebSocket logic for getting the session code
  useEffect(() => {
    const socket = new SockJS(`${baseUrl}/quiz-websocket`);
    const client = new Client({
      webSocketFactory: () => socket,
      onConnect: () => {
        console.log("WebSocket connected");

        // Subscribe to receive session code
        client.subscribe("/topic/quizSessionCode", (message) => {
          const code = message.body;
          setSessionCode(code); // Update sessionCode state when received
          console.log("Received session code:", code);

          // Update session_code in all questions once we have the session code
          setQuestions((prevQuestions) =>
            prevQuestions.map((q) => ({
              ...q,
              sessionCode: code, // Update the session_code for each question
            }))
          );
        });

        // Request to start quiz, triggering the session code generation
        client.publish({
          destination: "/app/startQuiz",
          body: JSON.stringify({}),
        });
      },
      onWebSocketClose: () => {
        console.log("WebSocket connection closed");
      },
      onWebSocketError: (error) => {
        console.error("WebSocket error:", error);
      },
    });

    stompClientRef.current = client;
    stompClientRef.current.activate();

    return () => {
      // Clean up
      if (stompClientRef.current) stompClientRef.current.deactivate();
    };
  }, []);

  const handleChange = (index, field, value) => {
    const updatedQuestions = [...questions];
    updatedQuestions[index][field] = value;
    setQuestions(updatedQuestions);
  };

  const handleAddQuestion = () => {
    setQuestions([
      ...questions,
      {
        questionText: "",
        option1: "",
        option2: "",
        option3: "",
        option4: "",
        correctAnswer: "",
        sessionCode: sessionCode, // Ensure new questions also get the session code
        title: quizTitle,
      },
    ]);
  };

  const handleCheckboxChange = (index, option) => {
    const updatedQuestions = [...questions];
    updatedQuestions[index].correctAnswer = option; // Set the correct answer
    setQuestions(updatedQuestions);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const allAnswered = questions.every((q) => q.correctAnswer);
    if (!allAnswered) {
      setShowWarningModal(true);
      return;
    }
    setShowConfirmModal(true);
  };

  const handleConfirmSubmit = async () => {
    setShowConfirmModal(false);
    try {
      // Ensure the sessionCode is included when submitting
      const res = await axios.post(`${baseUrl}/api/quiz/create`, questions);
      console.log(res, "res");
      // localStorage.setItem("sessionCode:", sessionCode);
      // localStorage.setItem("quizTitle", quizTitle);
      navigate("/"); // Navigate back after successful submission
    } catch (error) {
      console.log(error.response?.data || error.message);
    }
  };

  return (
    <div>
      <h2 className="bg-gradient-to-r from-blue-400 to-teal-400 text-gray-900 text-xl p-5 mt-4 text-center rounded-2xl shadow-md mb-8 font-bold max-w-md mx-auto">
        Quiz code for <strong>"{quizTitle}"</strong> is:
        <div className="relative inline-block ml-3">
          <span className="flex items-center bg-gray-100 text-gray-700 border border-gray-300 rounded-lg p-2 cursor-pointer">
            {sessionCode}
          </span>
        </div>
      </h2>
      <div className="p-6 max-w-3xl mx-auto bg-white shadow-lg rounded-lg">
        <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">
          Create Quiz Questions
        </h2>
        <form onSubmit={handleSubmit}>
          {questions.map((q, index) => (
            <div
              key={index}
              className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg shadow-sm"
            >
              <label className="block text-lg font-medium text-gray-700 mb-2">
                Question {index + 1}
              </label>
              <input
                type="text"
                value={q.questionText}
                onChange={(e) =>
                  handleChange(index, "questionText", e.target.value)
                }
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring focus:ring-blue-200 focus:border-blue-400 mb-4"
                placeholder="Enter question text"
                required
              />
              {["option1", "option2", "option3", "option4"].map((option, i) => (
                <div
                  key={option}
                  className={`flex items-center mb-2 p-2 rounded-lg ${
                    q.correctAnswer === option
                      ? "border border-green-500 bg-green-50"
                      : ""
                  }`}
                >
                  <input
                    type="radio"
                    checked={q.correctAnswer === option}
                    onChange={() => handleCheckboxChange(index, option)}
                    className="mr-3 h-5 w-5 text-green-500 focus:ring focus:ring-green-200"
                    required
                  />
                  <input
                    type="text"
                    value={q[option]}
                    onChange={(e) =>
                      handleChange(index, option, e.target.value)
                    }
                    className={`w-full p-3 border ${
                      q.correctAnswer === option
                        ? "border-green-500 bg-green-50"
                        : "border-gray-300"
                    } rounded-lg focus:ring focus:ring-green-200 focus:border-green-500`}
                    placeholder={`Option ${i + 1}`}
                    required
                  />
                  {q.correctAnswer === option && (
                    <span className="ml-2 text-green-500 font-semibold">✓</span>
                  )}
                </div>
              ))}
            </div>
          ))}
          <div className="flex justify-end space-x-4 mt-4">
            <button
              type="button"
              onClick={handleAddQuestion}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition"
            >
              Add Question
            </button>
            <button
              type="submit"
              className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition"
            >
              Submit Quiz
            </button>
          </div>
        </form>

        {/* Warning Modal */}
        {showWarningModal && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white p-6 rounded-lg shadow-lg max-w-sm">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Incomplete Questions
              </h3>
              <p className="text-gray-600 mb-4">
                Please select a correct answer for each question before
                submitting.
              </p>
              <button
                onClick={() => setShowWarningModal(false)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg"
              >
                OK
              </button>
            </div>
          </div>
        )}

        {/* Confirmation Modal */}
        {showConfirmModal && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white p-6 rounded-lg shadow-lg max-w-sm">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Confirm Submission
              </h3>
              <p className="text-gray-600 mb-4">
                Are you sure you want to submit the questions?
              </p>
              <div className="flex justify-end space-x-4">
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-2 px-4 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmSubmit}
                  className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PostQues;
