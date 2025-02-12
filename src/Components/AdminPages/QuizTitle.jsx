import React, { useState, useCallback, memo } from "react";
import { useNavigate } from "react-router-dom";
import PropTypes from "prop-types";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { FileText, Loader2, ArrowRight, PencilLine } from "lucide-react";

// Memoized Header Component
const QuizHeader = memo(() => (
  <div className="text-center space-y-2">
    <div className="inline-block p-3 bg-blue-100 rounded-2xl mb-2">
      <PencilLine className="h-6 w-6 text-blue-600" />
    </div>
    <h1 className="text-3xl font-bold tracking-tight text-gray-900">
      Create New Quiz
    </h1>
    <p className="text-gray-500 max-w-sm mx-auto">
      Start by giving your quiz a descriptive title that captures its purpose
    </p>
  </div>
));

QuizHeader.displayName = 'QuizHeader';

// Memoized Input Field Component
const TitleInput = memo(({ value, onChange }) => (
  <div className="space-y-2">
    <Label htmlFor="quizTitle" className="text-sm font-medium">
      Quiz Title
    </Label>
    <div className="relative">
      <FileText className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
      <Input
        id="quizTitle"
        type="text"
        placeholder="e.g., Mathematics Chapter 1 Quiz"
        value={value}
        onChange={onChange}
        className="pl-10 h-12 border-gray-200"
        aria-label="Quiz title"
        maxLength={100}
        required
      />
    </div>
  </div>
));

TitleInput.propTypes = {
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
};

TitleInput.displayName = 'TitleInput';

// Memoized Submit Button Component
const SubmitButton = memo(({ isLoading, isDisabled }) => (
  <Button
    type="submit"
    className={`w-full h-12 text-base font-medium transition-all duration-200 ${
      isDisabled
        ? "bg-gray-100 text-gray-400"
        : "bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg"
    }`}
    disabled={isDisabled}
    aria-label={isLoading ? "Creating quiz..." : "Continue to questions"}
  >
    {isLoading ? (
     <output className="flex items-center justify-center">
     <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden="true" />
     <span>Creating Quiz...</span>
   </output>
    ) : (
      <div className="flex items-center justify-center">
        <span>Continue to Questions</span>
        <ArrowRight className="ml-2 h-5 w-5" aria-hidden="true" />
      </div>
    )}
  </Button>
));

SubmitButton.propTypes = {
  isLoading: PropTypes.bool.isRequired,
  isDisabled: PropTypes.bool.isRequired,
};

SubmitButton.displayName = 'SubmitButton';

// Main Component
const QuizTitle = () => {
  const [quizTitle, setQuizTitle] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleInputChange = useCallback((e) => {
    setQuizTitle(e.target.value);
    setError(""); // Clear any previous errors
  }, []);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();

    const trimmedTitle = quizTitle.trim();
    if (!trimmedTitle) {
      setError("Please enter a quiz title.");
      return;
    }

    if (trimmedTitle.length < 3) {
      setError("Quiz title must be at least 3 characters long.");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      navigate("/post-ques", { 
        state: { 
          quizTitle: trimmedTitle,
          timestamp: new Date().toISOString() 
        }
      });
    } catch (error) {
      console.error("Error creating quiz:", error);
      setError("Failed to create quiz. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [quizTitle, navigate]);

  const handleBackClick = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 p-4 flex flex-col items-center justify-center">
      <div className="w-full max-w-md space-y-4">
        <QuizHeader />
        
        <form onSubmit={handleSubmit} noValidate>
          <Card className="shadow-lg border-0">
            <CardHeader />
            <CardContent className="space-y-4">
              <TitleInput 
                value={quizTitle} 
                onChange={handleInputChange} 
              />
              {error && (
                <p role="alert" className="text-sm text-red-500">
                  {error}
                </p>
              )}
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <SubmitButton 
                isLoading={isLoading} 
                isDisabled={isLoading || !quizTitle.trim()} 
              />
              <Button
                type="button"
                variant="ghost"
                className="text-gray-500 hover:text-gray-700"
                onClick={handleBackClick}
              >
                Back to Dashboard
              </Button>
            </CardFooter>
          </Card>
        </form>
      </div>
    </div>
  );
};

export default QuizTitle;