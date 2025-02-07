import React, { useState } from "react";
import { Eye, EyeOff, LogIn } from "lucide-react";

const SignIn = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Hardcoded credentials (in a real app, these would be handled securely on the backend)
  const VALID_EMAIL = "tElusko";
  const VALID_PASSWORD = "tElusko";

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Simulate API call delay
    setTimeout(() => {
      if (email === VALID_EMAIL && password === VALID_PASSWORD) {
        // Store authentication token in localStorage
        localStorage.setItem("isAuthenticated", "true");
        
        // redirect
        window.location.href = "/"; 
      } else {
        setError("Invalid email or password");
      }
      setLoading(false);
    }, 1500);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="flex justify-center space-x-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
            <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
          </div>
          <div className="text-sm font-medium text-gray-600 animate-pulse text-center">
            Stay tuned! we are logging you.
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div>
        <div className="flex flex-col justify-center flex-1 min-h-screen px-6 py-8 lg:px-8 dark:bg-slate-900">
          <div className="sm:mx-auto sm:w-full sm:max-w-sm">
              <LogIn className="m-auto size-14" />

            <h2 className="mt-5 text-2xl font-bold leading-9 tracking-tight text-center text-gray-900 dark:text-slate-200">
              Sign in to your account
            </h2>
          </div>

          <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
            {error && (
              <div className="p-3 mb-4 text-sm text-red-500 bg-red-100 rounded-md">
                {error}
              </div>
            )}
            
            <form
              action="#"
              method="POST"
              className="space-y-6"
              onSubmit={handleSubmit}
            >
              <div>
                <label
                  htmlFor="text"
                  className="block text-sm font-medium leading-6 text-gray-900"
                >
                  UserName
                </label>
                <div className="mt-2">
                  <input
                    id="text"
                    name="text"
                    type="text"
                    required
                    autoComplete="text"
                    placeholder="  enter your name"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full mt-1 p-2 rounded-md border border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"

                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium leading-6 text-gray-900"
                >
                  Password
                </label>
                <div className="relative mt-2">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full mt-1 p-2 rounded-md border border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
                    />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5 text-gray-500" />
                    ) : (
                      <Eye className="w-5 h-5 text-gray-500" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  className="w-full py-2 text-white bg-indigo-600 rounded-md shadow-sm hover:bg-indigo-500"
                >
                  Sign in
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
};

export default SignIn;