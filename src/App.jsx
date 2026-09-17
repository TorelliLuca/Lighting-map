"use client";

import React, { useState, useEffect, useContext } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import Login from "./pages/Login";
import SignIn from "./pages/SignIn";
import Dashboard from "./pages/Dashboard";
import Report from "./pages/Report";
import Operation from "./pages/Operation";
import Inspection from "./pages/Inspection";
import Quote from "./pages/Quote";
import QuoteReview from "./pages/QuoteReview";
import Consuntivo from "./pages/Consuntivo";
import ConsuntivoReview from "./pages/ConsuntivoReview";
import ConsuntiviList from "./pages/ConsuntiviList";
import ExtraordinaryDashboard from "./pages/ExtraordinaryDashboard";
import PlantStatus from "./pages/PlantStatus";
import Todo from "./pages/Todo";
import QuotesDrafts from "./pages/QuotesDrafts";
import QuotesApproval from "./pages/QuotesApproval";
import { UserProvider } from "./context/UserContext";
import { PwaProvider } from "./context/PwaContext";
import { PushNotificationsProvider } from "./context/PushNotificationsContext";
import { ProductTourProvider } from "./hooks/useProductTour.jsx";
import ProtectedRoute from "./components/ProtectedRoute";
import RequireComuneAccess from "./components/RequireComuneAccess";
import ConfirmEmail from "./pages/ConfirmEmail";
import ResetPassword from "./pages/ResetPassword";
import MyOrganization from "./pages/MyOrganization";
import OrganizationManagement from "./pages/OrganizationManagement";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import Manual from "./pages/Manual";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import CookiePolicy from "./pages/CookiePolicy";
import { PwaBootstrap } from "./components/PwaBootstrap";
import PageTourHost from "./components/PageTourHost";
import TourReplayBridge from "./components/TourReplayBridge";

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
    "/inspection": "Sopralluogo | LightingMap",
    "/quote": "Preventivo IMS | LightingMap",
    "/quotes": "Bozze preventivi | LightingMap",
    "/consuntivi": "Consuntivi IMS | LightingMap",
    "/extraordinary": "Straordinarie | LightingMap",
    "/plant-status": "Stato impianto | LightingMap",
    "/todo": "TODO | LightingMap",
    "/my-organization": "La mia Organizzazione | LightingMap",
    "/organization-management": "Gestione Organizzazioni | LightingMap",
    "/profile": "Profilo | LightingMap",
    "/manual": "Manuale | LightingMap",
    "/privacy": "Privacy | LightingMap",
    "/cookie": "Cookie | LightingMap",
};

// Hook per gestire dinamicamente il titolo della pagina
const usePageTitle = () => {
    const location = useLocation();
    useEffect(() => {
        const path = location.pathname;
        let title = routeTitles[path] || "Lighting Map";
        if (path.startsWith("/quote/") && path.endsWith("/review")) {
            title = "Revisione preventivo | LightingMap";
        } else if (path.startsWith("/consuntivo/") && path.endsWith("/review")) {
            title = "Revisione consuntivo | LightingMap";
        } else if (path.startsWith("/quotes/approval")) {
            title = "Approvazione IMS | LightingMap";
        } else if (path.startsWith("/consuntivi")) {
            title = "Consuntivi IMS | LightingMap";
        } else if (path.startsWith("/consuntivo/")) {
            title = "Consuntivo IMS | LightingMap";
        } else if (path.startsWith("/quote/") && path.endsWith("/consuntivo")) {
            title = "Consuntivo IMS | LightingMap";
        } else if (path.startsWith("/quote/") && path !== "/quote") {
            title = "Preventivo IMS | LightingMap";
        }
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
        <ProductTourProvider>
            <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
                <PwaBootstrap />
                <TourReplayBridge />
                <PageTourHost />
                <Routes>
                    <Route path="/" element={<Login />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/signin" element={<SignIn />} />
                    <Route path="/confirm-email" element={<ConfirmEmail />} />
                    <Route path="/reset-password" element={<ResetPassword />} />
                    <Route path="/manual" element={<Manual />} />
                    <Route path="/privacy" element={<PrivacyPolicy />} />
                    <Route path="/cookie" element={<CookiePolicy />} />
                    
                    {/* Rotte protette */}
                    <Route element={<ProtectedRoute />}>
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/profile" element={<Profile />} />
                        <Route path="/my-organization" element={<MyOrganization />} />
                        <Route path="/organization-management" element={<OrganizationManagement />} />
                        <Route path="/quote/:id/review" element={<QuoteReview />} />
                        <Route path="/quote/:id/consuntivo" element={<Consuntivo />} />
                        <Route path="/consuntivo/:id/review" element={<ConsuntivoReview />} />
                        <Route path="/consuntivo/:id" element={<Consuntivo />} />
                        <Route path="/quote/:id" element={<Quote />} />

                        {/* Pagine scoped a ?comune= — accesso solo se comune in lista utente */}
                        <Route element={<RequireComuneAccess />}>
                            <Route path="/report" element={<Report />} />
                            <Route path="/operation" element={<Operation />} />
                            <Route path="/inspection" element={<Inspection />} />
                            <Route path="/quote" element={<Quote />} />
                            <Route path="/quotes/approval" element={<QuotesApproval />} />
                            <Route path="/quotes" element={<QuotesDrafts />} />
                            <Route path="/consuntivi" element={<ConsuntiviList />} />
                            <Route path="/extraordinary" element={<ExtraordinaryDashboard />} />
                            <Route path="/plant-status" element={<PlantStatus />} />
                            <Route path="/todo" element={<Todo />} />
                        </Route>
                    </Route>

                    {/* Catch-all per rotte non trovate */}
                    <Route path="*" element={<NotFound/>} />
                </Routes>
            </div>
        </ProductTourProvider>
    );
};

export default App;