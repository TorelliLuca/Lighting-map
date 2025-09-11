"use client";

import { useState, useContext, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { User, LogOut, MapPin, ChevronDown, Bell, UserCircle, Building2, Users, Wrench } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion"; // Importo Framer Motion
import Logo from "./Logo";
import { translateUserType } from "../utils/utils";
import SearchBar from "./SearchBar";

// Custom hook per gestire il click all'esterno di un ref
const useClickOutside = (ref, callback) => {
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (ref.current && !ref.current.contains(event.target)) {
                callback();
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [ref, callback]);
};

// Componente Menu Utente (riutilizzabile)
const UserMenu = ({ userData, navigate, handleLogout, handleOrganizzazioniClick, handleMyOrganizationsClick }) => {
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const userMenuRef = useRef(null);

    useClickOutside(userMenuRef, () => setIsUserMenuOpen(false));

    return (
        <div className="relative" ref={userMenuRef}>
            <button
                className="flex items-center space-x-2 bg-blue-900/20 p-1.5 rounded-full border border-blue-500/30 hover:bg-blue-900/40 transition-colors duration-200 focus:outline-none"
                onClick={() => setIsUserMenuOpen((open) => !open)}
                aria-haspopup="true"
                aria-expanded={isUserMenuOpen}
            >
                <User className="h-5 w-5 text-blue-400" />
                <div className="flex flex-col items-start">
                    <span className="text-sm font-medium text-white">
                        {userData?.name} {userData?.surname}
                    </span>
                    <span className="text-xs text-blue-300">
                        {translateUserType(userData?.user_type) || "Utente"}
                    </span>
                </div>
                <ChevronDown className={`h-4 w-4 text-blue-400 ml-1 transition-transform duration-200 ${isUserMenuOpen ? "rotate-180" : "rotate-0"}`} />
            </button>
            <AnimatePresence>
                {isUserMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="absolute right-0 mt-2 w-56 bg-black border border-blue-500/30 rounded-lg shadow-lg z-50 overflow-hidden"
                    >
                        <ul className="py-2">
                            <li>
                                <button className="w-full text-left px-4 py-2 text-gray-400 cursor-not-allowed flex items-center gap-2" disabled>
                                    <Bell className="h-4 w-4" />
                                    Notifiche
                                    <span className="ml-auto text-xs bg-blue-700/30 text-blue-300 px-2 py-0.5 rounded">In arrivo</span>
                                </button>
                            </li>
                            <li>
                                <button className="w-full text-left px-4 py-2 text-gray-400 cursor-not-allowed flex items-center gap-2" disabled>
                                    <UserCircle className="h-4 w-4" />
                                    Profilo
                                    <span className="ml-auto text-xs bg-blue-700/30 text-blue-300 px-2 py-0.5 rounded">In arrivo</span>
                                </button>
                            </li>
                            <li>
                                <button className="w-full text-left px-4 py-2 hover:bg-blue-900/30 text-white flex items-center gap-2" onClick={handleMyOrganizationsClick}>
                                    <Building2 className="h-4 w-4" />
                                    La mia organizzazione
                                </button>
                            </li>
                            <li className="border-t border-blue-500/10 mt-2 pt-2">
                                <button className="w-full text-left px-4 py-2 text-red-400 hover:bg-red-900/30 flex items-center gap-2" onClick={handleLogout}>
                                    <LogOut className="h-4 w-4" />
                                    Disconnetti
                                </button>
                            </li>
                        </ul>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// Nuovo Componente Menu Città (riutilizzabile)
const CityOrganizationsMenu = ({ selectedCity, handleOrganizzazioniClick, isUserAdmin }) => {
    const [isCityMenuOpen, setIsCityMenuOpen] = useState(false);
    const cityMenuRef = useRef(null);

    useClickOutside(cityMenuRef, () => setIsCityMenuOpen(false));

    if (!isUserAdmin) {
        return (
            <div className="flex items-center space-x-2 bg-blue-900/20 px-3 py-1.5 rounded-lg border border-blue-500/30">
                <MapPin className="h-4 w-4 text-blue-400" />
                <span className="text-sm text-blue-300">{selectedCity}</span>
            </div>
        );
    }

    return (
        <div className="relative" ref={cityMenuRef}>
            <button
                className="flex items-center space-x-2 bg-blue-900/20 px-3 py-1.5 rounded-lg border border-blue-500/30 hover:bg-blue-900/40 transition-colors duration-200 focus:outline-none"
                onClick={() => setIsCityMenuOpen((open) => !open)}
                aria-haspopup="true"
                aria-expanded={isCityMenuOpen}
            >
                <MapPin className="h-4 w-4 text-blue-400" />
                <span className="text-sm text-blue-300">{selectedCity}</span>
                <ChevronDown className={`h-4 w-4 text-blue-400 transition-transform duration-200 ${isCityMenuOpen ? "rotate-180" : "rotate-0"}`} />
            </button>
            <AnimatePresence>
                {isCityMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="absolute left-0 mt-3 w-56 bg-black border border-blue-500/30 rounded-lg shadow-lg z-50 overflow-hidden"
                    >
                        <ul className="py-1">
                            <li>
                                <button className="w-full text-left px-4 py-2 hover:bg-blue-900/30 text-white flex items-center gap-2" onClick={handleOrganizzazioniClick}>
                                    <Users className="h-4 w-4" />
                                    Organizzazioni
                                </button>
                            </li>
                        </ul>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// Componente Header principale
function Header({
    UserContext,
    searchQuery,
    setSearchQuery,
    searchFilter,
    setSearchFilter,
    handleSearch,
    allMarkers,
    selectedCity,
    filteredSuggestions
}) {
    const { userData, clearUserData, logout } = useContext(UserContext);
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [searchHistory, setSearchHistory] = useState([]);

    const handleLogout = () => {
        logout();
        clearUserData();
        navigate("/");
    };

    const handleOrganizzazioniClick = () => {
        navigate("/organization-management", { state: { townhallId: selectedCity } });
    };

    const handleMyOrganizationsClick = () => {
        navigate("/my-organization");
    };

    const getUniqueSuggestions = () => {
        const query = searchQuery.trim().toLowerCase();
        let suggestions = allMarkers && allMarkers.length > 0 ? [...allMarkers] : [...filteredSuggestions];
        if (searchFilter === "NumeroPalo") {
            suggestions = suggestions.filter(marker => marker.data.marker === "PL");
        }
        const filtered = !query ? suggestions : suggestions.filter(marker => {
            const value = searchFilter === "NumeroPalo" ? String(marker.data.numero_palo) : searchFilter === "Quadro" ? String(marker.data.quadro) : String(marker.data.lotto);
            return value && value.toLowerCase().includes(query);
        });
        const uniqueValues = new Set();
        const uniqueSuggestions = [];
        filtered.forEach((marker) => {
            const value = searchFilter === "NumeroPalo" ? marker.data.numero_palo : searchFilter === "Quadro" ? marker.data.quadro : marker.data.lotto;
            if (!uniqueValues.has(value)) {
                uniqueValues.add(value);
                uniqueSuggestions.push(marker);
            }
        });
        return uniqueSuggestions.slice(0, 5);
    };

    const mappedSuggestions = getUniqueSuggestions().map(marker => ({
        type: searchFilter,
        value: searchFilter === "NumeroPalo" ? marker.data.numero_palo : searchFilter === "Quadro" ? marker.data.quadro : marker.data.lotto,
        address: marker.data.indirizzo || "",
    }));

    const addToHistory = (item) => {
        setSearchHistory((prev) => {
            if (prev.find(h => h.label === item.label)) return prev;
            return [item, ...prev].slice(0, 5);
        });
    };

    const handleSuggestionClick = (sugg) => {
        setSearchQuery(sugg.value);
        setIsLoading(true);
        handleSearch(sugg.value);
        setIsLoading(false);
        addToHistory({ label: `${sugg.type === "NumeroPalo" ? "PL n° " : sugg.type === "Quadro" ? "Quadro " : "Lotto "}${sugg.value}`, value: sugg.value });
    };

    const handleHistoryClick = (item) => {
        setSearchQuery(item.value);
        setIsLoading(true);
        handleSearch(item.value);
        setIsLoading(false);
    };

    const handleRemoveHistory = (item) => {
        setSearchHistory((prev) => prev.filter(h => h.label !== item.label));
    };

    const handleSubmit = (e) => {
        if (e && e.preventDefault) e.preventDefault();
        setIsLoading(true);
        handleSearch();
        setIsLoading(false);
    };

    const isUserAdmin = userData?.user_type === "SUPER_ADMIN" || userData?.user_type === "ADMINISTRATOR";

    return (
        <header className="top-0 bg-black/40 backdrop-blur-xl border-b border-blue-500/20 shadow-[0_0_15px_rgba(0,149,255,0.15)] p-4 relative z-3">
            <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center">
                    <Logo className="flex items-center" />
                </div>
                
                <div className="flex-1 max-w-md relative">
                    <SearchBar
                        searchQuery={searchQuery}
                        setSearchQuery={setSearchQuery}
                        searchFilter={searchFilter}
                        setSearchFilter={setSearchFilter}
                        suggestions={mappedSuggestions}
                        onSuggestionClick={handleSuggestionClick}
                        onSubmit={handleSubmit}
                        onClear={() => setSearchQuery("")}
                        history={searchHistory}
                        onHistoryClick={handleHistoryClick}
                        onRemoveHistory={handleRemoveHistory}
                        isLoading={isLoading}
                    />
                </div>

                <div className="flex items-center space-x-4">
                    {selectedCity && (
                        <CityOrganizationsMenu
                            selectedCity={selectedCity}
                            handleOrganizzazioniClick={handleOrganizzazioniClick}
                            isUserAdmin={isUserAdmin}
                        />
                    )}
                    <UserMenu
                        userData={userData}
                        navigate={navigate}
                        handleLogout={handleLogout}
                        handleOrganizzazioniClick={handleOrganizzazioniClick}
                        handleMyOrganizationsClick={handleMyOrganizationsClick}
                    />
                </div>
            </div>
        </header>
    );
}

export default Header;