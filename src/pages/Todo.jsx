"use client"

import { useCallback, useContext, useEffect, useMemo, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import {
  CheckSquare,
  Circle,
  Home,
  Square,
} from "lucide-react"
import toast from "react-hot-toast"
import { UserContext, api } from "@/context/UserContext"
import { BackNavigationButton } from "@/components/BackNavigationButton"
import { TodoCalendar } from "@/components/todo/TodoCalendar"
import { TodoDetailPanel } from "@/components/todo/TodoDetailPanel"
import InfoTooltip from "@/components/ui/InfoTooltip"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { DueStatusBadge } from "@/components/ui/DueStatusBadge"
import { LightbulbLoader } from "@/components/lightbulb-loader"
import { useMediaQuery } from "@/hooks/useMediaQuery"
import { cn } from "@/lib/utils"
import { PAGE_SCROLL_SHELL } from "@/utils/pageScrollShell"
import { canManageQuotesByRole } from "@/utils/utils"
import {
  denyUnauthorizedComuneAccess,
  guardComuneAccess,
  isTownHallAccessDeniedError,
} from "@/utils/townHallAccess"
import {
  TODO_CATEGORIES,
  SEVERITY_LABELS,
  SEVERITY_STYLES,
  buildCalendarDayMap,
  fetchTodoTasks,
  startOfDay,
} from "@/utils/todoTasks"

const INFO_TEXT =
  "Elenco completo delle attività da fare: sopralluoghi, operazioni (anche ordinarie in sospensione/programmate), preventivi in bozza/revisione e consuntivi da compilare. Esclusi i preventivi in attesa di approvazione DEC."

function TodoRow({ task, selected, onOpen }) {
  const cat = TODO_CATEGORIES[task.category]
  const isInspection = task.category === "inspection"
  const isOperation = task.category === "operation"
  const subtitle = task.subtitle || task.timeLabel

  return (
    <button
      type="button"
      onClick={() => onOpen(task)}
      className={cn(
        "group flex w-full cursor-pointer items-start gap-3 border-b border-white/10 px-3 py-3 text-left transition-colors duration-150",
        "hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-400/50",
        selected && "bg-sky-500/15",
        isInspection && "bg-cyan-950/35 hover:bg-cyan-900/40",
        isOperation && "bg-emerald-950/30 hover:bg-emerald-900/35"
      )}
    >
      <span
        className={cn(
          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-sm border",
          selected
            ? "border-sky-400 bg-sky-500/20 text-sky-300"
            : "border-slate-500 text-slate-500"
        )}
        aria-hidden="true"
      >
        {selected ? (
          <Circle className="h-2.5 w-2.5 fill-current" />
        ) : (
          <Square className="h-3 w-3 opacity-0 group-hover:opacity-40" />
        )}
      </span>

      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge
            variant="outline"
            className={cn("h-5 border-white/20 px-1.5 text-[10px] text-slate-100", cat?.chipClass)}
          >
            {cat?.label}
          </Badge>
          <Badge
            variant="outline"
            className={cn("h-5 px-1.5 text-[10px]", SEVERITY_STYLES[task.severity])}
          >
            {SEVERITY_LABELS[task.severity]}
          </Badge>
          <DueStatusBadge
            dueStatus={task.dueStatus}
            daysRemaining={task.daysRemaining}
            className="h-5"
          />
        </div>

        <p
          className={cn(
            "leading-snug text-slate-50",
            isInspection || isOperation ? "text-[15px] font-semibold" : "text-sm font-medium"
          )}
        >
          {task.title}
        </p>

        {subtitle ? (
          <p
            className={cn(
              "text-xs",
              isInspection
                ? "font-medium text-cyan-200"
                : isOperation
                  ? "font-medium text-emerald-200"
                  : "text-slate-400"
            )}
          >
            {subtitle}
          </p>
        ) : null}
      </div>
    </button>
  )
}

export default function Todo() {
  const { userData } = useContext(UserContext)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const isDesktop = useMediaQuery("(min-width: 768px)")

  const comune = searchParams.get("comune") || ""
  const canManage = useMemo(() => canManageQuotesByRole(userData), [userData])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [tasks, setTasks] = useState([])
  const [monthDate, setMonthDate] = useState(() => startOfDay(new Date()))
  const [selectedTask, setSelectedTask] = useState(null)
  const [detailOpen, setDetailOpen] = useState(false)

  const load = useCallback(async () => {
    if (!comune) return
    try {
      setLoading(true)
      setError("")
      const data = await fetchTodoTasks({ api, townHallName: comune })
      setTasks(data)
    } catch (err) {
      console.error(err)
      if (isTownHallAccessDeniedError(err)) {
        denyUnauthorizedComuneAccess(navigate)
        return
      }
      setError(err.response?.data?.error || "Impossibile caricare il programma TODO.")
      setTasks([])
    } finally {
      setLoading(false)
    }
  }, [comune, navigate])

  useEffect(() => {
    if (!userData) {
      navigate("/")
      return
    }
    if (!canManage) {
      navigate("/dashboard")
      return
    }
    if (!comune) {
      toast.error("Seleziona un comune dalla mappa.")
      navigate("/dashboard")
      return
    }
    if (!guardComuneAccess({ userData, comune, navigate })) return
    load()
  }, [userData, canManage, comune, navigate, load])

  const dayMap = useMemo(() => buildCalendarDayMap(tasks), [tasks])

  const openDetail = useCallback((task) => {
    setSelectedTask(task)
    setDetailOpen(true)
  }, [])

  const closeDetail = useCallback((open) => {
    setDetailOpen(open)
    if (!open) setSelectedTask(null)
  }, [])

  const handleNavigate = useCallback(
    (task, opts = {}) => {
      setDetailOpen(false)
      setSelectedTask(null)

      if (opts.toMap) {
        if (task.townHall && task.lat != null && task.lng != null) {
          navigate("/dashboard", {
            state: {
              comune: task.townHall,
              focusLat: String(task.lat),
              focusLng: String(task.lng),
              focusPalo: String(task.poleNumber || ""),
            },
          })
          return
        }
        if (task.townHall && task.poleNumber) {
          navigate("/dashboard", {
            state: {
              comune: task.townHall,
              focusPalo: String(task.poleNumber),
            },
          })
          return
        }
        toast.error("Coordinate del punto luce non disponibili.")
        return
      }

      if (task.category === "inspection" && task.lightPointId) {
        const qs = new URLSearchParams({
          comune: task.townHall || comune,
          id: String(task.lightPointId),
        })
        if (task.reportId) qs.set("reportId", String(task.reportId))
        navigate(`/inspection?${qs.toString()}`)
        return
      }

      if (task.category === "operation" && task.poleNumber) {
        const qs = new URLSearchParams({
          comune: task.townHall || comune,
          numeroPalo: String(task.poleNumber),
        })
        if (task.lat != null) qs.set("lat", String(task.lat))
        if (task.lng != null) qs.set("lng", String(task.lng))
        if (task.reportId) qs.set("reportId", String(task.reportId))
        navigate(`/operation?${qs.toString()}`)
        return
      }

      if (task.category === "quote" && task.quoteId) {
        navigate(`/quote/${task.quoteId}`)
        return
      }

      if (task.category === "consuntivo" && task.quoteId) {
        navigate(`/consuntivo/${task.quoteId}`)
        return
      }

      toast.error("Destinazione non disponibile.")
    },
    [navigate, comune]
  )

  const goToDashboard = useCallback(() => {
    navigate("/dashboard", { state: { comune } })
  }, [navigate, comune])

  if (!userData) return null

  if (loading) {
    return (
      <div
        className={`${PAGE_SCROLL_SHELL} flex items-center justify-center bg-gradient-to-br from-black via-blue-950 to-black`}
      >
        <LightbulbLoader />
      </div>
    )
  }

  const showInlineDetail = detailOpen && selectedTask && isDesktop

  return (
    <div
      className={`${PAGE_SCROLL_SHELL} bg-gradient-to-br from-black via-blue-950 to-black py-3 md:px-0 md:py-4 px-3`}
    >
      <div
        className={cn(
          "mx-auto flex w-full flex-col gap-3",
          showInlineDetail ? "max-w-6xl md:px-3" : "max-w-3xl md:px-0"
        )}
      >
        <div className="flex items-center justify-between gap-3 px-0 md:px-3">
          <div className="flex min-w-0 items-center gap-3">
            <BackNavigationButton />
            <div className="min-w-0">
              <h1 className="flex items-center gap-2 text-xl font-bold text-white sm:text-2xl">
                <CheckSquare className="h-5 w-5 shrink-0 text-emerald-400 sm:h-6 sm:w-6" aria-hidden="true" />
                <span className="truncate">TODO</span>
                <InfoTooltip text={INFO_TEXT} />
              </h1>
              <p className="truncate text-sm text-slate-400">
                {comune} · {tasks.length} da fare
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={goToDashboard}
            aria-label="Torna alla mappa"
            className="min-h-11 min-w-11 cursor-pointer rounded-full bg-sky-500/15 text-sky-300 hover:bg-sky-500/25 hover:text-sky-200"
          >
            <Home className="h-5 w-5" />
          </Button>
        </div>

        {error ? (
          <div
            role="alert"
            className="rounded-lg border border-red-500/40 bg-red-950/40 px-4 py-3 text-sm text-red-100 md:mx-3"
          >
            {error}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="ml-2 cursor-pointer text-red-100 hover:bg-red-500/20 hover:text-white"
              onClick={load}
            >
              Riprova
            </Button>
          </div>
        ) : null}

        <div className={cn("flex items-start gap-3", showInlineDetail && "md:px-3")}>
          <div className="min-w-0 flex-1 space-y-3">
            <TodoCalendar
              monthDate={monthDate}
              onMonthChange={setMonthDate}
              dayMap={dayMap}
              tasks={tasks}
              onSelectTask={openDetail}
            />

            <div className="rounded-lg border border-white/15 bg-slate-950/70">
              <div className="flex items-center justify-between gap-2 px-3 py-2">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Elenco attività
                </p>
                <span className="text-xs tabular-nums text-slate-400">
                  {tasks.length}
                </span>
              </div>
              <Separator className="bg-white/10" />
              {tasks.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-400">
                  Nessuna attività da fare. Buon lavoro!
                </div>
              ) : (
                tasks.map((task) => (
                  <TodoRow
                    key={task.id}
                    task={task}
                    selected={selectedTask?.id === task.id}
                    onOpen={openDetail}
                  />
                ))
              )}
            </div>
          </div>

          {showInlineDetail ? (
            <TodoDetailPanel
              task={selectedTask}
              open={detailOpen}
              onOpenChange={closeDetail}
              onNavigate={handleNavigate}
              variant="inline"
            />
          ) : null}
        </div>
      </div>

      {!isDesktop ? (
        <TodoDetailPanel
          task={selectedTask}
          open={detailOpen}
          onOpenChange={closeDetail}
          onNavigate={handleNavigate}
          variant="sheet"
        />
      ) : null}
    </div>
  )
}
