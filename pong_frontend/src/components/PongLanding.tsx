import { useNavigate, Outlet } from "react-router-dom";
import { useState } from "react";

const PongLanding = () => {
  const [gameActive, setGameActive] = useState(false);
  const navigate = useNavigate();

  const handleModeSelect = (mode: string) => {
    setGameActive(true);
    navigate(mode);
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {!gameActive && (
        <div className="flex flex-col gap-4">
          <button
            onClick={() => handleModeSelect("local-mp")}
            className="px-4 py-2 bg-blue-500 text-white rounded"
          >
            Local Multiplayer
          </button>
          <button
            onClick={() => handleModeSelect("singleplayer")}
            className="px-4 py-2 bg-green-500 text-white rounded"
          >
            Singleplayer
          </button>
          <button
            onClick={() => handleModeSelect("remote-mp")}
            className="px-4 py-2 bg-purple-500 text-white rounded"
          >
            Remote Multiplayer
          </button>
        </div>
      )}
      <Outlet context={{ setGameActive }} />
    </div>
  );
};

export default PongLanding;
