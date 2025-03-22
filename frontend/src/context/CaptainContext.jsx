import React, { createContext, useState } from "react";

// Create the context
export const CaptainDataContext = createContext();

// Create the provider component
export const CaptainContext = ({ children }) => {
  const [captain, setCaptain] = useState(null);
  const [isloading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);



  // Update captain profile
  const updateCaptain = async (updatedData) => {
    setCaptain(updatedData);
    }




  return (
    <CaptainDataContext.Provider
      value={{
        captain,
        setCaptain,
        isloading,
        setIsLoading,
        error,
        setError,
        updateCaptain,
      }}
    >
      {children}
    </CaptainDataContext.Provider>
  );
};

export default CaptainContext;
