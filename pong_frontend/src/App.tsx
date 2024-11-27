import "./App.css";
import { Routes, Route } from "react-router-dom";
import PongLanding from "./components/PongLanding";
import PongRemoteMP from "./components/PongRemoteMP";
import PongLocalMult from "./components/PongLocalMult";
import PongSingle from "./components/PongSingle";
import NavBar from "./components/NavBar";

function App() {
  return (
    <>
      <NavBar />
      <Routes>
        <Route index path="/" element={<PongRemoteMP />} />
        <Route path="game" element={<PongLanding />}>
          <Route
            path="local-mp"
            element={<PongLocalMult gameWidth={800} gameHeight={600} />}
          />
          <Route
            path="remote-mp"
            element={<PongRemoteMP gameWidth={800} gameHeight={600} />}
          />
          <Route
            path="singleplayer"
            element={<PongSingle gameWidth={800} gameHeight={600} />}
          />
          <Route path="*" element={<PongRemoteMP />} />
        </Route>
      </Routes>
    </>
  );
}

export default App;
