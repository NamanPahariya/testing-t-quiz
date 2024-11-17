// import "./App.css";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Routing from "./Routing/Routes";
import { Toaster } from "./Components/ui/toaster";

function App() {
  return (
    <>
      {/* <ToastContainer /> */}
      <Toaster />
      <Routing />
    </>
  );
}

export default App;
