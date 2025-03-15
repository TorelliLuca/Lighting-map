"use client"

export default function MapButton({ icon: Icon, onClick, title, className = "" }) {
  return (
    <button
      onClick={onClick}
      className={`p-2 bg-white hover:bg-gray-100 text-gray-600 rounded-md shadow-md border border-gray-300 transition-all duration-200 ${className}`}
      title={title}
    >
      <Icon className="h-5 w-5" />
    </button>
  )
}

