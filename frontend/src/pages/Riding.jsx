import React from 'react'
import { Link } from 'react-router-dom';
const Riding = () => {
  return (
    <div className="h-screen">
      <div className="fixed  right-2 top-2 h-10 w-10 bg-white  flex items-center justify-center rounded-full">
        <Link to='/home'>
        <i className="text-lg font-medium text-black ri-home-2-line"></i>
        </Link>
      </div>

      <div className="h-1/2">
        <img
          className="w-full h-full object-cover"
          src="https://cdn.dribbble.com/userupload/22910073/file/original-f308c35778d329518ef2b88f866111ec.gif"
          alt="uber-map"
        />
      </div>

      <div className="h-1/2 p-4">
        <div className="flex gap-2 items-center justify-between">
          <img
            className="h-20"
            src="https://www.pngplay.com/wp-content/uploads/8/Uber-PNG-Photos.png"
            alt=""
          />
          <div className="text-right ">
            <h2 className="text-lg font-medium ">Sarthak</h2>
            <h4 className="text-xl font-medium -mt-1 -mb-1">MP04 AB 1234</h4>
            <p className="text-sm text-gray-600">Maruti Suzuki Alto</p>
          </div>
        </div>
        <div className="flex gap-2 justify-start  flex-col ">
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
        </div>
        <button className=" w-full bg-green-600 text-white font-semibold p-2 rounded-lg  my-5">
          {" "}
          Make a Payment{" "}
        </button>
      </div>
    </div>
  );
}

export default Riding;