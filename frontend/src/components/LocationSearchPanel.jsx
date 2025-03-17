import React from "react";

const LocationSearchPanel = (props) => {
  console.log(props);

  // sample array for locations
  const locations = [
    "24B , Near Kapoor's Cafe, Nehru Nagar",
    "ABC Colony, Mayur Vihar Phase 1, Delhi",
    "ABC Colony, Mayur Vihar Phase 2, Delhi",
    "232 , Law Colony , Delhi",
    "ABC Colony, Mayur Vihar Phase 3, Delhi",
  ];
  return (
    <div>
      {/* this is just a sample data */}

      {locations.map((elem, idx) => {
        return (
          <div
            key={idx}
            onClick={()=> {
              props.setVehiclePanelOpen(true),
              props.setPanelOpen(false)
            }}
            
            className="flex gap-4 border-2 p-3  border-gray-100 rounded-xl active:border-black justify-start my-2 items-center "
          >
            <h2 className="bg-[#eee]  h-10 flex items-center justify-center w-12 rounded-full">
              {" "}
              <i className="ri-map-pin-2-line text-xl"></i>
            </h2>
            <h4 className="font-medium">{elem}</h4>
          </div>
        );
      })}

      {/* <div className="flex gap-4 border-2 p-3  border-gray-100 rounded-xl active:border-black justify-start my-2 items-center ">
        <h2 className="bg-[#eee]  h-10 flex items-center justify-center w-12 rounded-full">
          {" "}
          <i className="ri-map-pin-2-line text-xl"></i>
        </h2>
        <h4 className="font-medium">ABC Colony, Mayur Vihar Phase 1, Delhi</h4>
      </div>

      <div className="flex gap-4 border-2 p-3  border-gray-100 rounded-xl active:border-black  justify-start my-2 items-center ">
        <h2 className="bg-[#eee]  h-10 flex items-center justify-center w-12 rounded-full">
          {" "}
          <i className="ri-map-pin-2-line text-xl"></i>
        </h2>
        <h4 className="font-medium">ABC Colony, Mayur Vihar Phase 1, Delhi</h4>
      </div>

      <div className="flex gap-4 border-2 p-3  border-gray-100 rounded-xl active:border-black justify-start my-2 items-center ">
        <h2 className="bg-[#eee]  h-10 flex items-center justify-center w-12 rounded-full">
          {" "}
          <i className="ri-map-pin-2-line text-xl"></i>
        </h2>
        <h4 className="font-medium">ABC Colony, Mayur Vihar Phase 1, Delhi</h4>
      </div>

      <div className="flex gap-4 border-2 p-3  border-gray-100 rounded-xl active:border-black justify-start my-2 items-center ">
        <h2 className="bg-[#eee]  h-10 flex items-center justify-center w-12 rounded-full">
          {" "}
          <i className="ri-map-pin-2-line text-xl"></i>
        </h2>
        <h4 className="font-medium">ABC Colony, Mayur Vihar Phase 1, Delhi</h4>
      </div>

      <div className="flex gap-4 border-2 p-3  border-gray-100 rounded-xl active:border-black justify-start my-2 items-center ">
        <h2 className="bg-[#eee]  h-10 flex items-center justify-center w-12 rounded-full">
          {" "}
          <i className="ri-map-pin-2-line text-xl"></i>
        </h2>
        <h4 className="font-medium">ABC Colony, Mayur Vihar Phase 1, Delhi</h4>
      </div>

      <div className="flex gap-4 border-2 p-3  border-gray-100 rounded-xl active:border-black justify-start my-2 items-center ">
        <h2 className='bg-[#eee]  h-10 flex items-center justify-center w-12 rounded-full'>
          {" "}
          <i className="ri-map-pin-2-line text-xl"></i>
        </h2>
        <h4 className="font-medium">
          ABC Colony, Mayur Vihar Phase 1, Delhi
        </h4>
      </div> */}
    </div>
  );
};

export default LocationSearchPanel;
