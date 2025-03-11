import React from 'react'
import {Link} from 'react-router-dom';

const Home = () => {
  return (
    <div>
      <div className="bg-[url(https://images.unsplash.com/photo-1527603815363-e79385e0747e?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Nzh8fHRyYWZmaWMlMjBsaWdodHN8ZW58MHx8MHx8fDA%3D)] bg-cover bg-bottom h-screen pt-5  flex flex-col justify-between w-full bg-red-400">
        <img 
          className="w-14 ml-8"
          src="https://upload.wikimedia.org/wikipedia/commons/5/58/Uber_logo_2018.svg"
          alt="Uber logo"
        />
        <div className="bg-white pb-7 py-4 px-4  ">
          <h2 className="text-3xl font-bold">Get started with Uber</h2>
          <Link to="/userlogin" className=" flex justify-center items-center w-full bg-black text-white py-3 rounded mt-5">
            Continue
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Home