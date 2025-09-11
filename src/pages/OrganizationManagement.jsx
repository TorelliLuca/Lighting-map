"use client";

import { useState, useEffect, useContext } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Building2,
  Users,
  CheckCircle,
  MapPin,
  Mail,
  User,
  Euro,
  AlertTriangle,
  Clock,
  FileText,
  ExternalLink,
  UserCheck,
  X,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { LightbulbLoader } from "../components/lightbulb-loader";
import { UserContext, api } from "../context/UserContext";
import { toast } from "react-hot-toast";
import MembersModal from "../components/MembersModal";

// --- Funzioni di utilità per i contratti ---
const getContractStatus = (endDate) => {
  const now = new Date();
  const end = new Date(endDate);
  const diffDays = Math.ceil((end - now) / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) return "expired";
  if (diffDays <= 30) return "expiring";
  return "active";
};

const getContractStatusLabel = (status) => {
  switch (status) {
    case "active":
      return "Attivo";
    case "expiring":
      return "In scadenza";
    case "expired":
      return "Scaduto";
    default:
      return "Sconosciuto";
  }
};

const getContractStatusColor = (status) => {
  switch (status) {
    case "active":
      return "border-green-500/30 bg-green-900/20 text-green-400";
    case "expiring":
      return "border-yellow-500/30 bg-yellow-900/20 text-yellow-400";
    case "expired":
      return "border-red-500/30 bg-red-900/20 text-red-400";
    default:
      return "border-gray-500/30 bg-gray-900/20 text-gray-400";
  }
};

const getContractStatusIcon = (status) => {
  switch (status) {
    case "active":
      return <CheckCircle className="h-3 w-3" />;
    case "expiring":
      return <AlertTriangle className="h-3 w-3" />;
    case "expired":
      return <Clock className="h-3 w-3" />;
    default:
      return null;
  }
};

const formatDate = (dateString) => {
  const options = { year: "numeric", month: "long", day: "numeric" };
  if (!dateString) return "";
  return new Date(dateString).toLocaleDateString("it-IT", options);
};



