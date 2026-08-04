"use client";

import React, { useState, useEffect, useContext } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import Login from "./pages/Login";
import SignIn from "./pages/SignIn";
import Dashboard from "./pages/Dashboard";
import Report from "./pages/Report";
import Operation from "./pages/Operation";
import { UserProvider, UserContext } from "./context/UserContext";
import { PwaProvider } from "./context/PwaContext";
import { PushNotificationsProvider } from "./context/PushNotificationsContext";
import ProtectedRoute from "./components/ProtectedRoute";
import ConfirmEmail from "./pages/ConfirmEmail";
import ResetPassword from "./pages/ResetPassword";
import MyOrganization from "./pages/MyOrganization";
import OrganizationManagement from "./pages/OrganizationManagement";
import NotFound from "./pages/NotFound";
import Manual from "./pages/Manual";
import { PwaBootstrap } from "./components/PwaBootstrap";

const basePath = import.meta.env.VITE_PUBLIC_URL || "";

// Mappatura delle rotte con i titoli corrispondenti
const routeTitles = {
    "/": "Login | LightingMap",
    "/login": "Login | LightingMap",
    "/signin": "Registrati | LightingMap",
    "/confirm-email": "Conferma Email | LightingMap",
    "/reset-password": "Reset Password | LightingMap",
    "/dashboard": "Dashboard | LightingMap",
    "/report": "Report | LightingMap",
    "/operation": "Operazioni | LightingMap",
    "/my-organization": "La mia Organizzazione | LightingMap",
    "/organization-management": "Gestione Organizzazioni | LightingMap",
    "/manual": "Manuale | LightingMap",
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
        let link = document.querySelector("link[rel='icon']");
        if (!link) {
            link = document.createElement('link');
            link.rel = 'icon';
            document.head.appendChild(link);
        }
        link.type = 'image/png';

        const updateFavicon = (isDark) => {
            const basePath = import.meta.env.BASE_URL || '/';
            link.href = isDark ? `${basePath}faviconWhite.png` : `${basePath}faviconDark.png`;
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
        <BrowserRouter basename={basePath}>
            <UserProvider>
                <PwaProvider>
                    <PushNotificationsProvider>
                        <AppContent />
                    </PushNotificationsProvider>
                </PwaProvider>
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
            <PwaBootstrap />
            <Routes>
                <Route path="/" element={<Login />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signin" element={<SignIn />} />
                <Route path="/confirm-email" element={<ConfirmEmail />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/manual" element={<Manual />} />
                
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