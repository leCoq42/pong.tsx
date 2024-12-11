import { NavLink } from "react-router-dom";

const NavBar = () => {
  const padding = {
    padding: 5,
  };
  return (
    <nav>
      <ul style={{ listStyle: "none", display: "flex", gap: "10px" }}>
        <NavLink
          style={padding}
          to="/"
          className={({ isActive }) => (isActive ? "active" : undefined)}
        >
          Home
        </NavLink>
        <NavLink
          style={padding}
          to="/game"
          className={({ isActive }) => (isActive ? "active" : undefined)}
        >
          Game
        </NavLink>
        <NavLink
          style={padding}
          to="/chat"
          className={({ isActive }) => (isActive ? "active" : undefined)}
        >
          Chat
        </NavLink>
      </ul>
    </nav>
  );
};

export default NavBar;
