import React, { useContext, useState } from "react";
import { Link } from "react-router-dom";
import { CaptainDataContext } from "../context/CaptainContext";
import { useNavigate } from "react-router-dom";
import axios from "axios";
const CaptainSignup = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstname, setFirstname] = useState("");
  const [lastname, setLastname] = useState("");

  const [vehiclePlate, setVehiclePlate] = useState("");
  const [vehicleColor, setVehicleColor] = useState("");
  const [vehicleType, setVehicleType] = useState("");
  const [vehicleCapacity, setVehicleCapacity] = useState("");

  const { captain, setCaptain } = useContext(CaptainDataContext);

  const navigate = useNavigate();

  const submitHandler = async (e) => {
    e.preventDefault();
    const captainData = {
      fullname: {
        firstname: firstname,
        lastname: lastname,
      },
      email: email,
      password: password,
      vehicle: {
        color: vehicleColor,
        plate: vehiclePlate,
        capacity: vehicleCapacity,
        vehicleType: vehicleType,
      },
    };

    const response = await axios.post(
      `${import.meta.env.VITE_BASE_URL}/captains/register`,
      captainData
    );

    if (response.status === 201) {
      const data = response.data;
      setCaptain(data.captain);
      localStorage.setItem("token", data.token);
      navigate("/captain-home");
    }

    setEmail("");
    setFirstname("");
    setLastname("");
    setPassword("");
    setVehicleColor("");
    setVehiclePlate("");
    setVehicleCapacity("");
    setVehicleType("");
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

          <h3 className="text-base font-medium mb-2 ">Vehicle Information</h3>

          <div className=" flex gap-4 mb-2">
            <input
              type="text"
              required
              value={vehiclePlate}
              onChange={(e) => setVehiclePlate(e.target.value)}
              className="bg-[#eeeeee] mb-5 rounded px-4 py-2 border w-1/2 text-base placeholder:text-sm"
              placeholder="Plate number"
            />

            <input
              type="number"
              required
              value={vehicleCapacity}
              onChange={(e) => setVehicleCapacity(e.target.value)}
              className="bg-[#eeeeee] mb-5 rounded px-4 py-2 border w-1/2 text-base placeholder:text-sm"
              placeholder="vehicle capacity"
            />
          </div>

          <div className="flex gap-4 mb-2">
            <input
              type="text"
              required
              value={vehicleColor}
              onChange={(e) => setVehicleColor(e.target.value)}
              className="bg-[#eeeeee] mb-5 rounded px-4 py-2 border w-1/2 text-base placeholder:text-sm"
              placeholder="vehicle color"
            />

            <select
              name="vehicleType"
              id="vehicleType"
              required
              className="bg-[#eeeeee] mb-5 rounded px-4 py-2 border w-1/2 text-base placeholder:text-sm"
              value={vehicleType}
              onChange={(e) => setVehicleType(e.target.value)}
            >
              <option value="options" disabled>
                Select Vehicle Type
              </option>
              <option value="car">Car</option>
              <option value="Moto">Moto</option>
              <option value="Auto">Auto</option>
            </select>
          </div>

          <button
            type="submit"
            className="bg-[#111] text-white font-semibold  mb-3  rounded px-4 py-2  w-full text-lg"
          >
            Create Captain Account
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
