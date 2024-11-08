import "./App.css";
import PongLocalMult from "./components/PongLocalMult";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import PongSingle from "./components/PongSingle";

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
        <Link style={padding} to="/game-singleplayer">
          Game (Singleplayer)
        </Link>
        <Link style={padding} to="/game-local-mult">
          Game (Local Multiplayer)
        </Link>
      </div>
      <Routes>
        <Route
          index
          path="/game-local-mult"
          element={<PongLocalMult gameWidth={800} gameHeight={600} />}
        />
        <Route
          index
          path="/game-singleplayer"
          element={<PongSingle gameWidth={800} gameHeight={600} />}
        />
      </Routes>
    </Router>
  );
}

export default App;
