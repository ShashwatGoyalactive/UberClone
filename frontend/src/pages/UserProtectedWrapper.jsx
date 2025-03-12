import React , {useContext, useEffect} from 'react'
import { useNavigate } from 'react-router-dom';
import { UserDataContext } from '../context/UserContext';
import  Home  from './Home.jsx';
const UserProtectedWrapper = ({children}) => {

    const navigate = useNavigate();
    const token = localStorage.getItem('token');

    useEffect(() => {
    if(!token){
      navigate('/userlogin');
    }
    }, [token])
    
    if(!token){
        navigate('/userlogin');
    }


  return (
    <div>{children}</div>
  )
}

export default UserProtectedWrapper