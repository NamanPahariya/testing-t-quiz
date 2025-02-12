import React, { useEffect, useRef, useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import { Trash2, Plus, AlertCircle, Check, CheckCircle2 } from "lucide-react";
import axios from "axios";
import PropTypes from 'prop-types';

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

const QuestionShape = PropTypes.shape({
  questionText: PropTypes.string.isRequired,
  option1: PropTypes.string.isRequired,
  option2: PropTypes.string.isRequired,
  option3: PropTypes.string.isRequired,
  option4: PropTypes.string.isRequired,
  correctAnswer: PropTypes.string.isRequired,
  sessionCode: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  timeLimit: PropTypes.number.isRequired,
});

// Separate component for question options to reduce nesting
const QuestionOptions = ({ question, index, onOptionChange, onAnswerChange }) => {
  return (
    <RadioGroup
      value={question.correctAnswer}
      onValueChange={(value) => onAnswerChange(index, "correctAnswer", value)}
    >
      {["option1", "option2", "option3", "option4"].map((option, optionIndex) => (
        <div key={`${index}-${option}`} className="flex items-center space-x-2 mb-4">
          <RadioGroupItem value={option} id={`${index}-${option}`} />
          <Label htmlFor={`${index}-${option}`} className="flex-grow relative">
            <div className="relative">
              <Input
                placeholder={`Option ${optionIndex + 1}`}
                value={question[option]}
                onChange={(e) => onOptionChange(index, option, e.target.value)}
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
      ))}
    </RadioGroup>
  );
};

QuestionOptions.propTypes = {
  question: QuestionShape.isRequired,
  index: PropTypes.number.isRequired,
  onOptionChange: PropTypes.func.isRequired,
  onAnswerChange: PropTypes.func.isRequired,
};

// Separate component for question item to reduce complexity
const QuestionItem = ({ question, index, onQuestionChange, onRemove, totalQuestions }) => (
  <AccordionItem
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
        <div className="flex items-center space-x-2">
          <Input
            type="number"
            placeholder="Time"
            value={question.timeLimit || ""}
            className="w-24 mr-4 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            onChange={(e) =>
              onQuestionChange(
                index,
                "timeLimit",
                e.target.value === "" ? null : Number(e.target.value)
              )
            }
            min="1"
          />
          {question.correctAnswer && (
            <Badge variant="success" className="ml-2">
              <Check className="h-3 w-3 mr-1" />
              Answered
            </Badge>
          )}
        </div>
      </div>
    </AccordionTrigger>
    <AccordionContent className="px-4 pt-4">
      <div className="space-y-6">
        <div>
          <Input
            placeholder="Enter your question"
            value={question.questionText}
            onChange={(e) => onQuestionChange(index, "questionText", e.target.value)}
            className="mb-4"
          />
          <QuestionOptions
            question={question}
            index={index}
            onOptionChange={onQuestionChange}
            onAnswerChange={onQuestionChange}
          />
        </div>
        {totalQuestions > 1 && (
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={() => onRemove(index)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Remove Question
          </Button>
        )}
      </div>
    </AccordionContent>
  </AccordionItem>
);

QuestionItem.propTypes = {
  question: QuestionShape.isRequired,
  index: PropTypes.number.isRequired,
  onQuestionChange: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
  totalQuestions: PropTypes.number.isRequired,
};

const PostQues = () => {
  const baseUrl = import.meta.env.VITE_BASE_URL;
  const navigate = useNavigate();
  const location = useLocation();
  const { quizTitle } = location.state || {};
  const [sessionCode, setSessionCode] = useState("");
  const defaultQuestion = {
    questionText: "",
    option1: "",
    option2: "",
    option3: "",
    option4: "",
    correctAnswer: "",
    sessionCode: "",
    title: quizTitle || "",
    timeLimit: 15,
  };

  const [questions, setQuestions] = useState(() => [defaultQuestion]);

  const [showWarningModal, setShowWarningModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const stompClientRef = useRef(null);

  const handleWebSocketMessage = useCallback((message) => {
    const code = message.body;
    setSessionCode(code);
    setQuestions((prevQuestions) =>
      prevQuestions.map((q) => ({ ...q, sessionCode: code }))
    );
  }, []);

  useEffect(() => {
    const setupWebSocket = () => {
      const socket = new SockJS(`${baseUrl}/quiz-websocket`);
      const client = new Client({
        webSocketFactory: () => socket,
        onConnect: () => {
          client.subscribe("/topic/quizSessionCode", handleWebSocketMessage);
          client.publish({
            destination: "/app/startQuiz",
            body: JSON.stringify({}),
          });
        },
      });

      stompClientRef.current = client;
      stompClientRef.current.activate();
    };

    setupWebSocket();

    return () => {
      if (stompClientRef.current) {
        stompClientRef.current.deactivate();
      }
    };
  }, [baseUrl, handleWebSocketMessage]);

  const handleChange = useCallback((index, field, value) => {
    setQuestions((prevQuestions) => {
      const updated = [...prevQuestions];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }, []);

  const handleAddQuestion = useCallback(() => {
    setQuestions((prevQuestions) => [
      ...prevQuestions,
      {
        questionText: "",
        option1: "",
        option2: "",
        option3: "",
        option4: "",
        correctAnswer: "",
        sessionCode,
        title: quizTitle,
        timeLimit: 15,
      },
    ]);
  }, [sessionCode, quizTitle]);

  const handleRemoveQuestion = useCallback((index) => {
    setQuestions((prevQuestions) => 
      prevQuestions.filter((_, i) => i !== index)
    );
  }, []);

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
    try {
      setShowConfirmModal(false);
      await axios.post(`${baseUrl}/api/quiz/create`, questions);
      navigate("/home");
    } catch (error) {
      console.error("Failed to submit quiz:", error);
      // Here you might want to show an error message to the user
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
                  <QuestionItem
                    key={`question-${index}-${question.sessionCode}`}
                    question={question}
                    index={index}
                    onQuestionChange={handleChange}
                    onRemove={handleRemoveQuestion}
                    totalQuestions={questions.length}
                  />
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