import React, { useState, useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import "remixicon/fonts/remixicon.css";
import LocationSearchPanel from "../components/LocationSearchPanel.jsx";
import VehiclePanel from "../components/VehiclePanel.jsx";
import ConfirmedRide from "../components/ConfirmedRide.jsx";

const Home = () => {
  const [pickup, setPickup] = useState("");
  const [destination, setDestination] = useState("");
  const [panelOpen, setPanelOpen] = useState(false);

  const panelRef = useRef(null);
  const panelCloseRef = useRef(null);
  const [vehiclePanelOpen, setVehiclePanelOpen] = useState(false); // for dsiplaying the vehicle selection only when the source and destination are selected
  const vehiclePanelRef = useRef(null);
  const confirmRideRef = useRef(null);
  const [confirmRideOpen , setConfirmRideOpen] = useState(false);
  
  const submitHandler = (e) => {
    e.preventDefault();

    if (!pickup || !destination) {
      return alert("Please fill out both pickup and destination fields");
    }

    console.log(pickup, destination);

    setDestination("");
    setPickup("");
  };

  useGSAP(() => {
    if (panelOpen) {
      gsap.to(panelRef.current, {
        height: "70%",
        opacity: 1,
        padding: 24,
      });
      gsap.to(panelCloseRef.current, {
        opacity: 1,
      });
    } else {
      gsap.to(panelRef.current, {
        height: "0%",
        padding: 0,
      });
      gsap.to(panelCloseRef.current, {
        opacity: 0,
      });
    }
  }, [panelOpen]);

  useGSAP(() => {
    if (vehiclePanelOpen) {
      gsap.to(vehiclePanelRef.current, {
        transform: "translateY(0)",
      });
    } else {
      gsap.to(vehiclePanelRef.current, {
        transform: "translateY(100%)",
      });
    }
  }, [vehiclePanelOpen]);

  useGSAP(() => {
    if (confirmRideOpen) {
      gsap.to(confirmRideRef.current, {
        transform: "translateY(0)",
      });
    } else {
      gsap.to(confirmRideRef.current, {
        transform: "translateY(100%)",
      });
    }
  }, [confirmRideOpen]);


  return (
    <div className="h-screen relative overflow-hidden">
      <img
        className="w-16 absolute left-5 top-5"
        src="https://upload.wikimedia.org/wikipedia/commons/5/58/Uber_logo_2018.svg"
        alt="Uber logo"
      />
      <div className="w-screen h-screen">
        {/* image for temporary use */}
        <img
          className="w-full h-full object-cover"
          src="https://cdn.dribbble.com/userupload/22910073/file/original-f308c35778d329518ef2b88f866111ec.gif"
          alt="uber-map"
        />
      </div>

      <div className=" flex flex-col justify-end h-screen absolute top-0 w-full ">
        {/* location search panel */}
        <div className="h-[30%] p-6 bg-white relative">
          <h5
            ref={panelCloseRef}
            onClick={() => setPanelOpen(false)}
            className="opacity-0 absolute right-6 top-6 text-2xl"
          >
            <i className="ri-arrow-down-wide-line"></i>
          </h5>
          <h4 className="text-3xl font-semibold ">Find a trip</h4>
          <form onSubmit={submitHandler}>
            <div className="line absolute h-16 w-[2px] top-[45%] bg-gray-700 left-10"></div>

            <input
              className="bg-[#eee] px-12 py-2 text-lg rounded-lg  w-full mt-3"
              type="text"
              placeholder="Add a pickup location"
              value={pickup}
              onChange={(e) => setPickup(e.target.value)}
              onClick={() => {
                setPanelOpen(true);
              }}
            />
            <input
              className="bg-[#eee] px-12 py-2 text-lg rounded-lg  w-full mt-3"
              type="text"
              placeholder="Enter your destination"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              onClick={() => {
                setPanelOpen(true);
              }}
            />
          </form>
        </div>
        <div ref={panelRef} className=" bg-white  h-0">
          <LocationSearchPanel
            setPanelOpen={setPanelOpen}
            setVehiclePanelOpen={setVehiclePanelOpen}
          />
        </div>
      </div>
      {/* pannel for the vehicle selection (car / motocycle / auto ) */}
      <div
        className="fixed w-full translate-y-full  z-10 bottom-0 bg-white px-3 pt-12"
        ref={vehiclePanelRef}
      >
        <VehiclePanel
          setVehiclePanelOpen={setVehiclePanelOpen}
          setConfirmRideOpen={setConfirmRideOpen}
        />
      </div>
      <div
        className="fixed w-full translate-y-full  z-10 bottom-0 bg-white px-3 pt-12"
        ref={confirmRideRef}
      >
        <ConfirmedRide setConfirmRideOpen={setConfirmRideOpen} />
      </div>
    </div>
  );
};

export default Home;
