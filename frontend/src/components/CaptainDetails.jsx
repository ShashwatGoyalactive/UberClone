import React from 'react'

const CaptainDetails = () => {
  return (
    <div>
      <div className="flex items-center justify-between">
        <div className="flex items-center justify-start gap-3">
          <img
            className="h-10 w-10 rounded-full object-cover"
            src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?fm=jpg&q=60&w=3000&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NHx8cmFuZG9tJTIwcGVvcGxlfGVufDB8fDB8fHww"
            alt="person_photo"
          />
          <h4 className="text-lg font-medium">Harsh Patel</h4>
        </div>
        <div>
          <h4 className="text-xl font-semibold">&#8377;295.64</h4>
          <p className="text-sm">Earned</p>
        </div>
      </div>
      <div className="flex p-3 mt-8 bg-gray-100 rounded-xl justify-evenly gap-5 items-start">
        <div className="text-center">
          <i className="text-3xl mb-2  font-thin ri-timer-line"></i>
          <h5 className="text-lg font-medium">10.2</h5>
          <p className="text-small text-gray-600 ">Hours Online</p>
        </div>
        <div className="text-center">
          <i className="text-3xl mb-2  font-thin ri-speed-up-line"></i>
          <h5 className="text-lg font-medium">10.2</h5>
          <p className="text-small text-gray-600 ">Hours Online</p>
        </div>
        <div className="text-center">
          <i className="text-3xl mb-2  font-thin ri-booklet-line"></i>
          <h5 className="text-lg font-medium">10.2</h5>
          <p className="text-small text-gray-600 ">Hours Online</p>
        </div>
      </div>
    </div>
  );
}

export default CaptainDetails