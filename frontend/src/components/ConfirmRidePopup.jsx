import {useState} from "react";
import { Link } from "react-router-dom";

const ConfirmRidePopup = (props) => {
  const [otp ,setOtp] = useState("");
  const submitHandler = (e) => {
    e.preventDefault();
  };
  return (
    <div>
      <h5
        className="p-1 text-center  w-[93%] absolute top-0"
        onClick={() => {
          props.setConfirmRidePopupPanel(false);
        }}
      >
        <i className="text-3xl ri-arrow-down-wide-fill"></i>
      </h5>

      <h3 className="text-2xl font-semibold mb-5 ">
        Confirm this ride to Start
      </h3>

      <div className="flex items-center justify-between  p-3 bg-yellow-400 rounded-lg mt-4">
        <div className="flex items-center gap-3 ">
          <img
            className="h-12 w-12 rounded-full object-cover"
            src="https://media.istockphoto.com/id/1664876848/photo/happy-crossed-arms-and-portrait-of-asian-man-in-studio-smile-for-career-work-and-job.jpg?s=612x612&w=0&k=20&c=2vYaOMnlmzMEmB441bTWHUyeFXRIh56wE79QAhVWYBk="
            alt=""
          />
          <h2 className="text-lg font-medium">Harsh Patel</h2>
        </div>
        <h5 className="text-lg font-semibold">2.2Km</h5>
      </div>

      <div className="flex gap-2 justify-start  flex-col ">
        {/* <img
          className="h-20"
          src="https://www.pngplay.com/wp-content/uploads/8/Uber-PNG-Photos.png"
          alt=""
        /> */}
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

        <div className="w-full mt-6">
          <form
            onSubmit={(e) => {
              submitHandler(e);
            }}
          >
            <input
            onChange={(e) => {
              setOtp(e.target.value);
            }}
            value={otp}
              type="text"
              placeholder="Enter OTP"
              className="bg-[#eee] px-6 py-4 font-mono text-lg rounded-lg  w-full mt-3"
            />
            <Link
              to="/captain-riding"
              onClick={() => {
                props.setConfirmRidePopupPanel(true);
              }}
              className="w-full mt-5 flex justify-center  bg-green-600 text-white font-semibold p-2 rounded-lg text-lg my-5"
            >
              Confirm
            </Link>
            <button
              onClick={() => {
                props.setConfirmRidePopupPanel(false);
                props.setRidePopupPanel(false);
              }}
              className="w-full mt-1 text-lg bg-red-500 text-white font-semibold p-2 rounded-lg"
            >
              Cancel
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ConfirmRidePopup;
