"use client";

import React, { useEffect, useState } from "react";
import { useNavigate, useOutlet } from "react-router-dom"; // Importo useOutlet
import { useUser } from "../context/UserContext";
import { Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function ProtectedRoute() { // Non riceve più children come prop
    const { userData, token, loading, fetchUserProfile } = useUser();
    const navigate = useNavigate();
    const outlet = useOutlet(); // Ottengo il componente da renderizzare
    const [isCheckingAuth, setIsCheckingAuth] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        // Attendi l'idratazione dello storage in UserProvider prima di decidere
        if (loading) {
            return;
        }

        const checkAuthStatus = async () => {
            setIsCheckingAuth(true);
            try {
                if (!token) {
                    navigate("/login");
                    return;
                }
                if (!userData) {
                    await fetchUserProfile();
                }
            } catch (err) {
                console.error("Errore nel recupero del profilo:", err);
                setError("Sessione scaduta o non valida. Effettua nuovamente il login.");
                setTimeout(() => {
                    navigate("/login");
                }, 2000);
            } finally {
                setIsCheckingAuth(false);
            }
        };

        checkAuthStatus();
    }, [token, userData, fetchUserProfile, navigate, loading]);

    if (loading || isCheckingAuth) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-b from-gray-900 to-black text-white p-4 text-center">
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                >
                    <Loader2 className="h-10 w-10 animate-spin text-blue-500 mb-4" />
                </motion.div>
                <motion.h2 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="text-lg font-semibold"
                >
                    Verifica in corso...
                </motion.h2>
            </div>
        );
    }
    
    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-screen p-4 text-center bg-gradient-to-b from-gray-900 to-black text-white">
                <AnimatePresence>
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.3 }}
                        className="bg-red-900/40 border border-red-500/50 p-6 rounded-lg shadow-xl text-red-300"
                    >
                        <h3 className="text-xl font-bold mb-2">Errore di Autenticazione</h3>
                        <p>{error}</p>
                    </motion.div>
                </AnimatePresence>
            </div>
        );
    }

    // Se l'utente è autenticato, renderizza l'Outlet che contiene il componente figlio (es. Dashboard)
    return token && userData ? outlet : null;
}