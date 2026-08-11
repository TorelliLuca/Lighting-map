"use client"

const STAT_CARD_STYLES = {
  blue: {
    card: "bg-blue-900/50 border-blue-500/30 hover:border-blue-400/50 hover:bg-blue-800/60",
    active: "ring-2 ring-blue-400/60 border-blue-400/50",
    icon: "text-blue-400",
    title: "text-blue-200",
  },
  red: {
    card: "bg-red-900/50 border-red-500/30 hover:border-red-400/50 hover:bg-red-800/60",
    active: "ring-2 ring-red-400/60 border-red-400/50",
    icon: "text-red-400",
    title: "text-red-200",
  },
  green: {
    card: "bg-green-900/50 border-green-500/30 hover:border-green-400/50 hover:bg-green-800/60",
    active: "ring-2 ring-green-400/60 border-green-400/50",
    icon: "text-green-400",
    title: "text-green-200",
  },
  amber: {
    card: "bg-amber-900/50 border-amber-500/30 hover:border-amber-400/50 hover:bg-amber-800/60",
    active: "ring-2 ring-amber-400/60 border-amber-400/50",
    icon: "text-amber-400",
    title: "text-amber-200",
  },
  orange: {
    card: "bg-orange-900/50 border-orange-500/30 hover:border-orange-400/50 hover:bg-orange-800/60",
    active: "ring-2 ring-orange-400/60 border-orange-400/50",
    icon: "text-orange-400",
    title: "text-orange-200",
  },
}

export const StatCard = ({
  title,
  value,
  icon: Icon,
  color = "blue",
  active = false,
  onClick,
  className = "",
}) => {
  const styles = STAT_CARD_STYLES[color] || STAT_CARD_STYLES.blue
  const baseClass = `p-3 sm:p-4 rounded-xl border transition-all duration-200 text-left w-full ${styles.card} ${
    active ? styles.active : ""
  } ${onClick ? "cursor-pointer" : ""} ${className}`

  const content = (
    <>
      <div className="flex items-center gap-2 sm:gap-3 mb-1.5 sm:mb-2 min-w-0">
        {Icon ? <Icon className={`h-4 w-4 sm:h-5 sm:w-5 shrink-0 ${styles.icon}`} /> : null}
        <h4 className={`text-xs sm:text-sm font-medium truncate ${styles.title}`}>{title}</h4>
      </div>
      <p className="text-xl sm:text-2xl font-bold text-white tabular-nums">{value}</p>
    </>
  )

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={baseClass}>
        {content}
      </button>
    )
  }

  return <div className={baseClass}>{content}</div>
}
