"use client"

import { useMemo, useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  CALENDAR_DAY_STYLES,
  TODO_CATEGORIES,
  startOfDay,
} from "@/utils/todoTasks"

const WEEKDAYS = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"]

function monthLabel(year, month) {
  return new Date(year, month, 1).toLocaleDateString("it-IT", {
    month: "long",
    year: "numeric",
  })
}

function formatDayTitle(dayKey) {
  const [y, m, d] = dayKey.split("-").map(Number)
  return new Date(y, m - 1, d).toLocaleDateString("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "long",
  })
}

function tasksForDay(tasksByDay, dayKey) {
  return tasksByDay.get(dayKey) || []
}

/**
 * Calendario a tutta larghezza della lista.
 * Hover su un giorno con attività → elenco delle cose da fare.
 */
export function TodoCalendar({
  monthDate,
  onMonthChange,
  dayMap,
  tasks = [],
  onSelectTask,
  className,
}) {
  const year = monthDate.getFullYear()
  const month = monthDate.getMonth()
  const [hoveredKey, setHoveredKey] = useState(null)

  const todayKey = useMemo(() => {
    const t = new Date()
    const y = t.getFullYear()
    const m = String(t.getMonth() + 1).padStart(2, "0")
    const d = String(t.getDate()).padStart(2, "0")
    return `${y}-${m}-${d}`
  }, [])

  const tasksByDay = useMemo(() => {
    const map = new Map()
    for (const task of tasks) {
      for (const key of [task.dueKey, task.startKey]) {
        if (!key) continue
        if (!map.has(key)) map.set(key, [])
        const list = map.get(key)
        if (!list.some((t) => t.id === task.id)) list.push(task)
      }
    }
    return map
  }, [tasks])

  const cells = useMemo(() => {
    const first = new Date(year, month, 1)
    const startPad = (first.getDay() + 6) % 7
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const result = []

    for (let i = 0; i < startPad; i++) {
      result.push({ key: `pad-${i}`, empty: true })
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
      const meta = dayMap.get(key) || null
      const dayTasks = tasksForDay(tasksByDay, key)
      result.push({
        key,
        empty: false,
        day,
        meta,
        dayTasks,
        isToday: key === todayKey,
        style: meta?.status ? CALENDAR_DAY_STYLES[meta.status] : null,
      })
    }
    return result
  }, [year, month, dayMap, todayKey, tasksByDay])

  const hoveredTasks = hoveredKey ? tasksForDay(tasksByDay, hoveredKey) : []

  return (
    <section
      className={cn(
        "relative w-full rounded-lg border border-white/15 bg-slate-950/80 p-3 text-slate-100",
        className
      )}
      aria-label="Calendario attività"
      onMouseLeave={() => setHoveredKey(null)}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 cursor-pointer text-slate-200 hover:bg-white/10 hover:text-white"
          onClick={() => onMonthChange?.(startOfDay(new Date(year, month - 1, 1)))}
          aria-label="Mese precedente"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-sm font-semibold capitalize text-slate-100">
          {monthLabel(year, month)}
        </h2>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 cursor-pointer text-slate-200 hover:bg-white/10 hover:text-white"
          onClick={() => onMonthChange?.(startOfDay(new Date(year, month + 1, 1)))}
          aria-label="Mese successivo"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[11px] font-medium uppercase tracking-wide text-slate-400">
        {WEEKDAYS.map((d) => (
          <div key={d} className="py-1">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell) => {
          if (cell.empty) {
            return <div key={cell.key} className="min-h-10" aria-hidden="true" />
          }

          const hasTasks = cell.dayTasks.length > 0

          return (
            <button
              key={cell.key}
              type="button"
              onMouseEnter={() => {
                if (hasTasks) setHoveredKey(cell.key)
                else setHoveredKey(null)
              }}
              onFocus={() => {
                if (hasTasks) setHoveredKey(cell.key)
              }}
              onClick={() => {
                if (hasTasks) setHoveredKey(cell.key)
              }}
              className={cn(
                "relative flex min-h-10 cursor-default flex-col items-center justify-center rounded-md px-1 py-1 text-sm font-medium text-slate-200 transition-colors",
                hasTasks && "cursor-pointer hover:brightness-110",
                cell.isToday && !cell.style && "ring-1 ring-sky-400/60",
                cell.style,
                hoveredKey === cell.key && "ring-2 ring-sky-300/70"
              )}
              aria-label={
                hasTasks
                  ? `${cell.day}, ${cell.dayTasks.length} attività`
                  : String(cell.day)
              }
            >
              <span>{cell.day}</span>
              {hasTasks ? (
                <span className="mt-0.5 text-[9px] font-normal tabular-nums opacity-80">
                  {cell.dayTasks.length}
                </span>
              ) : null}
            </button>
          )
        })}
      </div>

      <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 border-t border-white/10 pt-2 text-[10px] text-slate-400">
        <li className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm bg-red-400" />
          Scaduta
        </li>
        <li className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm bg-amber-400" />
          In scadenza
        </li>
        <li className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm bg-emerald-400" />
          Nei tempi
        </li>
        <li className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm bg-sky-400" />
          Apertura
        </li>
      </ul>

      {hoveredKey && hoveredTasks.length > 0 ? (
        <div
          className="mt-3 rounded-lg border border-white/15 bg-slate-900/90 p-3"
          role="region"
          aria-label={`Attività del ${formatDayTitle(hoveredKey)}`}
          onMouseEnter={() => setHoveredKey(hoveredKey)}
        >
          <p className="mb-2 text-xs font-semibold capitalize text-slate-200">
            {formatDayTitle(hoveredKey)}
            <span className="ml-2 font-normal text-slate-400">
              · {hoveredTasks.length}{" "}
              {hoveredTasks.length === 1 ? "attività" : "attività"}
            </span>
          </p>
          <ul className="space-y-1">
            {hoveredTasks.map((task) => {
              const cat = TODO_CATEGORIES[task.category]
              return (
                <li key={task.id}>
                  <button
                    type="button"
                    className="flex w-full cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-white/10"
                    onClick={() => onSelectTask?.(task)}
                  >
                    <span
                      className={cn(
                        "mt-0.5 shrink-0 rounded border px-1.5 py-0.5 text-[10px]",
                        cat?.chipClass
                      )}
                    >
                      {cat?.label}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs font-medium text-slate-100">
                        {task.title}
                      </span>
                      {task.subtitle || task.timeLabel ? (
                        <span className="block text-[11px] text-slate-400">
                          {task.subtitle || task.timeLabel}
                        </span>
                      ) : null}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      ) : null}
    </section>
  )
}
