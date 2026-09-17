"use client"

import {
  CalendarClock,
  ClipboardList,
  ExternalLink,
  FileSpreadsheet,
  MapPin,
  Search,
  Wrench,
  X,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { DueStatusBadge } from "@/components/ui/DueStatusBadge"
import { RiskClassBadge } from "@/components/ui/RiskClassBadge"
import { useMediaQuery } from "@/hooks/useMediaQuery"
import { cn } from "@/lib/utils"
import {
  TODO_CATEGORIES,
  SEVERITY_LABELS,
  SEVERITY_STYLES,
} from "@/utils/todoTasks"

const CATEGORY_ICONS = {
  inspection: Search,
  operation: Wrench,
  quote: FileSpreadsheet,
  consuntivo: ClipboardList,
}

function formatDate(value) {
  if (!value) return "—"
  try {
    return new Date(value).toLocaleDateString("it-IT", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    })
  } catch {
    return "—"
  }
}

function DetailBody({ task, onNavigate, onClose, showClose }) {
  const cat = TODO_CATEGORIES[task.category]
  const Icon = CATEGORY_ICONS[task.category] || ClipboardList

  const rows = [
    { label: "Comune", value: task.townHall || "—" },
    { label: "Punto luce", value: task.poleNumber ? `PL ${task.poleNumber}` : "—" },
    { label: "Indirizzo", value: task.meta?.address || "—" },
    { label: "Apertura", value: formatDate(task.startDate) },
    { label: "Scadenza", value: formatDate(task.dueDate) },
  ]

  if (task.category === "inspection") {
    rows.push({
      label: "Stato workflow",
      value: task.meta?.workflowLabel || task.workflowStatus || "—",
    })
    rows.push({
      label: "Guasto",
      value: task.meta?.faultLabel || "—",
    })
  }

  if (task.category === "operation") {
    rows.push({
      label: "Tipologia",
      value: task.meta?.maintenanceLabel || "—",
    })
    rows.push({
      label: "Stato workflow",
      value: task.meta?.workflowLabel || task.workflowStatus || "—",
    })
    rows.push({
      label: "Guasto",
      value: task.meta?.faultLabel || "—",
    })
    if (task.meta?.suspensionReason) {
      rows.push({
        label: "Motivo sospensione",
        value: task.meta.suspensionReason,
      })
    }
  }

  if (task.category === "quote" || task.category === "consuntivo") {
    rows.push({
      label: "Stato documento",
      value: task.meta?.statusLabel || task.quoteStatus || "—",
    })
    if (task.meta?.protocolNumber) {
      rows.push({ label: "Protocollo", value: task.meta.protocolNumber })
    }
    if (task.meta?.totalNet != null) {
      rows.push({
        label: "Totale netto",
        value: `€ ${Number(task.meta.totalNet).toLocaleString("it-IT", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`,
      })
    }
  }

  if (task.description) {
    rows.push({ label: "Note", value: task.description })
  }

  return (
    <div className="flex h-full min-h-0 flex-col text-slate-100">
      <div className="flex shrink-0 items-start justify-between gap-2 border-b border-white/10 px-4 py-3">
        <div className="min-w-0 space-y-1">
          <h2 className="text-sm font-semibold leading-snug text-white sm:text-base">
            {task.title}
          </h2>
          <p className="flex items-center gap-1.5 text-xs text-slate-300">
            <CalendarClock className="h-3.5 w-3.5 shrink-0 text-slate-300" aria-hidden="true" />
            {task.subtitle || task.timeLabel}
          </p>
        </div>
        {showClose ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 cursor-pointer text-slate-200 hover:bg-white/10 hover:text-white"
            onClick={onClose}
            aria-label="Chiudi dettaglio"
          >
            <X className="h-4 w-4 text-slate-200" />
          </Button>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant="outline"
            className={cn("gap-1 border-white/20 font-medium text-slate-100", cat?.chipClass)}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
            {cat?.label || task.category}
          </Badge>
          <Badge
            variant="outline"
            className={cn("font-medium", SEVERITY_STYLES[task.severity])}
          >
            Gravità: {SEVERITY_LABELS[task.severity] || "—"}
          </Badge>
          <RiskClassBadge riskClass={task.riskClass} prefix />
          <DueStatusBadge
            dueStatus={task.dueStatus}
            daysRemaining={task.daysRemaining}
          />
        </div>

        <dl className="space-y-3 text-sm">
          {rows.map((row) => (
            <div key={row.label} className="grid gap-0.5">
              <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                {row.label}
              </dt>
              <dd className="break-words text-slate-100">{row.value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="shrink-0 space-y-2 border-t border-white/10 px-4 py-3">
        <Separator className="mb-2 bg-white/10" />
        <Button
          type="button"
          className="min-h-10 w-full cursor-pointer gap-2 bg-sky-600 text-white hover:bg-sky-500"
          onClick={() => onNavigate?.(task)}
        >
          <ExternalLink className="h-4 w-4" aria-hidden="true" />
          Apri attività
        </Button>
        {(task.lat != null && task.lng != null) || task.poleNumber ? (
          <Button
            type="button"
            variant="outline"
            className="min-h-10 w-full cursor-pointer gap-2 border-white/20 bg-transparent text-slate-100 hover:bg-white/10 hover:text-white"
            onClick={() => onNavigate?.(task, { toMap: true })}
          >
            <MapPin className="h-4 w-4" aria-hidden="true" />
            Vai al punto luce
          </Button>
        ) : null}
      </div>
    </div>
  )
}

/**
 * Desktop: pannello sticky a destra (nessuna sfocatura).
 * Mobile: Sheet bottom senza blur.
 */
export function TodoDetailPanel({
  task,
  open,
  onOpenChange,
  onNavigate,
  variant = "inline",
}) {
  const isDesktop = useMediaQuery("(min-width: 768px)")

  if (!open || !task) return null

  if (variant === "inline" && isDesktop) {
    return (
      <aside
        className="sticky top-3 flex h-[calc(100dvh-1.5rem)] w-full max-w-sm shrink-0 flex-col overflow-hidden rounded-lg border border-white/15 bg-slate-950 shadow-lg"
        aria-label="Dettaglio attività"
      >
        <DetailBody
          task={task}
          onNavigate={onNavigate}
          onClose={() => onOpenChange?.(false)}
          showClose
        />
      </aside>
    )
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        hideClose
        overlayClassName="bg-black/45 backdrop-blur-none"
        className="flex max-h-[88dvh] flex-col gap-0 overflow-hidden border-white/15 bg-slate-950 p-0 text-slate-100"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>{task.title}</SheetTitle>
          <SheetDescription>{task.subtitle || task.timeLabel}</SheetDescription>
        </SheetHeader>
        <DetailBody
          task={task}
          onNavigate={onNavigate}
          onClose={() => onOpenChange?.(false)}
          showClose
        />
      </SheetContent>
    </Sheet>
  )
}
