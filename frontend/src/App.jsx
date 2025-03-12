import React from "react";
import { Route, Routes } from "react-router-dom";
import {
  Home,
  UserLogin,
  UserRegister,
  CaptainLogin,
  CaptainSignup,
  Start,
} from "./pages/index";
import { UserDataContext } from "./context/UserContext.jsx";
import UserProtectedWrapper from "./pages/UserProtectedWrapper.jsx";
import UserLogout from "./pages/UserLogout.jsx";
import CaptainHome from "./pages/CaptainHome.jsx";
const App = () => {
  // const user = useContext(UserContext);
  return (
    <Routes>
      <Route path="/" element={<Start />}></Route>
      <Route path="/userlogin" element={<UserLogin />}></Route>
      <Route path="/user-signup" element={<UserRegister />}></Route>
      <Route path="/captain-login" element={<CaptainLogin />}></Route>
      <Route path="/captain-signup" element={<CaptainSignup />}></Route>
      <Route
        path="/home"
        element={
          <UserProtectedWrapper>
            <Home />
          </UserProtectedWrapper>
        }
      ></Route>
      <Route path="/user/logout" element={
        <UserProtectedWrapper><UserLogout/>
        </UserProtectedWrapper>}></Route>
        <Route path="/captain-home" element={<CaptainHome/>}></Route>
    </Routes>
  );
};

export default App;
