import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const NotFound = () => {
    const navigate = useNavigate();
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-950 px-4 text-white">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="glass-card max-w-lg rounded-3xl border border-blue-400/20 bg-blue-500/10 p-8 text-center shadow-2xl backdrop-blur-lg md:p-12"
      >
        <h1 className="mb-4 text-8xl font-bold text-blue-300 drop-shadow-lg md:text-9xl">
          404
        </h1>
        <p className="mb-8 text-lg md:text-xl">
          La pagina che stai cercando non è stata trovata.
        </p>
        <motion.a
          onClick={()=>{navigate("/dashboard")}}
          className="rounded-full border border-blue-400/50 bg-blue-500/20 px-8 py-3 font-semibold text-white transition-all duration-300 ease-in-out hover:border-blue-300 hover:bg-blue-500/30"
          whileHover={{ scale: 1.05, boxShadow: '0 4px 15px rgba(144, 189, 255, 0.4)' }}
          whileTap={{ scale: 0.95 }}
        >
          Torna alla Dashboard
        </motion.a>
      </motion.div>
    </div>
  );
};

export default NotFound;