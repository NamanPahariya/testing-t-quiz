import React, { useEffect, useState, useRef } from "react";
import SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs";
import { CountdownCircleTimer } from "react-countdown-circle-timer";

const QuizPage = () => {
  const baseUrl = import.meta.env.VITE_BASE_URL;

  const [questions, setQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [selectedOption, setSelectedOption] = useState("");
  const [quizEnded, setQuizEnded] = useState(false);
  const [quizEndMessage, setQuizEndMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [waitingForNextQuestion, setWaitingForNextQuestion] = useState(false);
  const [timeUp, setTimeUp] = useState(false);
  const [isCorrectSelection, setIsCorrectSelection] = useState(null); // Track correctness
  const [isSubmitted, setIsSubmitted] = useState(false); // Track if the answer is submitted
  const stompClientRef = useRef(null);
  const sessionCode = localStorage.getItem("sessionCode");
  console.log(localStorage.getItem("sessionCode"));
  useEffect(() => {
    const socket = new SockJS(`${baseUrl}/quiz-websocket`);
    const client = new Client({
      webSocketFactory: () => socket,
      onConnect: () => {
        client.subscribe(`/topic/quizQuestions/${sessionCode}`, (message) => {
          const broadcastedQuestions = JSON.parse(message.body);
          if (broadcastedQuestions.isQuizEnd) {
            setQuizEnded(true);
            setQuizEndMessage(broadcastedQuestions.message);
          }
          if (!quizEnded) {
            setQuestions(broadcastedQuestions);
            setCurrentQuestion(broadcastedQuestions[0]);
            setWaitingForNextQuestion(false);
            setTimeUp(false);
          }
        });

        client.subscribe(`/topic/currentQuestion/${sessionCode}`, (message) => {
          const newQuestion = JSON.parse(message.body);
          if (!quizEnded && newQuestion) {
            setSelectedOption("");
            setCurrentQuestion(newQuestion);
            setWaitingForNextQuestion(false);
            setTimeUp(false);
            setIsCorrectSelection(null);
            setIsSubmitted(false); // Reset submission status on new question
          }
        });
      },
    });

    stompClientRef.current = client;
    stompClientRef.current.activate();

    return () => {
      if (stompClientRef.current) stompClientRef.current.deactivate();
    };
  }, [quizEnded]);

  const getOptionsArray = (question) => {
    if (!question) return [];
    return [
      { label: question.option1, value: "option1" },
      { label: question.option2, value: "option2" },
      { label: question.option3, value: "option3" },
      { label: question.option4, value: "option4" },
    ];
  };

  const handleOptionChange = (optionValue) => {
    setSelectedOption(optionValue);
    setIsCorrectSelection(null); // Reset correctness when option changes
    setIsSubmitted(false); // Reset submission status when option changes
  };

  const handleSubmit = async () => {
    if (!selectedOption || !currentQuestion || timeUp) return;

    setIsSubmitting(true);
    setIsSubmitted(true); // Mark the answer as submitted
    try {
      const requestBody = [
        {
          question: { id: currentQuestion.id },
          selectedOption: selectedOption,
          isCorrect: selectedOption === currentQuestion.correctAnswer,
          timestamp: new Date().toISOString(),
        },
      ];
      const response = await fetch(`${baseUrl}/api/quiz/save`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      setWaitingForNextQuestion(true);
    } catch (error) {
      console.error("Error submitting answer:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // When time is up, check if selected option is correct or not, only if submitted
  useEffect(() => {
    if (timeUp && isSubmitted && selectedOption) {
      setIsCorrectSelection(selectedOption === currentQuestion.correctAnswer);
    }
  }, [timeUp, isSubmitted, selectedOption, currentQuestion]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-gray-100 to-white p-8 relative">
      {/* Show Timer only if there are questions */}
      {questions.length > 0 && (
        <div className="absolute top-5 right-5">
          <CountdownCircleTimer
            key={currentQuestion?.id} // Resets the timer on each new question
            isPlaying
            duration={15}
            colors={["#4CAF50", "#D2691E", "#FF0000"]} // Green, Brown, Red
            onUpdate={(remainingTime) => {
              if (remainingTime <= 5) {
                document.querySelector(".timer-circle").style.color = "#FF0000"; // Red when <= 5 seconds
              } else if (remainingTime <= 10) {
                document.querySelector(".timer-circle").style.color = "#D2691E"; // Brown when <= 10 seconds
              } else {
                document.querySelector(".timer-circle").style.color = "#4CAF50"; // Green when > 10 seconds
              }
            }}
            onComplete={() => {
              setTimeUp(true);
              setWaitingForNextQuestion(true);
              return { shouldRepeat: false };
            }}
          >
            {({ remainingTime }) => (
              <span className="timer-circle text-xl font-bold">
                {remainingTime}s
              </span>
            )}
          </CountdownCircleTimer>
        </div>
      )}

      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-xl border border-gray-300">
        {quizEnded ? (
          <p className="text-red-600 text-center text-xl font-bold">
            {quizEndMessage ||
              "The quiz has ended. Thank you for participating!"}
          </p>
        ) : questions.length > 0 ? (
          <div>
            <h2 className="text-3xl font-semibold text-blue-600 mb-6 shadow-md rounded-lg p-4 bg-gray-50">
              Quiz Questions:
            </h2>
            <div className="text-lg text-gray-800 mt-4">
              <strong>{currentQuestion?.questionText}</strong>
              <ul className="mt-4 space-y-3">
                {getOptionsArray(currentQuestion).map((option, i) => (
                  <li key={i} className="mt-2">
                    <label
                      className={`flex items-center bg-gray-50 p-3 rounded-md shadow-sm border ${
                        selectedOption === option.value && timeUp && isSubmitted
                          ? isCorrectSelection
                            ? "border-green-500 bg-green-100" // Correct option green
                            : "border-red-500 bg-red-100" // Incorrect option red
                          : "border-gray-200 hover:bg-blue-50"
                      } transition duration-200`}
                    >
                      <input
                        type="radio"
                        value={option.value}
                        checked={selectedOption === option.value}
                        onChange={() => handleOptionChange(option.value)}
                        className="mr-3 accent-blue-500"
                        disabled={waitingForNextQuestion || timeUp}
                      />
                      {option.label}
                    </label>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-6">
              <button
                onClick={handleSubmit}
                disabled={!selectedOption || isSubmitting || timeUp}
                className="bg-gradient-to-r from-green-400 to-teal-500 text-white font-bold py-3 px-6 rounded-lg shadow-md hover:scale-105 transition-transform duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "Submitting..." : "Submit"}
              </button>
            </div>

            {waitingForNextQuestion && (
              <p className="mt-4 text-center text-yellow-600 font-semibold">
                {timeUp
                  ? "Time's up! Waiting for the next question..."
                  : "Host hasn't changed the slide yet..."}
              </p>
            )}
          </div>
        ) : (
          <p className="text-gray-700 text-center">
            No questions broadcasted yet.
          </p>
        )}
      </div>
    </div>
  );
};

export default QuizPage;
