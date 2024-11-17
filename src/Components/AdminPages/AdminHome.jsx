import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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

const Dashboard = () => {
  const baseUrl = import.meta.env.VITE_BASE_URL;
  const navigate = useNavigate();

  const [sessionCodes, setSessionCodes] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const getAllQuestions = async () => {
    setIsLoading(true);
    try {
      const res = await axios.get(`${baseUrl}/api/quiz/getquestions`);
      const data = res.data;

      const codesWithTitles = Object.entries(data).map(([code, details]) => {
        const title = Object.keys(details)[0];
        return { code, title };
      });

      setSessionCodes(codesWithTitles);
    } catch (error) {
      console.error("Error fetching quizzes:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    getAllQuestions();
  }, []);

  return (
    <div className="h-screen bg-gradient-to-b from-gray-50 to-gray-100 p-6">
      <div className="max-w-5xl mx-auto space-y-4">
        {/* Header Section */}
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Quiz Dashboard</h1>
          <p className="text-gray-500 text-sm">Create interactive quizzes</p>
        </div>

        {/* Create Quiz Card */}
        <Card className="shadow-md bg-white">
          <CardHeader>
            <CardTitle className="text-xl">Create New Quiz</CardTitle>
            <CardDescription>
              Start creating a new interactive quiz for your students
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => navigate("/quesTitle")}
              className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm w-full sm:w-auto"
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              Create Quiz
            </Button>
          </CardContent>
        </Card>

        {/* Available Quizzes Card */}
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="text-xl">Available Quizzes</CardTitle>
            <CardDescription>Select from your existing quizzes</CardDescription>
          </CardHeader>
          <Separator />
          <CardContent className="pt-6">
            {isLoading ? (
              <div className="flex justify-center items-center h-40">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              </div>
            ) : sessionCodes.length > 0 ? (
              <ScrollArea className="h-[calc(100vh-450px)]">
                <div className="space-y-3 pr-4">
                  {sessionCodes.map(({ code, title }) => (
                    <Card
                      key={code}
                      className="cursor-pointer hover:shadow-md transition-all duration-200 hover:bg-gray-50 group"
                      onClick={() =>
                        navigate("/present-quiz", { state: { code } })
                      }
                    >
                      <CardContent className="flex justify-between items-center p-4">
                        <div className="flex items-center space-x-4">
                          <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                            <BookOpen className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-800">{title}</p>
                            <p className="text-sm text-gray-500">
                              Code: {code}
                            </p>
                          </div>
                        </div>
                        <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-blue-500 transition-colors" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="text-center py-10">
                <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 font-medium">
                  No quizzes available
                </p>
                <p className="text-gray-500 text-sm mt-1">
                  Create your first quiz to get started
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
