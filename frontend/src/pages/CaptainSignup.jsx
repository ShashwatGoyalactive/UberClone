import React, { useState } from "react";
import { Link } from "react-router-dom";

const CaptainSignup = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstname, setFirstname] = useState("");
  const [lastname, setLastname] = useState("");
  const [captainData, setCaptainData] = useState({
    fullname: {
      firstname: "",
      lastname: "",
    },
    email: "",
    password: "",
  });
  const submitHandler = (e) => {
    e.preventDefault();
    console.log(email, password);
    setCaptainData({
      fullname: {
        firstname,
        lastname,
      },
      email,
      password,
    });

    setEmail("");
    setPassword("");
    setFirstname("");
    setLastname("");
  };

  return (
    <div className="p-7 flex flex-col h-screen justify-between ">
      <div>
        <img
          className="w-14 mb-4"
          src="https://www.svgrepo.com/show/505031/uber-driver.svg"
          alt="Uber logo"
        />
        <form onSubmit={submitHandler}>
          <h3 className="text-base font-medium mb-2 ">What's your name</h3>

          <div className="flex gap-4 mb-5">
            <input
              type="text"
              required
              value={firstname}
              onChange={(e) => setFirstname(e.target.value)}
              className="bg-[#eeeeee]  rounded px-4 py-2 border w-1/2  text-base placeholder:text-sm"
              placeholder="First Name"
            />

            <input
              type="text"
              value={lastname}
              onChange={(e) => setLastname(e.target.value)}
              className="bg-[#eeeeee]  rounded px-4 py-2 border w-1/2 text-base placeholder:text-sm"
              placeholder="Last Name"
            />
          </div>

          <h3 className="text-base font-medium mb-2 ">What's your email</h3>

          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="bg-[#eeeeee] mb-5 rounded px-4 py-2 border w-full text-base placeholder:text-sm"
            placeholder="email@example.com"
          />

          <h3 className="text-base font-medium mb-2 ">What's your password</h3>

          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="bg-[#eeeeee] mb-5 rounded px-4 py-2 border w-full text-base placeholder:text-sm"
            placeholder="password"
          />

          <button
            type="submit"
            className="bg-[#111] text-white font-semibold  mb-3  rounded px-4 py-2  w-full text-lg"
          >
            Register
          </button>
        </form>
        <p className="text-center">
          Already have an account ?{" "}
          <Link to="/captain-login" className="text-blue-600 ">
            Login here
          </Link>{" "}
        </p>
      </div>

      <p className="leading-tight">
        This site is protected by reCAPTCHA and the{" "}
        <span className="underline"> Google Privacy Policy</span> and{" "}
        <span className="underline"> Terms of Service apply.</span>
      </p>
    </div>
  );
};

export default CaptainSignup;
