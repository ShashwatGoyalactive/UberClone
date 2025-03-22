import React, { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Home from "./Home.jsx";
import { CaptainDataContext } from './../context/CaptainContext';
import axios from "axios";





const CaptainProtectedWrapper =  ({ children }) => {
    const token = localStorage.getItem("token");
  const navigate = useNavigate();
const {captain , setCaptain} = useContext(CaptainDataContext);
const [isLoading , setIsLoading] = useState(true);

  useEffect(() => {
    if (!token ) {
      navigate("/captain-login");
    }
  }, [token]);

//   verifying wheter the given token belongs to the captain or not 

const response =  axios.get(`${import.meta.env.VITE_BASE_URL}/captains/profile`,

    {
        headers: {
            Authorization : `Bearer ${token}`
        }}).then(response => {
            if(response.status === 200){
                setCaptain(response.captain);
                setIsLoading(false);
            }
        }).catch(error => {
            console.log(error);
            localStorage.removeItem("token");
            navigate("/captain-login");
        })

        if(isLoading){
            return (<div>Loading...</div>)  
        }

  return <div>{children}</div>;
};

export default CaptainProtectedWrapper;
