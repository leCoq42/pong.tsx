import "./App.css";
import { Routes, Route } from "react-router-dom";
import { Suspense, lazy } from "react";
import NavBar from "./components/NavBar";

const PongLanding = lazy(() => import("./components/PongLanding"));
const Pong = lazy(() => import("./components/Pong"));

function App() {
  return (
    <>
      <NavBar />
      <Suspense fallback={<div>Loading...</div>}>
        <Routes>
          <Route index path="/" />
          <Route path="game" element={<PongLanding />}>
            <Route
              path="local-mp"
              element={
                <Pong gameWidth={800} gameHeight={600} mode="local-mp" />
              }
            />
            <Route
              path="remote-mp"
              element={
                <Pong gameWidth={800} gameHeight={600} mode="remote-mp" />
              }
            />
            <Route
              path="singleplayer"
              element={
                <Pong gameWidth={800} gameHeight={600} mode="singleplayer" />
              }
            />
          </Route>
        </Routes>
      </Suspense>
    </>
  );
}

export default App;
