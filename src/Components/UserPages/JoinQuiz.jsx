import React, { useEffect, useState } from "react";
import SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs";
import { useNavigate } from "react-router-dom";
// import { useToast } from "@/components/ui/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Users, KeyRound, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const JoinQuiz = () => {
  const baseUrl = import.meta.env.VITE_BASE_URL;
  const [client, setClient] = useState(null);
  const [sessionCode, setSessionCode] = useState("");
  const [studentName, setStudentName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    return () => {
      if (client) {
        client.deactivate();
      }
    };
  }, [client]);

  const validateUser = async () => {
    try {
      const response = await fetch(`${baseUrl}/api/quiz/validate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionCode,
          name: studentName,
        }),
      });

      if (!response.ok) {
        const errorMessage = await response.text();
        throw new Error(errorMessage || "Validation failed!");
      }

      const responseData = await response.text();
      if (responseData.includes("Session code valid")) {
        toast({
          title: "Welcome",
          description: `${studentName}! 😊`,
          variant: "default",
        });
        return true;
      } else {
        throw new Error("Unexpected response from server.");
      }
    } catch (error) {
      console.error("Validation error:", error);
      toast({
        // title: "Error",
        description: error.message,
        variant: "destructive",
      });
      return false;
    }
  };

  const establishWebSocketConnection = () =>
    new Promise((resolve, reject) => {
      if (!client) {
        const socket = new SockJS(`${baseUrl}/quiz-websocket`);
        const stompClient = new Client({
          webSocketFactory: () => socket,
          onConnect: () => {
            console.log("WebSocket connected");
            setClient(stompClient);
            resolve(stompClient);
          },
          onWebSocketClose: () => {
            console.log("WebSocket connection closed");
          },
          onWebSocketError: (error) => {
            console.error("WebSocket error:", error);
            toast({
              title: "Connection Error",
              description: "WebSocket connection failed.",
              variant: "destructive",
            });
            reject(error);
          },
        });

        stompClient.activate();
      } else {
        resolve(client);
      }
    });

  const joinQuiz = async () => {
    if (!studentName || !sessionCode) {
      toast({
        title: "Validation Error",
        description: "Please enter your name and session code!",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const isValid = await validateUser();
      if (!isValid) {
        setSessionCode("");
        setStudentName("");
        setIsLoading(false);
        return;
      }

      const stompClient = await establishWebSocketConnection();

      stompClient.subscribe("/topic/joinedStudents", (message) => {
        const response = message.body;
        console.log("Received join message:", response);
        navigate("/quiz");
      });

      stompClient.publish({
        destination: "/app/joinQuiz",
        body: JSON.stringify({
          name: studentName,
          sessionCode: sessionCode,
        }),
        headers: { "Content-Type": "application/json" },
      });

      localStorage.setItem("sessionCode", sessionCode);
    } catch (error) {
      console.error("Error in joining quiz:", error);
      toast({
        title: "Error",
        description: "Could not join the quiz.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            Join Quiz Session
          </CardTitle>
          <CardDescription className="text-center text-gray-500">
            Enter your details to join an active quiz
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium">
              Full Name
            </Label>
            <div className="relative">
              <Users className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="name"
                type="text"
                placeholder="Enter your full name"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sessionCode" className="text-sm font-medium">
              Quiz Code
            </Label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="sessionCode"
                type="text"
                placeholder="Enter quiz code"
                value={sessionCode}
                onChange={(e) => setSessionCode(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button
            className="w-full font-semibold"
            onClick={joinQuiz}
            disabled={isLoading || !sessionCode || !studentName}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Joining...
              </>
            ) : (
              <>
                Join Quiz
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default JoinQuiz;
