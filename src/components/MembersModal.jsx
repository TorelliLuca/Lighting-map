// src/components/MembersModal.jsx
import { motion, AnimatePresence } from "framer-motion";
import { X, Users, UserCheck, Mail } from "lucide-react";

const MembersModal = ({ members, onClose }) => (
  <AnimatePresence>
    {members && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="sticky inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, y: 50 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 50 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-black/80 border border-blue-500/30 rounded-xl p-6 w-full max-w-lg shadow-2xl relative"
        >
          <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
          <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            <Users className="h-6 w-6 text-blue-400" />
            Membri dell'Organizzazione
          </h3>
          <div className="grid gap-4 max-h-[70vh] overflow-y-auto pr-2">
            {members.length > 0 ? (
              members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center gap-3 bg-blue-900/20 backdrop-blur-sm p-3 rounded-lg border border-blue-500/20"
                >
                  <div className="h-8 w-8 bg-blue-900/30 rounded-full flex items-center justify-center border border-blue-500/30 flex-shrink-0">
                    <UserCheck className="h-4 w-4 text-blue-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-white font-medium truncate">
                      {member.name} {member.surname}
                    </p>
                    <div className="flex items-center gap-1 text-gray-400 mt-0.5">
                      <Mail className="h-3 w-3 flex-shrink-0" />
                      <span className="text-xs truncate">{member.email}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-400 text-sm">Nessun membro trovato per questa organizzazione.</p>
            )}
          </div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

export default MembersModal;