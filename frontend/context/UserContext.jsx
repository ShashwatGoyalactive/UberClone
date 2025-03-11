import React , {useState , createContext} from 'react';
const UserDataContext = createContext();

const UserContext = ({children}) => {

    const [user , setUser]= useState({
        email: '',
        password: '',
        fullname : {
            firstname : '',
            lastname : ''
        }
    })
   
  return (
    <div>
        <UserDataContext.Provider value={{user}}>
            {children}
        </UserDataContext.Provider>
    </div>
  )
}

export default UserContext