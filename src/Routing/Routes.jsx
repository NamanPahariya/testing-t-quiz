import React from "react";
import { Route, Routes } from "react-router-dom";
import JoinQuiz from "../Components/UserPages/JoinQuiz";
import QuizPage from "../Components/UserPages/QuizPage";
import PostQues from "../Components/AdminPages/PostQues";
import QuizTitle from "../Components/AdminPages/QuizTitle";
import Dashboard from "../Components/AdminPages/AdminHome";
import BroadcastQues from "../Components/AdminPages/BroadcastQues";
import PresentQues from "../Components/AdminPages/PresentQues";
const Routing = () => {
  return (
    <Routes>
      {/* Admin pages */}
      <Route path="/" element={<Dashboard />}></Route>
      <Route path="/quesTitle" element={<QuizTitle />}></Route>
      <Route path="/present-quiz" element={<PresentQues />}></Route>
      <Route path="/questions" element={<BroadcastQues />}></Route>
      <Route path="/post-ques" element={<PostQues />}></Route>

      {/* Users page */}
      <Route path="/join" element={<JoinQuiz />}></Route>
      <Route path="/quiz" element={<QuizPage />}></Route>
    </Routes>
  );
};

export default Routing;
