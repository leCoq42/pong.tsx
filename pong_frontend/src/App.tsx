import "./App.css";
import PongGame from "./components/PongGame";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";

function App() {
  const padding = {
    padding: 5,
  };

  return (
    <Router>
      <div>
        <Link style={padding} to="/">
          Home
        </Link>
        <Link style={padding} to="/chat">
          Chat
        </Link>
        <Link style={padding} to="/game">
          Game
        </Link>
      </div>
      <Routes>
        <Route
          index
          path="/"
          element={<PongGame gameWidth={800} gameHeight={600} />}
        />
      </Routes>
    </Router>
  );
}

export default App;