const OrganizationCard = ({ org, openMembersModal }) => {
  const [activeContractIndex, setActiveContractIndex] = useState(0);

  const handleContractNav = (direction) => {
    const totalContracts = org.contracts.length;
    let newIndex = activeContractIndex + direction;

    if (newIndex < 0) {
      newIndex = totalContracts - 1;
    } else if (newIndex >= totalContracts) {
      newIndex = 0;
    }
    setActiveContractIndex(newIndex);
  };

  const currentContract = org.contracts[activeContractIndex];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      whileHover={{ scale: 1.01 }}
      className={`bg-black/30 backdrop-blur-md border rounded-xl p-4 sm:p-6 shadow-[0_0_20px_rgba(0,149,255,0.15)] hover:shadow-[0_0_30px_rgba(0,149,255,0.2)] transition-all duration-300 ${
        org.isActive
          ? "border-green-500/30 shadow-[0_0_20px_rgba(34,197,94,0.15)]"
          : "border-blue-500/20"
      }`}
    >
      <div className="grid gap-4 lg:gap-6 lg:grid-cols-3">
        {/* Organization Info */}
        <div className="lg:col-span-2">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-4 gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              {org.logo ? (
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
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-lg sm:text-xl font-bold text-white break-words">{org.name}</h3>
                  {org.isActive && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-900/20 text-green-400 border border-green-500/30 text-xs font-medium">
                      <CheckCircle className="h-3 w-3" />
                      Attiva
                    </span>
                  )}
                </div>
                <p className="text-gray-300 text-sm sm:text-base leading-relaxed">{org.description}</p>
              </div>
            </div>
          </div>

          {/* Location */}
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="h-4 w-4 text-blue-400" />
              <span className="text-sm font-medium text-blue-400">Sede</span>
            </div>
            <p className="text-gray-300 text-sm">
              {org.address?.street}, {org.address?.city} {org.address?.postalCode}
            </p>
          </div>

          {/* Members */}
          <div className="flex items-center gap-2 mb-3 cursor-pointer group" onClick={() => openMembersModal(org.members)}>
            <Users className="h-4 w-4 text-blue-400 group-hover:text-blue-300 transition-colors" />
            <span className="text-sm font-medium text-blue-400 group-hover:text-blue-300 transition-colors">
              Membri ({org.members.length})
            </span>
            {org.members.length > 0 && (
              <ExternalLink className="h-3 w-3 text-blue-400 group-hover:text-blue-300 transition-colors" />
            )}
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {org.members.slice(0, 4).map((member) => (
              <div
                key={member.id}
                className="bg-blue-900/20 backdrop-blur-sm p-2 rounded-lg border border-blue-500/20 shadow-[0_0_10px_rgba(0,149,255,0.05)]"
              >
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 bg-blue-900/30 backdrop-blur-sm rounded-full flex items-center justify-center border border-blue-500/30 flex-shrink-0">
                    <User className="h-3 w-3 text-blue-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-white text-xs font-medium truncate">
                      {member.name} {member.surname}
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Mail className="h-2.5 w-2.5 text-blue-400 flex-shrink-0" />
                      <span className="text-xs text-gray-400 truncate">{member.email}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {org.members.length > 4 && (
              <button
                onClick={() => openMembersModal(org.members)}
                className="bg-blue-900/10 backdrop-blur-sm p-2 rounded-lg border border-blue-500/10 flex items-center justify-center hover:bg-blue-800/20 transition-colors"
              >
                <span className="text-xs text-blue-400">+{org.members.length - 4} altri</span>
              </button>
            )}
          </div>
        </div>

        {/* Contract Card con navigazione */}
        <div className="lg:col-span-1 flex items-center justify-center">
          <AnimatePresence mode="wait">
          {currentContract ? (
            <motion.div
              key={currentContract.id}
              initial={{ opacity: 0, x: 20, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -20, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              className="relative bg-black/20 backdrop-blur-md rounded-xl p-4 border border-blue-500/20 w-full shadow-[0_0_20px_rgba(0,149,255,0.1)]"
            >
              {/* Contract Content */}
              <div className="flex items-center gap-2 mb-4 text-blue-400">
                <FileText className="h-4 w-4" />
                <h4 className="text-sm font-semibold text-white">
                  Contratto
                  {org.contracts.length > 1 && (
                    <span className="ml-2 text-gray-400 font-normal">
                      ({activeContractIndex + 1}/{org.contracts.length})
                    </span>
                  )}
                </h4>
              </div>

              <div className="space-y-3">
                <div
                  className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-medium backdrop-blur-sm ${getContractStatusColor(getContractStatus(currentContract.end_date))}`}
                >
                  {getContractStatusIcon(getContractStatus(currentContract.end_date))}
                  <span>{getContractStatusLabel(getContractStatus(currentContract.end_date))}</span>
                </div>

                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-xs text-gray-400">Valore</span>
                    <p className="text-white font-semibold flex items-center gap-1">
                      <Euro size={14} />
                      {currentContract.price}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-400">Inizio</span>
                    <p className="text-white flex items-center gap-1">
                      <CalendarDays size={14} className="text-blue-400" />
                      <span className="whitespace-nowrap overflow-hidden text-ellipsis">
                        {formatDate(currentContract.start_date)}
                      </span>
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-400">Scadenza</span>
                    <p className="text-white flex items-center gap-1">
                      <CalendarDays size={14} className="text-blue-400" />
                      <span className="whitespace-nowrap overflow-hidden text-ellipsis">
                        {formatDate(currentContract.end_date)}
                      </span>
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-400">Dettagli</span>
                    <p className="text-white text-sm break-words">{currentContract.details || "Nessun dettaglio"}</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-400">Responsabile</span>
                    <p className="text-white text-sm break-words">{org.responsible || "Non assegnato"}</p>
                  </div>
                </div>
              </div>

              {/* Navigation Buttons (Bottom Right) */}
              {org.contracts.length > 1 && (
                <div className="absolute bottom-4 right-4 flex gap-2">
                  <button
                    onClick={() => handleContractNav(-1)}
                    className="p-2 rounded-full bg-blue-900/40 text-white/70 hover:text-white hover:bg-blue-800/60 transition-colors z-10 shadow-lg"
                    aria-label="Contratto precedente"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    onClick={() => handleContractNav(1)}
                    className="p-2 rounded-full bg-blue-900/40 text-white/70 hover:text-white hover:bg-blue-800/60 transition-colors z-10 shadow-lg"
                    aria-label="Contratto successivo"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </motion.div>
          ) : (
            <div className="bg-black/20 backdrop-blur-sm rounded-lg p-4 border border-red-500/10 text-center text-gray-400 text-sm w-full">
              Nessun contratto associato.
            </div>
          )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
};


// --- Componente principale OrganizationManagement ---
function OrganizationManagement() {
  const [isLoading, setIsLoading] = useState(true);
  const [organizations, setOrganizations] = useState([]);
  const [selectedOrgMembers, setSelectedOrgMembers] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const selectedCity = location.state?.townhallId || null;
  const { loadSelectedTownhalls } = useContext(UserContext);

  const fetchOrganizations = async () => {
    setIsLoading(true);
    let townhallId;
    try {
      const response = await loadSelectedTownhalls(selectedCity);
      townhallId = response.data._id;
    } catch (error) {
      console.error("Failed to load selected townhall:", error);
    }
    try {
      const response = await api.get(`/organizations/townhall/${townhallId}`);
      if (response.status === 200) {
        const orgs = response.data.filter(
          (org) => org.contracts && org.contracts.some((contract) => contract.townhall_associated === townhallId)
        );
        const filteredOrgs = orgs.map((org) => ({
          ...org,
          contracts: org.contracts.filter((contract) => contract.townhall_associated === townhallId),
        }));
        setOrganizations(filteredOrgs);
      } else {
        throw new Error("Errore durante il recupero dei dati.");
      }
    } catch (err) {
      console.error("Failed to fetch organizations:", err);
      toast.error("Errore nel caricamento delle organizzazioni.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    document.title = "Gestione Organizzazioni - Lighting Map";
    fetchOrganizations();
  }, [selectedCity]);

  const handleBackClick = () => {
    navigate("/dashboard");
  };

  const openMembersModal = (members) => {
    setSelectedOrgMembers(members);
  };

  const closeMembersModal = () => {
    setSelectedOrgMembers(null);
  };

  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5 }}
        className="min-h-screen w-screen flex items-center justify-center bg-black/40 backdrop-blur-xl"
      >
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <LightbulbLoader size={46} />
        </motion.div>
      </motion.div>
    );
  }

  return (
    <div className="min-h-screen bg-black/40 backdrop-blur-xl">
      {/* Header */}
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
            <h1 className="text-lg sm:text-xl lg:text-2xl font-semibold text-white">Gestione Organizzazioni</h1>
          </div>
        </div>
      </motion.div>

      {/* Content */}
      <div className="container mx-auto p-4 sm:p-6 lg:p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6"
        >
          <p className="text-gray-300 text-sm sm:text-base">
            Gestisci le organizzazioni associate al comune e i relativi contratti.
          </p>
        </motion.div>
        <div className="grid gap-4 sm:gap-6">
          {organizations.length > 0 ? (
            organizations.map((org) => (
              <OrganizationCard 
                key={org.id} 
                org={org} 
                openMembersModal={openMembersModal}
              />
            ))
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-black/30 backdrop-blur-md border rounded-xl p-6 text-center text-gray-400"
            >
              <h2 className="text-lg font-medium mb-2">Nessuna organizzazione trovata.</h2>
              <p className="text-sm">Assicurati che l'organizzazione sia associata a questo comune.</p>
            </motion.div>
          )}
        </div>
      </div>
      <AnimatePresence>
        {selectedOrgMembers && <MembersModal members={selectedOrgMembers} onClose={closeMembersModal} />}
      </AnimatePresence>
    </div>
  );
}

export default OrganizationManagement;