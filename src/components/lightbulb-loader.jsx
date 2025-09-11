"use client"

import { motion } from "framer-motion"
import { Lightbulb } from "lucide-react"

export function LightbulbLoader({ size = 24, className = "" }) {
  const containerVariants = {
    animate: {
      opacity: [0.5, 1, 0.5],
      transition: {
        duration: 1.5,
        ease: "easeInOut",
        repeat: Infinity,
      },
    },
  }

  const bulbVariants = {
    on: {
      color: "#FCD34D", // yellow-300
    },
    off: {
      color: "#93C5FD50", // blue-200/50
    },
  }

  return (
    <motion.div
      variants={containerVariants}
      animate="animate"
      className={`relative flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      <motion.div
        initial="off"
        animate="on"
        variants={bulbVariants}
        transition={{
          duration: 0.3,
          repeat: Infinity,
          repeatType: "reverse",
          repeatDelay: 1.2,
        }}
      >
        <Lightbulb size={size} />
      </motion.div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          repeatType: "reverse",
        }}
        className="absolute inset-0 bg-yellow-300/50 rounded-full blur-sm"
      ></motion.div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          repeatType: "reverse",
        }}
        className="absolute -inset-1 bg-yellow-300/20 rounded-full blur-md"
      ></motion.div>
    </motion.div>
  )
}