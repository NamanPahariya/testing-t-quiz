import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import JoinQuiz from "../Components/UserPages/JoinQuiz";
import QuizPage from "../Components/UserPages/QuizPage";
import PostQues from "../Components/AdminPages/PostQues";
import QuizTitle from "../Components/AdminPages/QuizTitle";
import Dashboard from "../Components/AdminPages/AdminHome";
import BroadcastQues from "../Components/AdminPages/BroadcastQues";
import PresentQues from "../Components/AdminPages/PresentQues";
import LeaderboardComponent from ".././Components/AdminPages/LeaderboardComponent ";
import QRJoin from "../Components/UserPages/QRjoin";
import LandingPage from "../Components/AdminPages/LandingPage";
import SignIn from "../Components/AdminPages/SignIn";

const ProtectedRoute = ({ children }) => {
  const username = sessionStorage.getItem("username");
  const sessionCode = sessionStorage.getItem("sessionCode");

  if (!username || !sessionCode) {
    // Redirect to join page if credentials are not found
    return <Navigate to="/join" replace />;
  }

  return children;
};

const AdminProtectedRoute = ({ children }) => {

  const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';


  if (!isAuthenticated) {
    return <Navigate to="/signin" replace />;
  }

  return children;
};

const Routing = () => {
  return (
    <Routes>
      {/* Admin pages */}
      <Route path="/signin" element={<SignIn />}></Route>

      <Route path="/" element={<AdminProtectedRoute><LandingPage/></AdminProtectedRoute>}></Route>
      <Route path="/home" element={<AdminProtectedRoute><Dashboard/></AdminProtectedRoute>}></Route>
      <Route path="/quesTitle" element={<AdminProtectedRoute><QuizTitle /></AdminProtectedRoute>}></Route>
      <Route path="/present-quiz" element={<AdminProtectedRoute><PresentQues /></AdminProtectedRoute>}></Route>
      <Route path="/questions" element={<BroadcastQues />}></Route>
      <Route path="/post-ques" element={<PostQues />}></Route>
      <Route path="/leaderboard" element={<LeaderboardComponent />}></Route>
      {/* Users page */}
      <Route path="/join" element={<JoinQuiz />}></Route>
      <Route
        path="/quiz"
        element={
          <ProtectedRoute>
            <QuizPage />
          </ProtectedRoute>
        }
      />
      <Route path="/join/:sessionCode" element={<QRJoin />}></Route>

      {/* Redirect to join page for unknown routes */}
      <Route path="*" element={<Navigate to="/join" replace />} />
    </Routes>
  );
};

export default Routing;
