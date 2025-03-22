import React from "react";

const ConfirmedRide = (props) => {
  return (
    <div>
      <h5
        className="p-1 text-center  w-[93%] absolute top-0"
        onClick={() => {
          props.setConfirmRideOpen(false);
        }}
      >
        <i className="text-3xl ri-arrow-down-wide-fill"></i>
      </h5>

      <h3 className="text-2xl font-semibold mb-5 mt-5">Confirm your Ride</h3>

      <div className="flex gap-2 justify-start  flex-col ">
        <img
          className="h-20"
          src="https://www.pngplay.com/wp-content/uploads/8/Uber-PNG-Photos.png"
          alt=""
        />
        {/* pickup location */}
        <div className="flex gap-5  items-center p-3 border-b-2">
          <i className="text-lg ri-map-pin-line"></i>
          <div className="flex flex-col">
            <h3 className="text-lg font-medium ">562/11-A</h3>
            <p className="text-sm -mt-1 text-gray-600">
              kankariya Talab, Ahmedabad
            </p>
          </div>
        </div>
        {/* drop location */}
        <div className="flex gap-5 items-center p-3 border-b-2">
          <i className="tezt-lg ri-map-pin-line"></i>
          <div className="flex flex-col">
            <h3 className="text-lg font-medium ">562/11-A</h3>
            <p className="text-sm -mt-1 text-gray-600">
              kankariya Talab, Ahmedabad
            </p>
          </div>
        </div>
        {/* payment details  */}
        <div className="flex gap-5 items-center p-3 ">
          <i className="text-lg ri-currency-line"></i>
          <div>
            <h3 className="text-lg font-medium ">&#8377;193.12</h3>
            <p className="text-sm -mt-1 text-gray-600">Cash Cash</p>
          </div>
        </div>

        <div className="w-full">
          <button 
          onClick={()=>{props.setConfirmRideOpen(false)
            props.setVehicleFound(true)
            props.setConfirmRideOpen(false)
          }}
          className="w-full bg-green-600 text-white font-semibold p-2 rounded-lg  my-5">
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmedRide;
