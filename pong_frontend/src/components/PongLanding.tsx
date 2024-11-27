import { useNavigate, Outlet } from "react-router-dom";

const PongLanding = () => {
  const padding = {
    padding: 5,
  };
  const navigate = useNavigate();

  return (
    <div className="gamelanding">
      <div style={padding} className="gamemode">
        Choose game mode
      </div>
      <button className="btn" onClick={() => navigate("local-mp")}>
        Local Multiplayer
      </button>
      <button className="btn" onClick={() => navigate("remote-mp")}>
        Remote Multiplayer
      </button>
      <button className="btn" onClick={() => navigate("singleplayer")}>
        Singleplayer
      </button>
      <Outlet />
    </div>
  );
};

export default PongLanding;
