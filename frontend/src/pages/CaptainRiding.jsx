import React , {useState , useRef} from 'react'
import { Link } from 'react-router-dom'
import { useGSAP } from '@gsap/react';
import gsap from 'gsap/src';
import FinishRide from '../components/FinishRide';

const CaptainRiding = () => {

    const [finishRidePanel , setFinishRidePanel] = useState(false);
    const finishRidePanelRef = useRef();

     useGSAP(() => {
       if (finishRidePanel) {
         gsap.to(finishRidePanelRef.current, {
           transform: "translateY(0)",
         });
       } else {
         gsap.to(finishRidePanelRef.current, {
           transform: "translateY(100%)",
         });
       }
     }, [finishRidePanel]);
  return (
    <div className="h-screen">
      <div className="fixed p-6 top-0 flex items-center justify-between w-screen">
        <img
          className="w-16"
          src="https://upload.wikimedia.org/wikipedia/commons/5/58/Uber_logo_2018.svg"
          alt=""
        />
        <Link
          to="/captain-login"
          className="h-10 w-10 bg-white flex items-center justify-center rounded-full"
        >
          <i className="text-lg font-medium ri-logout-box-r-line"></i>
        </Link>
      </div>
      <div className="h-5/6">
        <img
          className="w-full h-full object-cover"
          src="https://miro.medium.com/v2/resize:fit:1400/0*gwMx05pqII5hbfmX.gif"
          alt="uber-map"
        />
      </div>

      <div
        className="h-1/6 p-6 flex items-center justify-between relative bg-yellow-400 "
        onClick={() => {
          setFinishRidePanel(true);
        }}
      >
        <h5
          className="pb-5 text-center w-[90%] absolute top-0"
          onClick={() => {}}
        >
          <i className="text-3xl ri-arrow-up-wide-line"></i>
        </h5>
        <h4 className="text-xl font-semibold">4km way</h4>
        <button className=" bg-green-600 text-white font-semibold p-3 px-10 rounded-lg ">
          Complete Ride
        </button>
      </div>
      <div
        ref={finishRidePanelRef}
        className="fixed w-full  z-10 bottom-0 text-lg translate-y-full bg-white px-3 py-10 pt-12"
      >
        <FinishRide setFinishRidePanel={setFinishRidePanel} />
      </div>
    </div>
  );
}

export default CaptainRiding