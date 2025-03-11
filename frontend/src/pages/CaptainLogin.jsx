import React, { useState } from "react";
import { Link } from "react-router-dom";

const CaptainLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [captainData, setCaptainData] = useState({
    email: "",
    password: "",
  });
  const submitHandler = (e) => {
    e.preventDefault();
    console.log(email, password);
    setCaptainData({
      email,
      password,
    });

    setEmail("");
    setPassword("");
  };

  return (
    <div className="p-6 flex flex-col h-screen justify-between ">
      <div>
        <img
          className="w-14 mb-4"
          src="https://www.svgrepo.com/show/505031/uber-driver.svg"
          alt="Uber logo"
        />
        <form onSubmit={submitHandler}>
          <h3 className="text-lg font-medium mb-2 ">What's your email</h3>

          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="bg-[#eeeeee] mb-7 rounded px-4 py-2 border w-full text-lg placeholder:text-base"
            placeholder="email@example.com"
          />

          <h3 className="text-lg font-medium mb-2 ">What's your password</h3>

          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="bg-[#eeeeee] mb-7 rounded px-4 py-2 border w-full text-lg placeholder:text-base"
            placeholder="password"
          />

          <button className="bg-[#111] text-white font-semibold  mb-3  rounded px-4 py-2  w-full text-lg">
            Login
          </button>
        </form>
        <p className="text-center">
          Join a fleet ?{" "}
          <Link to="/captain-signup" className="text-blue-600 ">
            Register as a Captain
          </Link>{" "}
        </p>
      </div>

      <div>
        <Link
          to="/userlogin"
          className=" bg-[#d5622d] text-white font-semibold flex justify-center items-center  mb-7 rounded px-4 py-2  w-full text-lg"
        >
          {" "}
          Sign in as User{" "}
        </Link>
      </div>
    </div>
  );
};

export default CaptainLogin;
