import { NavLink } from "react-router-dom";

const NavBar = () => {
  const padding = {
    padding: 5,
  };
  return (
    <nav>
      <ul>
        <NavLink style={padding} to="/">
          Home
        </NavLink>
        <NavLink style={padding} to="/game">
          Game
        </NavLink>
        <NavLink style={padding} to="/chat">
          Chat
        </NavLink>
      </ul>
    </nav>
  );
};

export default NavBar;
