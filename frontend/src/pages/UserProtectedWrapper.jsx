import React , {useContext, useEffect, useState} from 'react'
import { useNavigate } from 'react-router-dom';
import { UserDataContext } from '../context/UserContext';
import  Home  from './Home.jsx';
import axios from 'axios';
const UserProtectedWrapper = ({children}) => {

    const navigate = useNavigate();
    const token = localStorage.getItem('token');
    const [isLoading, setIsLoading] = useState(true); 
    const {user , setuser} = useContext(UserDataContext);



    useEffect(() => {
    if(!token){
      navigate('/userlogin');
    }
    }, [token])
    

     axios.get(`${import.meta.env.VITE_BASE_URL}/users/profile`, {
      headers: {
        Authorization : `Bearer ${token}`
      }
    }).then(response => {
      if(response.status === 200){
        setuser(response.data.user);
        setIsLoading(false);
      }
    }).catch(error => {
      console.log(error);
   localStorage.removeItem("token");
      navigate('/userlogin');
    })

    if(isLoading){
    return(<div>Loading...</div>)
    }
    
  return (
    <div>{children}</div>
  )
}

export default UserProtectedWrapper