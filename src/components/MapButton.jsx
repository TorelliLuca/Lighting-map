"use client"

export default function MapButton({
  icon: Icon,
  onClick,
  title,
  className = "",
  iconClassName = "",
  disabled = false,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={title}
      className={`p-2 bg-white hover:bg-gray-100 text-gray-600 rounded-md shadow-md border border-gray-300 transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white ${className}`}
      title={title}
    >
      <Icon className={`h-5 w-5 ${iconClassName}`} />
    </button>
  )
}

