import React, { useContext, useState } from "react";
import axios from "axios";
import { CaptainDataContext } from "../context/CaptainContext";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
const CaptainLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
const {captain , setCaptain} = useContext(CaptainDataContext);

const navigate = useNavigate();




  const submitHandler = async(e) => {
    e.preventDefault();
    console.log(email, password);
    const captain = { email, password };
    const response = await axios.post(`${import.meta.env.VITE_BASE_URL}/captains/login`, captain);

    if(response.status === 200){
    const data = response.data;
    console.log(data);
    localStorage.setItem('token', data.token);
    setCaptain(data.captain);
    navigate('/captain-home');
    }
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
