import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import { Trash2, Plus, AlertCircle, Check, CheckCircle2 } from "lucide-react";
import axios from "axios";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import { Badge } from "../ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../ui/accordion";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { Label } from "../ui/label";
import { Alert, AlertDescription } from "../ui/alert";

const PostQues = () => {
  const baseUrl = import.meta.env.VITE_BASE_URL;
  const navigate = useNavigate();
  const location = useLocation();
  const { quizTitle } = location.state || {};
  const [sessionCode, setSessionCode] = useState("");
  const [questions, setQuestions] = useState([
    {
      questionText: "",
      option1: "",
      option2: "",
      option3: "",
      option4: "",
      correctAnswer: "",
      sessionCode: sessionCode,
      title: quizTitle,
    },
  ]);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const stompClientRef = useRef(null);

  useEffect(() => {
    const socket = new SockJS(`${baseUrl}/quiz-websocket`);
    const client = new Client({
      webSocketFactory: () => socket,
      onConnect: () => {
        client.subscribe("/topic/quizSessionCode", (message) => {
          const code = message.body;
          setSessionCode(code);
          setQuestions((prevQuestions) =>
            prevQuestions.map((q) => ({ ...q, sessionCode: code }))
          );
        });

        client.publish({
          destination: "/app/startQuiz",
          body: JSON.stringify({}),
        });
      },
    });

    stompClientRef.current = client;
    stompClientRef.current.activate();

    return () => {
      if (stompClientRef.current) stompClientRef.current.deactivate();
    };
  }, []);

  const handleChange = (index, field, value) => {
    const updatedQuestions = [...questions];
    updatedQuestions[index][field] = value;
    setQuestions(updatedQuestions);
  };

  const handleAddQuestion = () => {
    setQuestions([
      ...questions,
      {
        questionText: "",
        option1: "",
        option2: "",
        option3: "",
        option4: "",
        correctAnswer: "",
        sessionCode: sessionCode,
        title: quizTitle,
      },
    ]);
  };

  const handleRemoveQuestion = (index) => {
    if (questions.length > 1) {
      const updatedQuestions = questions.filter((_, i) => i !== index);
      setQuestions(updatedQuestions);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const allAnswered = questions.every((q) => q.correctAnswer);
    if (!allAnswered) {
      setShowWarningModal(true);
      return;
    }
    setShowConfirmModal(true);
  };

  const handleConfirmSubmit = async () => {
    setShowConfirmModal(false);
    try {
      await axios.post(`${baseUrl}/api/quiz/create`, questions);
      navigate("/");
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-4">
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl">Quiz Configuration</CardTitle>
                <CardDescription>
                  Create and manage quiz questions
                </CardDescription>
              </div>
              <Badge variant="secondary" className="text-lg px-4 py-2">
                Session Code: {sessionCode}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <Alert variant="info" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Creating quiz for{" "}
                <span className="font-semibold">{quizTitle}</span>
              </AlertDescription>
            </Alert>

            <form onSubmit={handleSubmit}>
              <Accordion type="single" collapsible className="space-y-4">
                {questions.map((question, index) => (
                  <AccordionItem
                    key={index}
                    value={`question-${index}`}
                    className="border rounded-lg"
                  >
                    <AccordionTrigger className="px-4">
                      <div className="flex items-center justify-between w-full">
                        <span>
                          Question {index + 1}
                          {question.questionText &&
                            ` - ${question.questionText.substring(0, 50)}...`}
                        </span>
                        {question.correctAnswer && (
                          <Badge variant="success" className="ml-2">
                            <Check className="h-3 w-3 mr-1" />
                            Answered
                          </Badge>
                        )}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pt-4">
                      <div className="space-y-6">
                        <div>
                          <Input
                            placeholder="Enter your question"
                            value={question.questionText}
                            onChange={(e) =>
                              handleChange(
                                index,
                                "questionText",
                                e.target.value
                              )
                            }
                            className="mb-4"
                          />
                          <RadioGroup
                            value={question.correctAnswer}
                            onValueChange={(value) =>
                              handleChange(index, "correctAnswer", value)
                            }
                          >
                            {["option1", "option2", "option3", "option4"].map(
                              (option, optionIndex) => (
                                <div
                                  key={option}
                                  className="flex items-center space-x-2 mb-4"
                                >
                                  <RadioGroupItem
                                    value={option}
                                    id={`${index}-${option}`}
                                  />
                                  <Label
                                    htmlFor={`${index}-${option}`}
                                    className="flex-grow relative"
                                  >
                                    <div className="relative">
                                      <Input
                                        placeholder={`Option ${
                                          optionIndex + 1
                                        }`}
                                        value={question[option]}
                                        onChange={(e) =>
                                          handleChange(
                                            index,
                                            option,
                                            e.target.value
                                          )
                                        }
                                        className={
                                          question.correctAnswer === option
                                            ? "border-green-500 bg-green-50 pr-10"
                                            : ""
                                        }
                                      />
                                      {question.correctAnswer === option && (
                                        <CheckCircle2 className="h-5 w-5 text-green-500 absolute right-3 top-1/2 transform -translate-y-1/2" />
                                      )}
                                    </div>
                                  </Label>
                                </div>
                              )
                            )}
                          </RadioGroup>
                        </div>
                        {questions.length > 1 && (
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => handleRemoveQuestion(index)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Remove Question
                          </Button>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>

              <div className="flex justify-between mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddQuestion}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Question
                </Button>
                <Button type="submit">
                  <Check className="h-4 w-4 mr-2" />
                  Submit Quiz
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Warning Modal */}
      <AlertDialog open={showWarningModal} onOpenChange={setShowWarningModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Incomplete Questions</AlertDialogTitle>
            <AlertDialogDescription>
              Please select a correct answer for each question before
              submitting.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction>Ok</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmation Modal */}
      <AlertDialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Submission</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to submit this quiz? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSubmit}>
              Submit Quiz
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PostQues;
