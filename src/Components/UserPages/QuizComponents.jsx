import { AlertCircle, Clock, Crown, LogOut, Medal, Radio, Trophy, X } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "../ui/alert-dialog";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Alert, AlertDescription } from "../ui/alert";
import { Toast, ToastClose, ToastDescription, ToastProvider, ToastTitle, ToastViewport } from "../ui/toast";
import AnimatedCounter from "./AnimateCounter";


//Logout component
export const LogoutButton = ({ onLogout }) => (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          // variant="destructive"
          className="fixed top-4 right-4 z-50"
          size="sm"
        >
          <LogOut className="mr-2 h-4 w-4" />
          {/* Leave */}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure you want to leave?</AlertDialogTitle>
          <AlertDialogDescription>
            This will end your quiz session and you'll need to rejoin with a new
            code.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onLogout}>Leave</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );




// RefreshMessage component
export const RefreshMessage = () => (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <Card className="w-full max-w-xl shadow-lg">
        <CardHeader className="text-center">
          {/* <AlertCircle className="w-12 h-12 mx-auto text-yellow-500 mb-4" /> */}
          <CardTitle className="text-2xl font-bold text-gray-900">
            Page Refreshed 🙁
          </CardTitle>
          <CardDescription className="text-gray-600 mt-4">
            No problem! You'll be able to continue when the next question appears.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center mt-4">
            <div className="flex space-x-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // WelcomeContent component
  export const WelcomeContent = () => (
    <div className="text-center space-y-6 py-8">
      <div className="flex justify-center">
        <Radio className="h-16 w-16 text-blue-500 animate-pulse" />
      </div>
      <CardTitle className="text-2xl text-blue-700">
        Welcome to the Interactive Quiz!
      </CardTitle>
      <CardDescription className="text-lg">
        Get ready for an exciting learning experience!
      </CardDescription>
      <div className="space-y-4 max-w-md mx-auto text-gray-600">
        <div className="bg-blue-50 rounded-lg p-4">
          <h3 className="font-semibold mb-2">How to Participate:</h3>
          <ul className="text-sm space-y-2 text-left">
            <li>• Questions will appear here when the host starts</li>
            <li>• You'll have limited seconds to answer each question</li>
            <li>• Select your answer and click Submit</li>
            <li>• Instant feedback will show if you're correct</li>
          </ul>
        </div>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Stay on this page - the quiz will begin automatically
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );

  // QuizEnd component
  export const QuizEnd = ({quizEndMessage}) =>{
    return(
        <>
 <Card className="w-full max-w-xl transform transition-all duration-500 ease-in-out hover:scale-105">
          <CardHeader className="text-center">
            <Trophy className="w-12 h-12 mx-auto text-yellow-500 mb-4" />
            <CardTitle className="text-2xl font-bold text-gray-900">
              Quiz Completed!
            </CardTitle>
            <CardDescription className="text-gray-600 mt-2">
              {quizEndMessage || "The quiz has ended. Please wait for the final results..."}
            </CardDescription>
          </CardHeader>
        </Card>
         {/* Loading animation and message */}
         <div className="mt-8 flex flex-col items-center space-y-4">
            <div className="flex justify-center space-x-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
              <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
            </div>
            <div className="text-md font-medium text-gray-600 text-center">
              Stay tuned! Leaderboard coming soon...
            </div>
            <div className="text-sm text-gray-500">
              Don't leave just yet - see where you rank among others!
            </div>
          </div>
          </>
    )
  }

  // Leaderboard component
  const getMedalIcon = (rank) => {
    if (rank === 1) return <Crown className="w-8 h-8 text-yellow-500" />;
    if (rank === 2) return <Medal className="w-8 h-8 text-gray-400" />;
    if (rank === 3) return <Medal className="w-8 h-8 text-amber-600" />;
    return null;
  };

  export const Leaderboard = ({userStats}) =>{
    // console.log(userStats,'userStats hai')
    // console.log(userStats.rank,userStats.score,userStats.name,'values')
    return(
    <div className="w-full max-w-2xl transform transition-all duration-500 ease-in-out">
      <Card className="w-full shadow-lg">
        <CardHeader className="text-center">
          {userStats.rank === 1 &&
          <Trophy className="w-16 h-16 mx-auto text-yellow-500 mb-2 animate-bounce" />
}
          {userStats?.name && (
            <div className="space-y-6">
              {/* Profile Section */}
              <div className="flex flex-col items-center justify-center p-4">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-r from-blue-100 to-purple-100 flex items-center justify-center mb-3 shadow-lg animate-pulse">
                  {userStats.rank <= 3 ? getMedalIcon(userStats.rank) : <span className="text-2xl font-bold text-yellow-600">#{userStats.rank}</span>}
                  </div>
                  {userStats.rank<=3?
                  <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1 shadow-md">
                    <div className="bg-green-500 rounded-full w-6 h-6 flex items-center justify-center">
                      <p className="text-xs font-bold text-white">#{userStats.rank}</p>
                    </div>
                  </div>:''}
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mt-2">{userStats.name}</h2>
                <p className="text-sm text-gray-500">Quiz Stats</p>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4 px-4 sm:px-6">
                <div className="bg-white rounded-xl p-4 shadow-md hover:shadow-lg transition-shadow duration-300 transform hover:-translate-y-1">
                  <div className="flex flex-col items-center">
                    <div className="rounded-full bg-blue-100 p-2 mb-2">
                      <Trophy className="w-6 h-6 text-blue-600" />
                    </div>
                    <p className="text-3xl font-bold text-gray-900">{userStats.score}</p>
                    <p className="text-sm text-gray-500">Total Score</p>
                  </div>
                </div>

                <div className="bg-white rounded-xl p-4 shadow-md hover:shadow-lg transition-shadow duration-300 transform hover:-translate-y-1">
                  <div className="flex flex-col items-center">
                    <div className="rounded-full bg-purple-100 p-2 mb-2">
                      <Medal className="w-6 h-6 text-purple-600" />
                    </div>
                    <p className="text-3xl font-bold text-gray-900">#{userStats.rank}</p>
                    <p className="text-sm text-gray-500">Global Rank</p>
                  </div>
                </div>
              </div>

              {/* Achievement Badge */}
              <div className="mt-6 px-4 sm:px-6">
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 border border-gray-100">
                  <div className="flex items-center justify-center space-x-2">
                    <Crown className="w-5 h-5 text-yellow-500" />
                    <p className="text-sm font-medium text-gray-700">
                      {userStats.rank <= 3 ? "Top Performer!" : "Great Performance!"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardHeader>
      </Card>
    </div>
    )
  }

  export const RenderSubmitSection = ({isSubmitted,timeUp,ElapsedTimes,handleSubmit,isSubmitting,selectedOption}) => {
    if (isSubmitted || timeUp) {
      return (
        <div className="space-y-4">
        <Alert className="mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {timeUp
              ? "Time's up! Wait for the next question..."
              : "Answer submitted! Wait for the next question..."}
          </AlertDescription>
        </Alert>
        {isSubmitted && (
 <ToastProvider>
 <Toast
        duration={5000} 
        className="fixed top-4 left-1/2 transform -translate-x-1/2 w-full max-w-md bg-gray-800 shadow-lg rounded-lg border border-gray-700 p-4 flex items-center space-x-4"
      >
        <div className="flex items-center space-x-3">
          <Clock className="h-6 w-6 text-blue-400" />
          <div className="flex-1">
            <ToastTitle className="text-sm font-semibold text-white">
              Answer Submitted
            </ToastTitle>
            <ToastDescription className="text-sm text-gray-300">
              Your submission time was <AnimatedCounter finalValue={ElapsedTimes} /> seconds
            </ToastDescription>
          </div>
          <ToastClose className="text-gray-400 hover:text-gray-200">
            <X className="h-4 w-4" />
          </ToastClose>
        </div>
      </Toast>
 <ToastViewport />
</ToastProvider>
)}
      </div>
      );
    }

    return (
      <Button
        onClick={handleSubmit}
        disabled={!selectedOption || isSubmitting}
        className="w-full max-w-xs mx-auto"
        variant={isSubmitting ? "outline" : "default"}
      >
        {isSubmitting ? "Submitting..." : "Submit Answer"}
      </Button>
    );
  };