"use client";

import { useState, useContext, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  User,
  LogOut,
  MapPin,
  ChevronDown,
  ChevronLeft,
  Bell,
  UserCircle,
  Building2,
  Users,
  CheckCheck,
  HelpCircle,
  Info,
  FileSpreadsheet,
  ClipboardCheck,
  ListTodo,
  Shield,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import Logo from "./Logo";
import { canApproveQuoteByRole, canManageQuotesByRole, translateUserType } from "../utils/utils";
import SearchBar from "./SearchBar";
import { api } from "../context/UserContext";
import { usePushNotifications } from "../context/PushNotificationsContext";
import { resolveNotificationNavigateTarget } from "../utils/notificationDeepLinks";
import { syncAppBadge, clearAppBadge } from "../utils/appBadge";

const UNREAD_POLL_MS = 60_000;

const useClickOutside = (ref, callback) => {
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        callback(event);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [ref, callback]);
};

function formatNotificationDate(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString("it-IT", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

const NotificationsPanel = ({
  onBack,
  onCloseMenu,
  unreadCount,
  setUnreadCount,
}) => {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const {
    isSupported: isPushSupported,
    isSubscribed,
    permission: pushPermission,
    loading: pushLoading,
    enable: enablePush,
    disable: disablePush,
  } = usePushNotifications();

  const pushDenied = pushPermission === "denied";

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/api/notifications", { params: { limit: 40 } });
      setItems(data.items || []);
      setUnreadCount(data.unreadCount ?? 0);
    } catch (err) {
      console.error("Error loading notifications:", err);
      toast.error("Impossibile caricare le notifiche");
    } finally {
      setLoading(false);
    }
  }, [setUnreadCount]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleTogglePush = async () => {
    try {
      if (isSubscribed) {
        await disablePush();
        toast.success("Notifiche push disattivate");
      } else {
        await enablePush();
        toast.success("Notifiche push attivate");
      }
    } catch (error) {
      toast.error(error.message || "Impossibile aggiornare le notifiche");
    }
  };

  const handleMarkOne = async (id) => {
    try {
      await api.patch(`/api/notifications/${id}/read`);
      setItems((prev) =>
        prev.map((n) => (n._id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (err) {
      console.error("Error marking notification read:", err);
    }
  };

  const handleMarkAll = async () => {
    try {
      await api.patch("/api/notifications/read-all");
      setItems((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
      toast.success("Tutte le notifiche segnate come lette");
    } catch (err) {
      console.error("Error marking all read:", err);
      toast.error("Impossibile aggiornare le notifiche");
    }
  };

  const handleNotificationClick = async (n) => {
    if (!n.read) {
      await handleMarkOne(n._id);
    }
    const target = resolveNotificationNavigateTarget(n);
    if (target) {
      onCloseMenu?.();
      navigate(target);
    }
  };

  return (
    <div className="flex flex-col max-h-[min(70vh,420px)]">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-blue-500/20">
        <button
          type="button"
          onClick={onBack}
          className="p-1 rounded-md text-blue-300 hover:bg-blue-900/40 hover:text-white transition-colors"
          aria-label="Torna al menu"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-medium text-white flex-1">Notifiche</span>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={handleMarkAll}
            className="text-[11px] text-blue-300 hover:text-white flex items-center gap-1 px-2 py-1 rounded-md hover:bg-blue-900/40 transition-colors"
            title="Segna tutte come lette"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Segna lette
          </button>
        )}
      </div>

      {isPushSupported && (
        <div className="px-4 py-3 border-b border-blue-500/15 space-y-1">
          <div className="flex items-center justify-between gap-3">
            <span className="text-blue-200 text-sm font-medium flex items-center gap-1.5">
              <Bell className="h-3.5 w-3.5" />
              Notifiche push
            </span>
            <button
              type="button"
              onClick={handleTogglePush}
              disabled={pushLoading || pushDenied}
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                isSubscribed ? "bg-blue-600" : "bg-gray-400"
              }`}
              aria-pressed={isSubscribed}
              title={pushDenied ? "Permesso notifiche bloccato dal browser" : undefined}
            >
              <span className="sr-only">Attiva/disattiva notifiche push</span>
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  isSubscribed ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
          {pushDenied && (
            <p className="text-[11px] text-amber-300/90">
              Permesso bloccato: abilitalo dalle impostazioni del browser.
            </p>
          )}
        </div>
      )}

      <div className="overflow-y-auto flex-1 py-1 scrollbar-app">
        {loading && (
          <p className="px-4 py-6 text-center text-sm text-blue-300/70">Caricamento…</p>
        )}
        {!loading && items.length === 0 && (
          <p className="px-4 py-6 text-center text-sm text-blue-300/70">
            Nessuna notifica
          </p>
        )}
        {!loading &&
          items.map((n) => {
            const target = resolveNotificationNavigateTarget(n);
            return (
            <button
              key={n._id}
              type="button"
              onClick={() => handleNotificationClick(n)}
              className={`w-full text-left px-4 py-2.5 border-l-2 transition-colors ${
                target ? "cursor-pointer" : "cursor-default"
              } ${
                n.read
                  ? "border-transparent text-blue-200/55 hover:bg-blue-900/20"
                  : "border-blue-500 bg-blue-950/40 text-white hover:bg-blue-900/40"
              }`}
            >
              <div className="flex items-start gap-2">
                {!n.read && (
                  <span
                    className="mt-1.5 h-2 w-2 rounded-full bg-blue-400 shrink-0 shadow-[0_0_6px_rgba(96,165,250,0.8)]"
                    aria-hidden
                  />
                )}
                <div className={`min-w-0 flex-1 ${n.read ? "pl-4" : ""}`}>
                  <p
                    className={`text-sm leading-snug ${
                      n.read ? "font-normal" : "font-semibold"
                    }`}
                  >
                    {n.title}
                  </p>
                  <p
                    className={`text-xs mt-0.5 line-clamp-2 ${
                      n.read ? "text-blue-300/45" : "text-blue-200/80"
                    }`}
                  >
                    {n.body}
                  </p>
                  <p className="text-[10px] text-blue-400/50 mt-1">
                    {formatNotificationDate(n.createdAt)}
                  </p>
                </div>
              </div>
            </button>
            );
          })}
      </div>
    </div>
  );
};

const ILLUMINAZIONE_PUBBLICA_URL =
  "https://www.torellistudio.com/studio/category/illuminazione-pubblica/";

const UserMenu = ({
  userData,
  handleLogout,
  handleMyOrganizationsClick,
}) => {
  const navigate = useNavigate();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [view, setView] = useState("main"); // 'main' | 'notifications'
  const [unreadCount, setUnreadCount] = useState(0);
  const userMenuRef = useRef(null);

  useClickOutside(userMenuRef, () => {
    setIsUserMenuOpen(false);
    setView("main");
  });

  const fetchUnreadCount = useCallback(async () => {
    if (!userData?.id) return;
    try {
      const { data } = await api.get("/api/notifications/unread-count");
      setUnreadCount(data.unreadCount ?? 0);
    } catch {
      // silenzioso: badge non critico
    }
  }, [userData?.id]);

  useEffect(() => {
    fetchUnreadCount();
    const id = setInterval(fetchUnreadCount, UNREAD_POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") fetchUnreadCount();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [fetchUnreadCount]);

  useEffect(() => {
    syncAppBadge(unreadCount);
  }, [unreadCount]);

  useEffect(() => {
    if (!isUserMenuOpen) setView("main");
  }, [isUserMenuOpen]);

  return (
    <div className="relative" ref={userMenuRef} data-tour="user-menu">
      <button
        className="relative flex items-center space-x-2 bg-transparent p-1.5 rounded-xl border border-transparent hover:bg-blue-900/40 transition-colors duration-200 focus:outline-none"
        onClick={() => setIsUserMenuOpen((open) => !open)}
        aria-haspopup="true"
        aria-expanded={isUserMenuOpen}
      >
        <User className="h-5 w-5 text-blue-400" />
        <div className="flex flex-col">
          <span className="text-sm font-medium text-white">
            {userData?.name} {userData?.surname}
          </span>
          <span className="text-xs text-blue-300">
            {translateUserType(userData?.user_type, userData?.sub_role) || "Utente"}
          </span>
        </div>
        <ChevronDown
          className={`h-4 w-4 text-blue-400 ml-1 transition-transform duration-200 ${
            isUserMenuOpen ? "rotate-180" : "rotate-0"
          }`}
        />

      </button>
      <AnimatePresence>
        {isUserMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className={`absolute right-0 mt-2 bg-black border border-blue-500/30 rounded-lg shadow-lg z-50 overflow-hidden ${
              view === "notifications" ? "w-80" : "w-56"
            }`}
          >
            {view === "main" ? (
              <ul className="py-2">
                <li>
                  <button
                    type="button"
                    className="relative w-full text-left px-4 py-2 hover:bg-blue-900/30 text-white flex items-center gap-2"
                    onClick={() => setView("notifications")}
                  >
                    <Bell className="h-4 w-4" />
                    Notifiche
                    {unreadCount > 0 && (
                      <span className="absolute top-1.5 right-3 h-2 w-2 rounded-full bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.9)]" />
                    )}
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    className="w-full text-left px-4 py-2 hover:bg-blue-900/30 text-white flex items-center gap-2 cursor-pointer"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      navigate("/profile");
                    }}
                  >
                    <UserCircle className="h-4 w-4" />
                    Profilo
                  </button>
                </li>
                <li>
                  <button
                    className="w-full text-left px-4 py-2 hover:bg-blue-900/30 text-white flex items-center gap-2"
                    onClick={handleMyOrganizationsClick}
                  >
                    <Building2 className="h-4 w-4" />
                    La mia organizzazione
                  </button>
                </li>
                <li className="border-t border-blue-500/10 mt-2 pt-2">
                  <button
                    type="button"
                    className="w-full text-left px-4 py-2 hover:bg-blue-900/30 text-white flex items-center gap-2"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      navigate("/manual");
                    }}
                  >
                    <HelpCircle className="h-4 w-4" />
                    Manuale operativo
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    className="w-full text-left px-4 py-2 hover:bg-blue-900/30 text-white flex items-center gap-2"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      navigate("/privacy");
                    }}
                  >
                    <Shield className="h-4 w-4" />
                    Privacy
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    className="w-full text-left px-4 py-2 hover:bg-blue-900/30 text-white flex items-center gap-2"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      window.open(ILLUMINAZIONE_PUBBLICA_URL, "_blank", "noopener,noreferrer");
                    }}
                  >
                    <Info className="h-4 w-4" />
                    Scopri di più
                  </button>
                </li>
                <li className="border-t border-blue-500/10 mt-2 pt-2">
                  <button
                    className="w-full text-left px-4 py-2 text-red-400 hover:bg-red-900/30 flex items-center gap-2"
                    onClick={handleLogout}
                  >
                    <LogOut className="h-4 w-4" />
                    Disconnetti
                  </button>
                </li>
              </ul>
            ) : (
              <NotificationsPanel
                onBack={() => setView("main")}
                onCloseMenu={() => {
                  setIsUserMenuOpen(false);
                  setView("main");
                }}
                unreadCount={unreadCount}
                setUnreadCount={setUnreadCount}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const CityOrganizationsMenu = ({
  selectedCity,
  handleOrganizzazioniClick,
  handlePreventiviClick,
  handleConsuntiviClick,
  handleTodoClick,
  handleApprovazioneClick,
  isUserAdmin,
  canManageQuotes,
}) => {
  const [isCityMenuOpen, setIsCityMenuOpen] = useState(false);
  const cityMenuRef = useRef(null);

  useClickOutside(cityMenuRef, (event) => {
    if (event?.target?.closest?.(".driver-popover, .driver-overlay, .driver-active-element")) {
      return;
    }
    setIsCityMenuOpen(false);
  });

  useEffect(() => {
    const open = () => setIsCityMenuOpen(true);
    const close = () => setIsCityMenuOpen(false);
    window.addEventListener("lighting-map:org-menu-open", open);
    window.addEventListener("lighting-map:org-menu-close", close);
    return () => {
      window.removeEventListener("lighting-map:org-menu-open", open);
      window.removeEventListener("lighting-map:org-menu-close", close);
    };
  }, []);

  const showMenu = isUserAdmin || canManageQuotes;

  if (!showMenu) {
    return (
      <div className="flex items-center space-x-2 bg-transparent px-3  rounded-xl border-transparent">
        <MapPin className="h-4 w-4 text-blue-400" />
        <span className="text-sm text-blue-300">{selectedCity}</span>
      </div>
    );
  }

  return (
    <div className="relative" ref={cityMenuRef} data-tour="org-menu">
      <button
        className="flex items-center space-x-2 bg-transparent px-3 rounded-xl  border-transparent hover:bg-blue-900/40 transition-colors duration-200 focus:outline-none"
        onClick={() => setIsCityMenuOpen((open) => !open)}
        aria-haspopup="true"
        aria-expanded={isCityMenuOpen}
      >
        <MapPin className="h-4 w-4 text-blue-400" />
        <span className="text-sm text-white">{selectedCity}</span>
        <ChevronDown
          className={`h-4 w-4 text-blue-400 transition-transform duration-200 ${
            isCityMenuOpen ? "rotate-180" : "rotate-0"
          }`}
        />
      </button>
      <div
        className={`absolute left-0 mt-3 w-56 bg-black border border-blue-500/30 rounded-lg shadow-lg z-50 overflow-hidden transition-all duration-200 origin-top-left ${
          isCityMenuOpen
            ? "opacity-100 scale-100 pointer-events-auto"
            : "opacity-0 scale-95 pointer-events-none"
        }`}
        aria-hidden={!isCityMenuOpen}
      >
            <ul className="py-1">
              {canManageQuotes && (
                <li>
                  <button
                    type="button"
                    data-tour="org-preventivi"
                    className="w-full text-left px-4 py-2 hover:bg-blue-900/30 text-white flex items-center gap-2"
                    onClick={() => {
                      setIsCityMenuOpen(false);
                      handlePreventiviClick?.();
                    }}
                  >
                    <FileSpreadsheet className="h-4 w-4" />
                    Preventivi IMS
                  </button>
                </li>
              )}
              {canManageQuotes && (
                <li>
                  <button
                    type="button"
                    data-tour="org-consuntivi"
                    className="w-full text-left px-4 py-2 hover:bg-blue-900/30 text-white flex items-center gap-2"
                    onClick={() => {
                      setIsCityMenuOpen(false);
                      handleConsuntiviClick?.();
                    }}
                  >
                    <FileSpreadsheet className="h-4 w-4 text-amber-400" />
                    Consuntivi IMS
                  </button>
                </li>
              )}
              {canManageQuotes && (
                <li>
                  <button
                    type="button"
                    data-tour="org-todo"
                    className="w-full text-left px-4 py-2 hover:bg-blue-900/30 text-white flex items-center gap-2"
                    onClick={() => {
                      setIsCityMenuOpen(false);
                      handleTodoClick?.();
                    }}
                  >
                    <ListTodo className="h-4 w-4 text-emerald-400" />
                    TODO
                  </button>
                </li>
              )}
              {isUserAdmin && (
                <li>
                  <button
                    type="button"
                    data-tour="org-approvazione"
                    className="w-full text-left px-4 py-2 hover:bg-blue-900/30 text-white flex items-center gap-2"
                    onClick={() => {
                      setIsCityMenuOpen(false);
                      handleApprovazioneClick?.();
                    }}
                  >
                    <ClipboardCheck className="h-4 w-4" />
                    Approvazione IMS
                  </button>
                </li>
              )}
              {isUserAdmin && (
                <li>
                  <button
                    type="button"
                    data-tour="org-organizzazioni"
                    className="w-full text-left px-4 py-2 hover:bg-blue-900/30 text-white flex items-center gap-2"
                    onClick={() => {
                      setIsCityMenuOpen(false);
                      handleOrganizzazioniClick();
                    }}
                  >
                    <Users className="h-4 w-4" />
                    Organizzazioni
                  </button>
                </li>
              )}
            </ul>
      </div>
    </div>
  );
};

function Header({
  UserContext,
  searchQuery,
  setSearchQuery,
  searchFilter,
  setSearchFilter,
  handleSearch,
  allMarkers,
  selectedCity,
  filteredSuggestions,
  interactionsDisabled = false,
}) {
  const { userData, clearUserData, logout } = useContext(UserContext);
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [searchHistory, setSearchHistory] = useState([]);

  const handleLogout = () => {
    clearAppBadge();
    logout();
    clearUserData();
    navigate("/");
  };

  const handleOrganizzazioniClick = () => {
    navigate("/organization-management", { state: { townhallId: selectedCity } });
  };

  const handlePreventiviClick = () => {
    const qs = selectedCity ? `?comune=${encodeURIComponent(selectedCity)}` : "";
    navigate(`/quotes${qs}`);
  };

  const handleConsuntiviClick = () => {
    const qs = selectedCity ? `?comune=${encodeURIComponent(selectedCity)}` : "";
    navigate(`/consuntivi${qs}`);
  };

  const handleTodoClick = () => {
    const qs = selectedCity ? `?comune=${encodeURIComponent(selectedCity)}` : "";
    navigate(`/todo${qs}`);
  };

  const handleApprovazioneClick = () => {
    const qs = selectedCity ? `?comune=${encodeURIComponent(selectedCity)}` : "";
    navigate(`/quotes/approval${qs}`);
  };

  const handleMyOrganizationsClick = () => {
    navigate("/my-organization");
  };

  const getUniqueSuggestions = () => {
    const query = searchQuery.trim().toLowerCase();
    let suggestions = allMarkers && allMarkers.length > 0 ? [...allMarkers] : [...filteredSuggestions];
    if (searchFilter === "NumeroPalo") {
      suggestions = suggestions.filter((marker) => marker.data.marker === "PL");
    }
    const filtered = !query
      ? suggestions
      : suggestions.filter((marker) => {
          const value =
            searchFilter === "NumeroPalo"
              ? String(marker.data.numero_palo)
              : searchFilter === "Quadro"
                ? String(marker.data.quadro)
                : String(marker.data.lotto);
          return value && value.toLowerCase().includes(query);
        });
    const uniqueValues = new Set();
    const uniqueSuggestions = [];
    filtered.forEach((marker) => {
      const value =
        searchFilter === "NumeroPalo"
          ? marker.data.numero_palo
          : searchFilter === "Quadro"
            ? marker.data.quadro
            : marker.data.lotto;
      if (!uniqueValues.has(value)) {
        uniqueValues.add(value);
        uniqueSuggestions.push(marker);
      }
    });
    return uniqueSuggestions.slice(0, 5);
  };

  const mappedSuggestions = getUniqueSuggestions().map((marker) => ({
    type: searchFilter,
    value:
      searchFilter === "NumeroPalo"
        ? marker.data.numero_palo
        : searchFilter === "Quadro"
          ? marker.data.quadro
          : marker.data.lotto,
    address: marker.data.indirizzo || "",
  }));

  const addToHistory = (item) => {
    setSearchHistory((prev) => {
      if (prev.find((h) => h.label === item.label)) return prev;
      return [item, ...prev].slice(0, 5);
    });
  };

  const handleSuggestionClick = (sugg) => {
    setSearchQuery(sugg.value);
    setIsLoading(true);
    handleSearch(sugg.value);
    setIsLoading(false);
    addToHistory({
      label: `${sugg.type === "NumeroPalo" ? "PL n° " : sugg.type === "Quadro" ? "Quadro " : "Lotto "}${sugg.value}`,
      value: sugg.value,
    });
  };

  const handleHistoryClick = (item) => {
    setSearchQuery(item.value);
    setIsLoading(true);
    handleSearch(item.value);
    setIsLoading(false);
  };

  const handleRemoveHistory = (item) => {
    setSearchHistory((prev) => prev.filter((h) => h.label !== item.label));
  };

  const handleSubmit = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setIsLoading(true);
    handleSearch();
    setIsLoading(false);
  };

  const isUserAdmin = canApproveQuoteByRole(userData);
  const canManageQuotes = canManageQuotesByRole(userData);

  return (
    <header className="app-titlebar top-0 bg-black/40 backdrop-blur-xl border-b border-blue-500/20 shadow-[0_0_15px_rgba(0,149,255,0.15)] p-2 relative z-20">
      <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center shrink-0 app-titlebar-drag">
          <Logo className="cursor-pointer h-17 sm:h-17 md:h-18 lg:h-18 flex items-center transition-all duration-300" />
        </div>

        <div className="flex-1 max-w-md relative app-titlebar-no-drag">
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
            disabled={interactionsDisabled}
          />
        </div>

        <div className="flex items-center space-x-4 app-titlebar-no-drag">
          {selectedCity && (
            <CityOrganizationsMenu
              selectedCity={selectedCity}
              handleOrganizzazioniClick={handleOrganizzazioniClick}
              handlePreventiviClick={handlePreventiviClick}
              handleConsuntiviClick={handleConsuntiviClick}
              handleTodoClick={handleTodoClick}
              handleApprovazioneClick={handleApprovazioneClick}
              isUserAdmin={isUserAdmin}
              canManageQuotes={canManageQuotes}
            />
          )}
          <UserMenu
            userData={userData}
            handleLogout={handleLogout}
            handleMyOrganizationsClick={handleMyOrganizationsClick}
          />
        </div>
      </div>
    </header>
  );
}

export default Header;
