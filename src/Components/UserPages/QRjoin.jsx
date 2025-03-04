import React, { useEffect, useState, useCallback, useMemo } from "react";
import SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs";
import { useNavigate, useParams } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Loader2, Users, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Constants
const WEBSOCKET_ENDPOINTS = {
  JOINED_STUDENTS: "/topic/joinedStudents",
  JOIN_QUIZ: "/app/joinQuiz",
};

const SESSION_STORAGE_KEYS = {
  USERNAME: "username",
  SESSION_CODE: "sessionCode",
  USER_ID: "userId",
};

const MIN_SESSION_CODE_LENGTH = 6;

const QRJoin = () => {
  const baseUrl = import.meta.env.VITE_BASE_URL;
  const [client, setClient] = useState(null);
  const [studentName, setStudentName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { sessionCode } = useParams();

  // Clean up WebSocket connection on unmount
  useEffect(() => {
    return () => {
      if (client) {
        client.deactivate();
      }
    };
  }, [client]);

  // Handle student name input change
  const handleNameChange = useCallback((e) => {
    setStudentName(e.target.value.replace(/^\s+/, "") );
  }, []);

  // Establish WebSocket connection
  const establishWebSocketConnection = useCallback(() => 
    new Promise((resolve, reject) => {
      if (client) {
        resolve(client);
        return;
      }

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
          setClient(null); // Reset client state
        },
        onWebSocketError: (error) => {
          console.error("WebSocket error:", error);
          toast({
            title: "Connection Error",
            description: "WebSocket connection failed. Please try again.",
            variant: "destructive",
          });
          setClient(null);
          reject(error);
        },
        reconnectDelay: 5000,
        heartbeatIncoming: 4000,
        heartbeatOutgoing: 4000,
      });

      stompClient.activate();
    }), [baseUrl, client, toast]);

  // Handle quiz join logic
  const handleJoinQuiz = useCallback(async (e) => {
    e.preventDefault();
    
    if (!sessionCode || sessionCode.length < MIN_SESSION_CODE_LENGTH) {
      toast({
        title: "Validation Error",
        description: "Invalid session code!",
        variant: "destructive",
      });
      return;
    }

    if (!studentName) {
      toast({
        title: "Validation Error",
        description: "Please enter your name!",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const stompClient = await establishWebSocketConnection();

      stompClient.subscribe(WEBSOCKET_ENDPOINTS.JOINED_STUDENTS, (message) => {
        try {
          const response = JSON.parse(message.body);
          
          // Store session data
          Object.entries({
            [SESSION_STORAGE_KEYS.USERNAME]: studentName,
            [SESSION_STORAGE_KEYS.SESSION_CODE]: sessionCode,
            [SESSION_STORAGE_KEYS.USER_ID]: response.userid,
          }).forEach(([key, value]) => sessionStorage.setItem(key, value));

          navigate("/quiz");
        } catch (error) {
          console.error("Error processing join message:", error);
          toast({
            title: "Error",
            description: "Failed to process join response",
            variant: "destructive",
          });
        }
      });

      stompClient.publish({
        destination: WEBSOCKET_ENDPOINTS.JOIN_QUIZ,
        body: JSON.stringify({
          name: studentName,
          sessionCode: sessionCode,
        }),
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Error in joining quiz:", error);
      toast({
        title: "Error",
        description: "Could not join the quiz. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [sessionCode, studentName, establishWebSocketConnection, navigate, toast]);

  const isFormValid = useMemo(() => 
    !isLoading && sessionCode && sessionCode.length >= MIN_SESSION_CODE_LENGTH && studentName,
    [isLoading, sessionCode, studentName]
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <form onSubmit={handleJoinQuiz}>
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">
              Join Quiz Session
            </CardTitle>
            <CardDescription className="text-center text-gray-500">
              Enter your name to join an active quiz
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
                  onChange={handleNameChange}
                  className="pl-10"
                  maxLength={50}
                  required
                  aria-label="Full Name"
                />
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button
              className="w-full font-semibold"
              type="submit"
              disabled={!isFormValid}
              aria-label={isLoading ? "Joining quiz..." : "Join Quiz"}
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
        </form>
      </Card>
    </div>
  );
};

export default React.memo(QRJoin);