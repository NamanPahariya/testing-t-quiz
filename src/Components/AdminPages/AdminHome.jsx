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
    <CardContent className="flex justify-between items-center p-4 md:p-6 lg:p-8">
      <div className="flex items-center space-x-4">
        <div className="p-2 md:p-3 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
          <BookOpen className="h-5 w-5 md:h-6 md:w-6 2k-screen:h-8 2k-screen:w-8 text-blue-600" />
        </div>
        <div>
          <p className="font-medium text-gray-800 text-sm md:text-base 2k-screen:text-xl 4k-screen:text-2xl">{title}</p>
          <p className="text-xs md:text-sm 2k-screen:text-base text-gray-500">Code: {code}</p>
        </div>
      </div>
      <ArrowRight className="h-5 w-5 md:h-6 md:w-6 2k-screen:h-8 2k-screen:w-8 text-gray-400 group-hover:text-blue-500 transition-colors" />
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
  <div className="text-center py-10 md:py-16 lg:py-20">
    <BookOpen className="h-12 w-12 md:h-16 md:w-16 2k-screen:h-24 2k-screen:w-24 text-gray-400 mx-auto mb-3 md:mb-6" />
    <p className="text-gray-600 font-medium text-base md:text-lg 2k-screen:text-2xl 4k-screen:text-3xl">No quizzes available</p>
    <p className="text-gray-500 text-sm md:text-base 2k-screen:text-xl mt-1 md:mt-2">Create your first quiz to get started</p>
  </div>
));

EmptyState.displayName = 'EmptyState';

// Loading component
const LoadingState = () => (
  <div className="flex justify-center items-center h-40 md:h-60 lg:h-80">
    <Loader2 className="h-8 w-8 md:h-10 md:w-10 2k-screen:h-16 2k-screen:w-16 animate-spin text-blue-500" />
  </div>
);

// Error component
const ErrorState = ({ message }) => (
  <div className="text-center py-4 md:py-8 text-red-600 text-sm md:text-base 2k-screen:text-xl">{message}</div>
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
  const [viewportSize, setViewportSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight
  });

  // Track viewport size changes
  useEffect(() => {
    const handleResize = () => {
      setViewportSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Calculate dynamic height for scroll area based on viewport
  const getScrollAreaHeight = () => {
    // Base height calculation
    let height = 'calc(100vh - 450px)';
    
    // Adjust for different screen sizes
    if (viewportSize.width >= 3840) { // 4K
      height = 'calc(100vh - 650px)';
    } else if (viewportSize.width >= 2560) { // 2K/1440p
      height = 'calc(100vh - 550px)';
    } else if (viewportSize.width >= 1920) { // Full HD
      height = 'calc(100vh - 500px)';
    }
    
    return height;
  };

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
      <ScrollArea className="pr-4" style={{ height: getScrollAreaHeight() }}>
        <div className="space-y-3 md:space-y-4 lg:space-y-5 2k-screen:space-y-6 pr-4">
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

  // Determine content width based on screen size
  const getContentMaxWidth = () => {
    if (viewportSize.width >= 3840) return 'max-w-8xl'; // Super wide for 4K
    if (viewportSize.width >= 2560) return 'max-w-7xl'; // Wide for 2K/1440p
    return 'max-w-5xl'; // Default
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 p-4 sm:p-6 lg:p-8 2k-screen:p-10 4k-screen:p-12">
      <div className={`${getContentMaxWidth()} mx-auto space-y-4 md:space-y-6 lg:space-y-8 2k-screen:space-y-10`}>
        <header className="space-y-1 md:space-y-2">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl 2k-screen:text-5xl 4k-screen:text-6xl font-bold tracking-tight">Quiz Dashboard</h1>
          <p className="text-gray-500 text-sm md:text-base 2k-screen:text-xl">Create interactive quizzes</p>
        </header>

        <Card className="shadow-md bg-white">
          <CardHeader className="md:p-8 2k-screen:p-10 4k-screen:p-12">
            <CardTitle className="text-xl md:text-2xl 2k-screen:text-3xl 4k-screen:text-4xl">Create New Quiz</CardTitle>
            <CardDescription className="text-sm md:text-base 2k-screen:text-xl">
              Start creating a new interactive quiz for your students
            </CardDescription>
          </CardHeader>
          <CardContent className="md:p-8 2k-screen:p-10 4k-screen:p-12 pt-0">
            <Button
              onClick={handleCreateQuiz}
              className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm w-full sm:w-auto text-sm md:text-base 2k-screen:text-xl py-2 md:py-3 2k-screen:py-4"
            >
              <PlusCircle className="h-4 w-4 md:h-5 md:w-5 2k-screen:h-6 2k-screen:w-6 mr-2" />
              Create Quiz
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardHeader className="md:p-8 2k-screen:p-10 4k-screen:p-12">
            <CardTitle className="text-xl md:text-2xl 2k-screen:text-3xl 4k-screen:text-4xl">Available Quizzes</CardTitle>
            <CardDescription className="text-sm md:text-base 2k-screen:text-xl">Select from your existing quizzes</CardDescription>
          </CardHeader>
          <Separator />
          <CardContent className="pt-6 md:pt-8 2k-screen:pt-10 md:p-8 2k-screen:p-10 4k-screen:p-12">
            {renderQuizContent()}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default memo(Dashboard);