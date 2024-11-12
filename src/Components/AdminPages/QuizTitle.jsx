import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const QuizTitle = () => {
  // Initialize quizTitle with the value from localStorage (if available), otherwise default to an empty string
  const [quizTitle, setQuizTitle] = useState("");
  const navigate = useNavigate();

  // Handle form submission
  const submitHandle = (e) => {
    e.preventDefault();

    if (quizTitle.trim() === "") {
      alert("Please enter a quiz title.");
      return;
    }

    // Navigate to the next page, passing the quiz title as state
    navigate("/post-ques", { state: { quizTitle } });
  };

  // Optional: Update localStorage whenever the quizTitle changes (e.g., for persistence across page reloads)

  return (
    <div>
      <div
        className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-white via-gray-100 to-gray-200 text-gray-800"
        // data-aos="fade-zoom-in"
      >
        <h1 className="bg-gradient-to-r from-blue-400 to-teal-300 text-gray-900 text-4xl p-5 mb-10 rounded-3xl shadow-lg transition-transform duration-500 ease-in-out font-bold">
          Quiz Title
        </h1>

        <form
          onSubmit={submitHandle} // Use form submission instead of onClick
          className="flex flex-col items-center bg-white bg-opacity-70 backdrop-blur-sm rounded-xl p-6 shadow-lg space-y-4 w-full max-w-md"
        >
          <input
            type="text"
            placeholder="Enter title for this quiz"
            value={quizTitle}
            onChange={(e) => setQuizTitle(e.target.value)} // Update quizTitle state on input change
            className="w-full bg-white text-gray-800 border-2 border-gray-300 rounded-lg px-4 py-3 transition-shadow duration-300 focus:border-blue-400 focus:ring focus:ring-blue-200 focus:outline-none placeholder-gray-500"
            required
          />

          <button
            type="submit" // This triggers the form's submit event
            className="w-full bg-gradient-to-r from-teal-400 to-blue-400 text-white rounded-full px-6 py-3 text-lg font-semibold shadow-md transition-all duration-300 ease-in-out transform hover:scale-105 hover:shadow-lg"
          >
            Submit
          </button>
        </form>
      </div>
    </div>
  );
};

export default QuizTitle;
