import React from "react";
import { Route, Routes } from "react-router-dom";
import {
  UserSignup,
  UserLogin,
  UserLogout,
  Home,
  Start,
  UserProtectedWrapper,
  CaptainProtectedWrapper,
  CaptainSignup,
  CaptainHome,
  CaptainLogin,
  CaptainLogout,
  Riding,
  CaptainRiding
} from "./pages/index";

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<Start />}></Route>
      <Route path="/userlogin" element={<UserLogin />}></Route>
      <Route path="/user-signup" element={<UserSignup />}></Route>
      <Route path="/riding" element={<Riding />}></Route>
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
      <Route
        path="/users/logout"
        element={
          <UserProtectedWrapper>
            <UserLogout />
          </UserProtectedWrapper>
        }
      ></Route>
      <Route
        path="/captain-home"
        element={
          <CaptainProtectedWrapper>
            <CaptainHome />
          </CaptainProtectedWrapper>
        }
      ></Route>
      <Route path="/captains/logout" element={<CaptainLogout />}></Route>
      <Route path="/captain-riding" element={<CaptainRiding />}></Route>
    </Routes>
  );
};

export default App;
