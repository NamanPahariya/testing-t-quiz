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

// Custom hook to detect 4K resolution
const use4KDisplay = () => {
  const [is4K, setIs4K] = useState(false);
  
  useEffect(() => {
    const checkResolution = () => {
      setIs4K(window.innerWidth >= 3800 && window.innerHeight >= 2000);
    };
    
    checkResolution();
    window.addEventListener('resize', checkResolution);
    
    return () => window.removeEventListener('resize', checkResolution);
  }, []);
  
  return is4K;
};

// Memoized QuizCard component with PropTypes validation
const QuizCard = memo(({ code, title, onClick }) => {
  const is4K = use4KDisplay();
  
  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-all duration-200 hover:bg-gray-50 group"
      onClick={onClick}
    >
      <CardContent className={`flex justify-between items-center ${is4K ? 'p-8' : 'p-4'}`}>
        <div className={`flex items-center ${is4K ? 'space-x-6' : 'space-x-4'}`}>
          <div className={`${is4K ? 'p-4' : 'p-2'} bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors`}>
            <BookOpen className={`${is4K ? 'h-10 w-10' : 'h-5 w-5'} text-blue-600`} />
          </div>
          <div>
            <p className={`font-medium text-gray-800 ${is4K ? 'text-3xl' : ''}`}>{title}</p>
            <p className={`${is4K ? 'text-xl mt-2' : 'text-sm'} text-gray-500`}>Code: {code}</p>
          </div>
        </div>
        <ArrowRight className={`${is4K ? 'h-10 w-10' : 'h-5 w-5'} text-gray-400 group-hover:text-blue-500 transition-colors`} />
      </CardContent>
    </Card>
  );
});

QuizCard.propTypes = {
  code: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  onClick: PropTypes.func.isRequired,
};

QuizCard.displayName = 'QuizCard';

// Memoized EmptyState component
const EmptyState = memo(() => {
  const is4K = use4KDisplay();
  
  return (
    <div className={`text-center ${is4K ? 'py-20' : 'py-10'}`}>
      <BookOpen className={`${is4K ? 'h-24 w-24 mb-6' : 'h-12 w-12 mb-3'} text-gray-400 mx-auto`} />
      <p className={`text-gray-600 font-medium ${is4K ? 'text-3xl' : ''}`}>No quizzes available</p>
      <p className={`text-gray-500 ${is4K ? 'text-2xl mt-4' : 'text-sm mt-1'}`}>Create your first quiz to get started</p>
    </div>
  );
});

EmptyState.displayName = 'EmptyState';

// Loading component
const LoadingState = () => {
  const is4K = use4KDisplay();
  
  return (
    <div className={`flex justify-center items-center ${is4K ? 'h-80' : 'h-40'}`}>
      <Loader2 className={`${is4K ? 'h-20 w-20' : 'h-8 w-8'} animate-spin text-blue-500`} />
    </div>
  );
};

// Error component
const ErrorState = ({ message }) => {
  const is4K = use4KDisplay();
  
  return (
    <div className={`text-center ${is4K ? 'py-12 text-2xl' : 'py-4'} text-red-600`}>{message}</div>
  );
};

ErrorState.propTypes = {
  message: PropTypes.string.isRequired,
};

const Dashboard = () => {
  const is4K = use4KDisplay();
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
      <ScrollArea className={`${is4K ? 'h-[calc(100vh-600px)]' : 'h-[calc(100vh-450px)]'}`}>
        <div className={`${is4K ? 'space-y-6 pr-8' : 'space-y-3 pr-4'}`}>
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
    <div className={`min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 ${is4K ? 'p-12' : 'p-4 sm:p-6'}`}>
      <div className={`${is4K ? 'max-w-7xl space-y-12' : 'max-w-5xl space-y-4'} mx-auto`}>
        <header className="space-y-1">
          <h1 className={`${is4K ? 'text-6xl' : 'text-2xl sm:text-3xl'} font-bold tracking-tight`}>Quiz Dashboard</h1>
          <p className={`text-gray-500 ${is4K ? 'text-2xl' : 'text-sm'}`}>Create interactive quizzes</p>
        </header>

        <Card className="shadow-md bg-white">
          <CardHeader className={is4K ? 'p-12' : ''}>
            <CardTitle className={`${is4K ? 'text-4xl' : 'text-xl'}`}>Create New Quiz</CardTitle>
            <CardDescription className={is4K ? 'text-xl mt-4' : ''}>
              Start creating a new interactive quiz for your students
            </CardDescription>
          </CardHeader>
          <CardContent className={is4K ? 'p-12 pt-0' : ''}>
            <Button
              onClick={handleCreateQuiz}
              className={`bg-blue-600 hover:bg-blue-700 text-white shadow-sm ${is4K ? 'text-2xl p-8 h-auto' : 'w-full sm:w-auto'}`}
            >
              <PlusCircle className={`${is4K ? 'h-8 w-8 mr-4' : 'h-4 w-4 mr-2'}`} />
              Create Quiz
            </Button>
          </CardContent>
        </Card>

        <Card className={is4K ? 'shadow-xl' : 'shadow-md'}>
          <CardHeader className={is4K ? 'p-12' : ''}>
            <CardTitle className={`${is4K ? 'text-4xl' : 'text-xl'}`}>Available Quizzes</CardTitle>
            <CardDescription className={is4K ? 'text-xl mt-4' : ''}>Select from your existing quizzes</CardDescription>
          </CardHeader>
          <Separator className={is4K ? 'h-[2px]' : ''} />
          <CardContent className={`${is4K ? 'p-12' : 'pt-6'}`}>
            {renderQuizContent()}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default memo(Dashboard);