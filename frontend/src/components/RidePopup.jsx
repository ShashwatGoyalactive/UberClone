

const RidePopup = (props) => {
   

  return (
    <div>
      <h5
        className="p-1 text-center  w-[93%] absolute top-0"
        onClick={() => {
          props.setRidePopupPanel(false);
        }}
      >
        <i className="text-3xl ri-arrow-down-wide-fill"></i>
      </h5>

      <h3 className="text-2xl font-semibold mb-5 ">New Ride Available!</h3>

      <div className='flex items-center justify-between  p-3 bg-yellow-400 rounded-lg mt-4'>
        <div className='flex items-center gap-3 '>
          <img
          className='h-12 w-12 rounded-full object-cover'
            src="https://media.istockphoto.com/id/1664876848/photo/happy-crossed-arms-and-portrait-of-asian-man-in-studio-smile-for-career-work-and-job.jpg?s=612x612&w=0&k=20&c=2vYaOMnlmzMEmB441bTWHUyeFXRIh56wE79QAhVWYBk="
            alt=""
          />
          <h2 className='text-lg font-medium'>Harsh Patel</h2>
        </div>
        <h5 className='text-lg font-semibold'>2.2Km</h5>
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

        <div className="w-full flex items-center justify-between gap-3">
          <button
            onClick={() => {
            props.setConfirmRidePopupPanel(true);
            }}
            className="w-1/2 bg-green-600 text-white font-semibold p-2 rounded-lg  my-5"
          >
            Confirm
          </button>
          <button
            onClick={() => {
            props.setRidePopupPanel(false);
            }}
            className="w-1/2 bg-gray-200 text-gray-700 font-semibold p-2 rounded-lg"
          >
            Ignore
          </button>
        </div>
      </div>
    </div>
  );
}

export default RidePopup