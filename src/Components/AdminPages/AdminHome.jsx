import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const Dashboard = () => {
  const baseUrl = import.meta.env.VITE_BASE_URL;

  const navigate = useNavigate();
  const [sessionCodes, setSessionCodes] = useState([]);
  const getAllQuestions = async () => {
    try {
      const res = await axios.get(`${baseUrl}/api/quiz/getquestions`);
      const data = res.data;

      // Extract each session code and associated title
      const codesWithTitles = Object.entries(data).map(([code, details]) => {
        const title = Object.keys(details)[0]; // Assuming there's only one title per code
        return { code, title };
      });

      setSessionCodes(codesWithTitles);
    } catch (error) {
      console.error("Error fetching questions:", error);
    }
  };

  useEffect(() => {
    getAllQuestions();
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-white via-gray-100 to-gray-200 text-gray-800">
      <h3 className="bg-gradient-to-r from-blue-300 to-teal-300 text-gray-900 text-4xl p-6 mb-10 rounded-3xl shadow-lg font-bold">
        TELUSKO QUIZ
      </h3>
      <button
        className="bg-gradient-to-br from-teal-400 to-green-400 text-gray-900 rounded-full px-10 py-4 text-xl font-semibold shadow-md transition-all duration-300 ease-in-out transform hover:scale-105 hover:shadow-lg"
        onClick={() => navigate("/quesTitle")}
      >
        Create Quiz
      </button>
      <p className="text-lg font-bold mt-3">OR</p>

      <h3 className="text-2xl font-semibold mb-4">Available Quizzes</h3>

      <div className="flex flex-wrap gap-4 justify-center">
        {sessionCodes.map(({ code, title }) => (
          <div
            key={code}
            className="bg-white p-4 rounded-lg shadow-lg w-40 text-center text-xl font-medium text-gray-700 cursor-pointer "
          >
            <p onClick={() => navigate("/present-quiz", { state: { code } })}>
              {title}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
