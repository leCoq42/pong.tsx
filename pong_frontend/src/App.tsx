import "./App.css";
import { Routes, Route } from "react-router-dom";
import React, { Suspense, lazy } from "react";
import NavBar from "./components/NavBar";

const PongLanding = lazy(() => import("./components/PongLanding"));
const PongRemoteMP = lazy(() => import("./components/PongRemoteMP"));
const PongLocalMult = lazy(() => import("./components/PongLocalMult"));
const PongSingle = lazy(() => import("./components/PongSingle"));

function App() {
  return (
    <>
      <NavBar />
      <Suspense fallback={<div>Loading...</div>}>
        <Routes>
          <Route
            index
            path="/"
            element={<PongRemoteMP gameWidth={800} gameHeight={600} />}
          />
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
            <Route
              path="*"
              element={<PongRemoteMP gameWidth={800} gameHeight={600} />}
            />
          </Route>
        </Routes>
      </Suspense>
    </>
  );
}

export default App;
