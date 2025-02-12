import React, { useEffect, useState, useCallback, memo } from "react";
import { useNavigate } from "react-router-dom";
import PropTypes from 'prop-types';
import axios from "axios";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Button } from "../ui/button";
import { ScrollArea } from "../ui/scroll-area";
import { Separator } from "../ui/separator";
import { Loader2, PlusCircle, ArrowRight, BookOpen } from "lucide-react";

// Memoized QuizCard component with PropTypes validation
const QuizCard = memo(({ code, title, onClick }) => (
  <Card
    className="cursor-pointer hover:shadow-md transition-all duration-200 hover:bg-gray-50 group"
    onClick={onClick}
  >
    <CardContent className="flex justify-between items-center p-4">
      <div className="flex items-center space-x-4">
        <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
          <BookOpen className="h-5 w-5 text-blue-600" />
        </div>
        <div>
          <p className="font-medium text-gray-800">{title}</p>
          <p className="text-sm text-gray-500">Code: {code}</p>
        </div>
      </div>
      <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-blue-500 transition-colors" />
    </CardContent>
  </Card>
));

QuizCard.propTypes = {
  code: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  onClick: PropTypes.func.isRequired,
};

QuizCard.displayName = 'QuizCard';

// Memoized EmptyState component
const EmptyState = memo(() => (
  <div className="text-center py-10">
    <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-3" />
    <p className="text-gray-600 font-medium">No quizzes available</p>
    <p className="text-gray-500 text-sm mt-1">Create your first quiz to get started</p>
  </div>
));

EmptyState.displayName = 'EmptyState';

// Loading component
const LoadingState = () => (
  <div className="flex justify-center items-center h-40">
    <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
  </div>
);

// Error component
const ErrorState = ({ message }) => (
  <div className="text-center py-4 text-red-600">{message}</div>
);

ErrorState.propTypes = {
  message: PropTypes.string.isRequired,
};

const Dashboard = () => {
  const baseUrl = import.meta.env.VITE_BASE_URL;
  const navigate = useNavigate();
  
  const [sessionCodes, setSessionCodes] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const getAllQuestions = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await axios.get(`${baseUrl}/api/quiz/getquestions`, {
        headers: {
          'Cache-Control': 'max-age=300'
        }
      });

      const codesWithTitles = Object.entries(response.data).map(([code, details]) => ({
        code,
        title: Object.keys(details)[0]
      }));

      setSessionCodes(codesWithTitles);
    } catch (error) {
      console.error("Error fetching quizzes:", error);
      setError("Failed to load quizzes. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  }, [baseUrl]);

  const handleQuizClick = useCallback((code) => {
    navigate("/present-quiz", { state: { code } });
  }, [navigate]);

  const handleCreateQuiz = useCallback(() => {
    navigate("/quesTitle");
  }, [navigate]);

  useEffect(() => {
    getAllQuestions();
    return () => {
      setSessionCodes([]);
      setError(null);
    };
  }, [getAllQuestions]);

  // Extract quiz content rendering logic
  const renderQuizContent = () => {
    if (isLoading) {
      return <LoadingState />;
    }

    if (error) {
      return <ErrorState message={error} />;
    }

    if (sessionCodes.length === 0) {
      return <EmptyState />;
    }

    return (
      <ScrollArea className="h-[calc(100vh-450px)]">
        <div className="space-y-3 pr-4">
          {sessionCodes.map(({ code, title }) => (
            <QuizCard
              key={code}
              code={code}
              title={title}
              onClick={() => handleQuizClick(code)}
            />
          ))}
        </div>
      </ScrollArea>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 p-4 sm:p-6">
      <div className="max-w-5xl mx-auto space-y-4">
        <header className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Quiz Dashboard</h1>
          <p className="text-gray-500 text-sm">Create interactive quizzes</p>
        </header>

        <Card className="shadow-md bg-white">
          <CardHeader>
            <CardTitle className="text-xl">Create New Quiz</CardTitle>
            <CardDescription>
              Start creating a new interactive quiz for your students
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handleCreateQuiz}
              className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm w-full sm:w-auto"
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              Create Quiz
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="text-xl">Available Quizzes</CardTitle>
            <CardDescription>Select from your existing quizzes</CardDescription>
          </CardHeader>
          <Separator />
          <CardContent className="pt-6">
            {renderQuizContent()}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default memo(Dashboard);