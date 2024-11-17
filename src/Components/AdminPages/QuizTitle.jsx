import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileText, Loader2, ArrowRight, PencilLine } from "lucide-react";

const QuizTitle = () => {
  const [quizTitle, setQuizTitle] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const submitHandle = async (e) => {
    e.preventDefault();

    if (!quizTitle.trim()) {
      alert("Please enter a quiz title.");
      return;
    }

    setIsLoading(true);

    try {
      // Simulate API call or validation if needed
      setTimeout(() => {
        navigate("/post-ques", { state: { quizTitle } });
      }, 1000);
    } catch (error) {
      console.error("Error:", error);
      alert("Failed to proceed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 p-4 flex flex-col items-center justify-center">
      <div className="w-full max-w-md space-y-4">
        <div className="text-center space-y-2">
          <div className="inline-block p-3 bg-blue-100 rounded-2xl mb-2">
            <PencilLine className="h-6 w-6 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Create New Quiz
          </h1>
          <p className="text-gray-500 max-w-sm mx-auto">
            Start by giving your quiz a descriptive title that captures its
            purpose
          </p>
        </div>

        <Card className="shadow-lg border-0">
          <CardHeader>
            {/* <CardTitle className="text-xl font-semibold">
              Quiz Details
            </CardTitle>
            <CardDescription>
              Enter the title for your new quiz below
            </CardDescription> */}
          </CardHeader>
          <CardContent className="space-y-4">
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
                  value={quizTitle}
                  onChange={(e) => setQuizTitle(e.target.value)}
                  className="pl-10 h-12 border-gray-200"
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button
              type="submit"
              onClick={submitHandle}
              className={`w-full h-12 text-base font-medium transition-all duration-200 ${
                isLoading || !quizTitle.trim()
                  ? "bg-gray-100 text-gray-400"
                  : "bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg"
              }`}
              disabled={isLoading || !quizTitle.trim()}
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  <span>Creating Quiz...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  <span>Continue to Questions</span>
                  <ArrowRight className="ml-2 h-5 w-5" />
                </div>
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="text-gray-500 hover:text-gray-700"
              onClick={() => navigate(-1)}
            >
              Back to Dashboard
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default QuizTitle;
