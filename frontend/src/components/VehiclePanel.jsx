import React from "react";

const VehiclePanel = (props) => {
  return (
    <div>
      <h5
        className="p-1 text-center  w-[93%] absolute top-0"
        onClick={() => {
          props.setVehiclePanelOpen(false);
        }}
      >
        <i className="text-3xl ri-arrow-down-wide-fill"></i>
      </h5>
      <h3  className="text-2xl font-semibold mb-5 ">Choose a vehicle</h3>
      <div onClick={()=> {
        props.setConfirmRideOpen(true)
        props.setVehiclePanelOpen(false)
      }} className="flex border-2  border-gray-400 w-full p-3  mb-2 active:border-black rounded-xl  items-center justify-between ">
        <img
          className="h-12 "
          src="https://www.pngplay.com/wp-content/uploads/8/Uber-PNG-Photos.png"
          alt="car_logo"
        />
        <div className=" w-1/2 ">
          <h4 className="font-medium text-sm">
            UberGo{" "}
            <span>
              <i className="ri-user-fill"></i>4
            </span>
          </h4>
          <h5 className="font-medium text-sm">2 mins away</h5>
          <p className="font-normal text-xs text-gray-600 ">
            Affordable, compact rides
          </p>
        </div>
        <h2 className="text-lg font-semibold">&#8377;193.20</h2>
      </div>

      <div className="flex border-2  border-gray-400 w-full p-3  active:border-black rounded-xl  items-center mb-2 justify-between ">
        <img
          className="h-12 "
          src="https://www.uber-assets.com/image/upload/f_auto,q_auto:eco,c_fill,h_368,w_552/v1648177797/assets/fc/ddecaa-2eee-48fe-87f0-614aa7cee7d3/original/Uber_Moto_312x208_pixels_Mobile.png"
          alt="bike_logo"
        />
        <div className=" w-1/2 ">
          <h4 className="font-medium text-sm">
            Moto{" "}
            <span>
              <i className="ri-user-fill"></i>1
            </span>
          </h4>
          <h5 className="font-medium text-sm">3 mins away</h5>
          <p className="font-normal text-xs text-gray-600 ">
            Affordable motorcycle ride
          </p>
        </div>
        <h2 className="text-lg font-semibold">&#8377;65.17</h2>
      </div>

      <div className="flex border-2  border-gray-400  w-full p-3  mb-2 active:border-black rounded-xl  items-center justify-between ">
        <img
          className="h-12 "
          src="https://www.uber-assets.com/image/upload/f_auto,q_auto:eco,c_fill,h_368,w_552/v1648431773/assets/1d/db8c56-0204-4ce4-81ce-56a11a07fe98/original/Uber_Auto_558x372_pixels_Desktop.png"
          alt="bike_logo"
        />
        <div className=" w-1/2 ">
          <h4 className="font-medium text-sm">
            Auto{" "}
            <span>
              <i className="ri-user-fill"></i>3
            </span>
          </h4>
          <h5 className="font-medium text-sm">4 mins away</h5>
          <p className="font-normal text-xs text-gray-600 ">
            Affordable auto rickshaw
          </p>
        </div>
        <h2 className="text-lg font-semibold">&#8377;118.68</h2>
      </div>
    </div>
  );
};

export default VehiclePanel;
