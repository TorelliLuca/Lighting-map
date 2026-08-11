"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Building2,
  MapPin,
  Calendar,
  Users,
  User,
  Clock,
  Tag,
  Mail,
  ExternalLink,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../context/UserContext";
import toast from "react-hot-toast";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import MembersModal from "../components/MembersModal"; // Importa il componente modale

const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_API;
const MAPTILER_STYLE = `https://api.maptiler.com/maps/streets/style.json?key=${MAPTILER_KEY}`;

function MyOrganization() {
  const [isLoading, setIsLoading] = useState(true);
  const [backendLoading, setBackendLoading] = useState(false);
  const [backendError, setBackendError] = useState(null);
  const [backendData, setBackendData] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false); // Stato per il modale
  const mapContainer = useRef(null);
  const map = useRef(null);
  const navigate = useNavigate();
  const { userData, getOrganizationByUserId } = useUser();

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 300);
    return () => clearTimeout(timer);
  }, []);

  // Hook per il fetching dei dati
  const fetchOrganizationDetails = async () => {
    if (!userData) return;
    setBackendLoading(true);
    setBackendError(null);
    try {
      const response = await getOrganizationByUserId(userData.id_organization);
      if (response && response.data) {
        setBackendData(response.data);
      }
    } catch (error) {
      setBackendError(error.message || "Errore sconosciuto");
      toast.error(`Errore: ${error.message}` || "Errore sconosciuto");
    } finally {
      setBackendLoading(false);
    }
  };

  useEffect(() => {
    if (userData) {
      fetchOrganizationDetails();
    }
  }, [userData]);

  // Nuovo hook dedicato all'inizializzazione della mappa
  useEffect(() => {
    if (!backendData?.location || !mapContainer.current) {
      return;
    }

    if (map.current) {
      map.current.remove();
    }

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: MAPTILER_STYLE,
      center: [backendData.location.coordinates[0], backendData.location.coordinates[1]],
      zoom: 15,
      attributionControl: false,
    });

    new maplibregl.Marker({
      color: "#3b82f6",
    })
      .setLngLat([backendData.location.coordinates[0], backendData.location.coordinates[1]])
      .addTo(map.current);

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [backendData]);

  const handleBackClick = () => {
    navigate("/dashboard");
  };

  const handleRetry = () => {
    fetchOrganizationDetails();
  };

  const formatDate = (date) => {
    if (!date) return "";
    return new Date(date).toLocaleDateString("it-IT", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getTypeLabel = (type) => {
    switch (type) {
      case "TOWNHALL":
        return "Comune";
      case "ENTERPRISE":
        return "Impresa";
      default:
        return "";
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case "TOWNHALL":
        return "bg-green-900/20 text-green-400 border-green-500/30";
      case "ENTERPRISE":
        return "bg-blue-900/20 text-blue-400 border-blue-500/30";
      default:
        return "bg-gray-900/20 text-gray-400 border-gray-500/30";
    }
  };

  const openMembersModal = () => {
    setIsModalOpen(true);
  };

  const closeMembersModal = () => {
    setIsModalOpen(false);
  };

  if (isLoading || backendLoading) {
    return (
      <div className="min-h-screen bg-black/40 backdrop-blur-xl flex items-center justify-center">
        <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="text-blue-400">
          <Building2 className="h-8 w-8 animate-pulse" />
        </motion.div>
      </div>
    );
  }

  if (backendError || !backendData) {
    return (
      <div className="min-h-screen bg-black/40 backdrop-blur-xl flex flex-col items-center justify-center">
        <div className="text-red-400 text-lg font-semibold mb-4">
          Errore: {backendError || "Dati non disponibili"}
        </div>
        <button
          onClick={handleRetry}
          className="px-4 py-2 bg-blue-900/40 text-blue-300 rounded-lg border border-blue-500/30 hover:bg-blue-900/60 transition"
        >
          Riprova
        </button>
      </div>
    );
  }

  const org = backendData;

  return (
    <div className="min-h-screen bg-black/40 backdrop-blur-xl">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-black/40 backdrop-blur-xl border-b border-blue-500/20 shadow-[0_0_15px_rgba(0,149,255,0.15)] p-4 sm:p-6"
      >
        <div className="container mx-auto flex items-center gap-3 sm:gap-4">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleBackClick}
            className="p-2 sm:p-3 text-blue-400 hover:text-blue-300 transition-colors duration-200"
          >
            <ArrowLeft className="h-5 w-5 sm:h-6 sm:w-6" />
          </motion.button>
          <div className="flex items-center gap-2 sm:gap-3">
            <Building2 className="h-5 w-5 sm:h-6 sm:w-6 text-blue-400" />
            <h1 className="text-lg sm:text-xl lg:text-2xl font-semibold text-white">Dettagli Organizzazione</h1>
          </div>
        </div>
      </motion.div>

      <div className="container mx-auto p-4 sm:p-6 lg:p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid gap-4 sm:gap-6 lg:grid-cols-3"
        >
          <motion.div
            whileHover={{ scale: 1.01 }}
            className="lg:col-span-2 bg-black/30 backdrop-blur-md border border-blue-500/20 rounded-xl p-4 sm:p-6 shadow-[0_0_20px_rgba(0,149,255,0.15)] hover:shadow-[0_0_30px_rgba(0,149,255,0.2)] transition-all duration-300"
          >
            <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-6 gap-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                {org.logo && typeof org.logo === "string" ? (
                  <motion.img
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    src={org.logo}
                    alt={`${org.name} logo`}
                    className="h-12 w-12 sm:h-16 sm:w-16 rounded-lg object-cover border border-blue-500/30 shadow-[0_0_10px_rgba(0,149,255,0.1)]"
                  />
                ) : (
                  <div className="h-12 w-12 sm:h-16 sm:w-16 bg-blue-900/30 backdrop-blur-sm rounded-lg flex items-center justify-center border border-blue-500/30 shadow-[0_0_10px_rgba(0,149,255,0.1)]">
                    <Building2 className="h-6 w-6 sm:h-8 sm:w-8 text-blue-400" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-2 break-words">{org.name}</h2>
                  <div
                    className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs sm:text-sm ${getTypeColor(org.type)} backdrop-blur-sm`}
                  >
                    <Tag className="h-3 w-3" />
                    <span className="font-medium">{getTypeLabel(org.type)}</span>
                  </div>
                </div>
              </div>
            </div>

            {org.description && (
              <div className="mb-6">
                <h3 className="text-base sm:text-lg font-semibold text-blue-400 mb-3">Descrizione</h3>
                <p className="text-gray-300 leading-relaxed text-sm sm:text-base">{org.description}</p>
              </div>
            )}

            {org.location && (
              <div className="mb-6">
                <h3 className="text-base sm:text-lg font-semibold text-blue-400 mb-3 flex items-center gap-2">
                  <MapPin className="h-4 w-4 sm:h-5 sm:w-5" />
                  Posizione
                </h3>

                {org.location.coordinates[0] && org.location.coordinates[1] && (
                  <div className="mb-4 h-48 sm:h-64 rounded-lg overflow-hidden border border-blue-500/20 shadow-[0_0_15px_rgba(0,149,255,0.1)]">
                    <div ref={mapContainer} className="w-full h-full" />
                  </div>
                )}

                <div className="grid gap-3 sm:grid-cols-2">
                  <p className="text-white font-medium text-sm sm:text-base break-words">
                    {org.address.street}, {org.address.city}, {org.address.province}
                  </p>
                </div>
              </div>
            )}
          </motion.div>

          <div className="space-y-4 sm:space-y-6">
            {Array.isArray(org.members) && org.members.length > 0 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                whileHover={{ scale: 1.02 }}
                className="bg-black/30 backdrop-blur-md border border-blue-500/20 rounded-xl p-4 sm:p-6 shadow-[0_0_20px_rgba(0,149,255,0.15)] hover:shadow-[0_0_30px_rgba(0,149,255,0.2)] transition-all duration-300"
              >
                <div
                  className="flex items-center gap-3 mb-4 cursor-pointer group"
                  onClick={openMembersModal}
                >
                  <Users className="h-4 w-4 sm:h-5 sm:w-5 text-blue-400 group-hover:text-blue-300 transition-colors" />
                  <h3 className="text-base sm:text-lg font-semibold text-white group-hover:text-blue-300 transition-colors">
                    Membri ({org.members.length})
                  </h3>
                  <ExternalLink className="h-3 w-3 text-blue-400 group-hover:text-blue-300 transition-colors" />
                </div>

                <div className="space-y-3 max-h-96 overflow-y-auto scrollbar-app">
                  {org.members.slice(0, 4).map((member, index) => (
                    <motion.div
                      key={member.id || index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 * index }}
                      className="bg-blue-900/20 backdrop-blur-sm p-3 rounded-lg border border-blue-500/20 shadow-[0_0_10px_rgba(0,149,255,0.05)]"
                    >
                      <div className="flex items-start gap-3">
                        <div className="h-8 w-8 bg-blue-900/30 backdrop-blur-sm rounded-full flex items-center justify-center border border-blue-500/30 shadow-[0_0_10px_rgba(0,149,255,0.1)] flex-shrink-0">
                          <User className="h-4 w-4 text-blue-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-white font-medium text-sm break-words">
                            {member.name} {member.surname}
                          </div>
                          {member.email && (
                            <div className="flex items-center gap-1 mt-1">
                              <Mail className="h-3 w-3 text-blue-400 flex-shrink-0" />
                              <span className="text-xs text-gray-400 break-all">{member.email}</span>
                            </div>
                          )}
                          {member.role && <div className="text-xs text-blue-300 mt-1">{member.role}</div>}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                  {org.members.length > 4 && (
                    <button
                      onClick={openMembersModal}
                      className="w-full bg-blue-900/10 backdrop-blur-sm p-2 rounded-lg border border-blue-500/10 flex items-center justify-center hover:bg-blue-800/20 transition-colors mt-3"
                    >
                      <span className="text-xs text-blue-400">Vedi tutti i membri</span>
                    </button>
                  )}
                </div>
              </motion.div>
            )}

            {org.responsible && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                whileHover={{ scale: 1.02 }}
                className="bg-black/30 backdrop-blur-md border border-blue-500/20 rounded-xl p-4 sm:p-6 shadow-[0_0_20px_rgba(0,149,255,0.15)] hover:shadow-[0_0_30px_rgba(0,149,255,0.2)] transition-all duration-300"
              >
                <div className="flex items-center gap-3 mb-4">
                  <User className="h-4 w-4 sm:h-5 sm:w-5 text-blue-400" />
                  <h3 className="text-base sm:text-lg font-semibold text-white">Responsabile</h3>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 bg-blue-900/30 backdrop-blur-sm rounded-full flex items-center justify-center border border-blue-500/30 shadow-[0_0_10px_rgba(0,149,255,0.1)]">
                    <User className="h-4 w-4 text-blue-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-white font-medium text-sm sm:text-base break-words">
                      {typeof org.responsible === "string" ? org.responsible : org.responsible.name}
                    </div>
                    <div className="text-xs sm:text-sm text-gray-400">Responsabile</div>
                  </div>
                </div>
              </motion.div>
            )}

            {(org.created_at || org.updated_at) && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
                whileHover={{ scale: 1.02 }}
                className="bg-black/30 backdrop-blur-md border border-blue-500/20 rounded-xl p-4 sm:p-6 shadow-[0_0_20px_rgba(0,149,255,0.15)] hover:shadow-[0_0_30px_rgba(0,149,255,0.2)] transition-all duration-300"
              >
                <div className="flex items-center gap-3 mb-4">
                  <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-blue-400" />
                  <h3 className="text-base sm:text-lg font-semibold text-white">Date</h3>
                </div>
                <div className="space-y-3">
                  {org.created_at && (
                    <div className="flex items-center gap-3">
                      <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-green-400" />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs sm:text-sm text-gray-400">Creata il</div>
                        <div className="text-white font-medium text-sm sm:text-base">{formatDate(org.created_at)}</div>
                      </div>
                    </div>
                  )}
                  {org.updated_at && (
                    <div className="flex items-center gap-3">
                      <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-blue-400" />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs sm:text-sm text-gray-400">Aggiornata il</div>
                        <div className="text-white font-medium text-sm sm:text-base">{formatDate(org.updated_at)}</div>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>
      {/* Visualizza il modale solo se isModalOpen è true */}
      <AnimatePresence>
        {isModalOpen && <MembersModal members={org.members} onClose={closeMembersModal} />}
      </AnimatePresence>
    </div>
  );
}

export default MyOrganization;