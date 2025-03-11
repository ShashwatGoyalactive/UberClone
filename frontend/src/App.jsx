import React, { useContext } from "react";
import { Route, Routes } from "react-router-dom";
import  {Home,  UserLogin , UserRegister , CaptainLogin , CaptainSignup}  from "./pages/index";
import { UserContext } from "./context/userContext";
const App = () => {
  const user = useContext(UserContext);
  return (
    <Routes>
      <Route path="/" element={<Home />}></Route>
      <Route path="/userlogin" element={<UserLogin />}></Route>
      <Route path="/user-signup" element={<UserRegister />}></Route>
      <Route path="/captain-login" element={<CaptainLogin />}></Route>
      <Route path="/captain-signup" element={<CaptainSignup />}></Route>
    </Routes>
  );
};

export default App;
