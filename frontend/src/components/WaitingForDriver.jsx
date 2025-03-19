import React from 'react'

const WaitingForDriver = (props) => {
  return (
    <div>
      <h5
        className="p-1 text-center  w-[93%] absolute top-0"
        onClick={() => {
          props.setWaitForDriver(false);
        }}
      >
        <i className="text-3xl ri-arrow-down-wide-fill"></i>
      </h5>

      <div className='flex gap-2 items-center justify-between'>
        <img 
          className="h-20"
          src="https://static.vecteezy.com/system/resources/thumbnails/048/216/761/small/modern-male-avatar-with-black-hair-and-hoodie-illustration-free-png.png"
          alt=""
        />
        <div className='text-right '>
          <h2 className='text-lg font-medium '>Sarthak</h2>
          <h4 className='text-xl font-semibold -mt-1 -mb-1'>MP04 AB 1234</h4>
          <p className='text-sm text-gray-600'>Maruti Suzuki Alto</p>
        </div>
      </div>
      <div className="flex gap-2 justify-start  flex-col ">
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
      </div>
    </div>
  );
}

export default WaitingForDriver