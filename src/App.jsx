"use client";

import React, { useState, useEffect, useContext } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import Login from "./pages/Login";
import SignIn from "./pages/SignIn";
import Dashboard from "./pages/Dashboard";
import Report from "./pages/Report";
import Operation from "./pages/Operation";
import { UserProvider, UserContext } from "./context/UserContext";
import ProtectedRoute from "./components/ProtectedRoute";
import ConfirmEmail from "./pages/ConfirmEmail";
import ResetPassword from "./pages/ResetPassword";
import MyOrganization from "./pages/MyOrganization";
import OrganizationManagement from "./pages/OrganizationManagement";
import NotFound from "./pages/NotFound";

// Mappatura delle rotte con i titoli corrispondenti
const routeTitles = {
    "/": "Login | Lighting Map",
    "/login": "Login | Lighting Map",
    "/signin": "Registrati | Lighting Map",
    "/confirm-email": "Conferma Email | Lighting Map",
    "/reset-password": "Reset Password | Lighting Map",
    "/dashboard": "Dashboard | Lighting Map",
    "/report": "Report | Lighting Map",
    "/operation": "Operazioni | Lighting Map",
    "/my-organization": "La mia Organizzazione | Lighting Map",
    "/organization-management": "Gestione Organizzazioni | Lighting Map",
};

// Hook per gestire dinamicamente il titolo della pagina
const usePageTitle = () => {
    const location = useLocation();
    useEffect(() => {
        const title = routeTitles[location.pathname] || "Lighting Map";
        document.title = title;
    }, [location.pathname]);
};

// Hook per gestire la favicon in base al tema del sistema
const useFavicon = () => {
    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const link = document.querySelector("link[rel*='icon']") || document.createElement('link');
        link.rel = 'shortcut icon';
        link.type = 'image/png';
        document.head.appendChild(link);

        const updateFavicon = (isDark) => {
            const basePath = import.meta.env.VITE_PUBLIC_URL || "";
            link.href = isDark ? `${basePath}/faviconWhite.png` : `${basePath}/faviconDark.png`;
        };

        const handleChange = (e) => updateFavicon(e.matches);

        // Imposta la favicon iniziale
        updateFavicon(mediaQuery.matches);

        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, []);
};

// Main App Component
function App() {
    useFavicon();

    return (
        <BrowserRouter basename="/LIGHTING-MAP">
            <UserProvider>
                <AppContent />
            </UserProvider>
        </BrowserRouter>
    );
}

// Componente contenitore per le rotte e il contesto
// Separiamo questo componente per poter usare useLocation all'interno del BrowserRouter
const AppContent = () => {
    usePageTitle();

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
            <Routes>
                <Route path="/" element={<Login />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signin" element={<SignIn />} />
                <Route path="/confirm-email" element={<ConfirmEmail />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                
                {/* Rotte protette */}
                <Route element={<ProtectedRoute />}>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/my-organization" element={<MyOrganization />} />
                    <Route path="/organization-management" element={<OrganizationManagement />} />
                    <Route path="/report" element={<Report />} />
                    <Route path="/operation" element={<Operation />} />
                </Route>

                {/* Catch-all per rotte non trovate */}
                <Route path="*" element={<NotFound/>} />
            </Routes>
        </div>
    );
};

export default App;