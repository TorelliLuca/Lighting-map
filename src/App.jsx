"use client"

import React, { useState, useEffect } from "react"
import { BrowserRouter as Router, Routes, Route, Navigate, BrowserRouter } from "react-router-dom"
import Login from "./pages/Login"
import SignIn from "./pages/Signin"
import Dashboard from "./pages/Dashboard"
import Report from "./pages/Report"
import Operation from "./pages/Operation"
import { UserProvider } from "./context/UserContext"
import ProtectedRoute from "./components/ProctetedRoute"
import { ThemeProvider, createGlobalStyle } from 'styled-components';

// Componente che gestisce solo la favicon
const FaviconHandler = () => {
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const isDarkMode = mediaQuery.matches;

    const link = document.querySelector("link[rel*='icon']") || document.createElement('link');
    link.type = 'image/png';
    link.rel = 'shortcut icon';

    const basePath = import.meta.env.VITE_PUBLIC_URL || "";

    if (isDarkMode) {
      link.href = `${basePath}/faviconWhite.png`;
    } else {
      link.href = `${basePath}/faviconDark.png`;
    }

    document.getElementsByTagName('head')[0].appendChild(link);

    const handleChange = (e) => {
      link.href = e.matches ? `${basePath}/faviconWhite.png` : `${basePath}/faviconDark.png`;
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return null;
};


// Definizione del tema basata sulla preferenza del sistema
const useSystemTheme = () => {
  const [theme, setTheme] = React.useState({
    mode: window.matchMedia && 
      window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  });

  React.useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => {
      setTheme({ mode: e.matches ? 'dark' : 'light' });
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return theme;
};




function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const theme = useSystemTheme();

  useEffect(() => {
    const userData = localStorage.getItem("userData")
    if (userData) {
      setIsAuthenticated(true)
    }
  }, [])

  return (
    
    <BrowserRouter  basename="/LIGHTING-MAP"> 
    {/* <BrowserRouter  > */}
    <UserProvider>
      <ThemeProvider theme={theme}>
        <FaviconHandler />
          <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
            <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signin" element={<SignIn />} />
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
              <Route path="/report" element={
                <ProtectedRoute>
                <Report />
              </ProtectedRoute>} />
              <Route path="/operation" element={<ProtectedRoute>
                <Operation />
              </ProtectedRoute>} />
            </Routes>
          </div>
        </ThemeProvider>
      </UserProvider>
  </BrowserRouter>
  )
}

export default App

