"use client"

import {
  AlertTriangle,
  ClipboardList,
  FileText,
  Hexagon,
  Lightbulb,
  MapPin,
  Search,
} from "lucide-react"
import {
  VerticalTimeline,
  VerticalTimelineElement,
} from "react-vertical-timeline-component"
import "react-vertical-timeline-component/style.min.css"

import { Badge } from "@/components/ui/badge"
import { RiskClassBadge } from "@/components/ui/RiskClassBadge"
import { WorkflowStatusBadge } from "@/components/ui/WorkflowStatusBadge"
import { QuoteStatusBadge } from "@/components/ui/QuoteStatusBadge"
import { PLANT_EVENT_TYPES, PRIORITY_LABELS } from "@/data/plantStatusMock"
import { formatTimelineTime } from "@/utils/plantStatusEvents"
import { cn } from "@/lib/utils"

const TYPE_ICONS = {
  ordinary: AlertTriangle,
  extraordinary: Hexagon,
  quote: FileText,
  inspection: Search,
  light_off: Lightbulb,
}

const TIME_KIND_CLASS = {
  expires: "text-amber-300 font-semibold",
  overdue: "text-red-400 font-semibold",
  neutral: "text-muted-foreground",
}

function EventCardBody({ event }) {
  const typeMeta = PLANT_EVENT_TYPES[event.type] || PLANT_EVENT_TYPES.ordinary
  const timeClass = TIME_KIND_CLASS[event.timeKind] || TIME_KIND_CLASS.neutral

  return (
    <div className="min-w-0">
      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        <Badge variant="outline" className={cn("rounded-md", typeMeta.chipClass)}>
          {typeMeta.label}
        </Badge>
        <Badge variant="secondary" className="rounded-md">
          {PRIORITY_LABELS[event.priority] || event.priority}
        </Badge>
        {event.riskClass ? <RiskClassBadge riskClass={event.riskClass} /> : null}
      </div>

      <h3 className="text-base sm:text-lg font-semibold text-foreground leading-snug">
        {event.title}
      </h3>

      <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs sm:text-sm text-muted-foreground">
        <span className="inline-flex items-center gap-1 min-w-0">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-primary/80" aria-hidden="true" />
          <span className="truncate">
            {event.townHall}
            {event.lotto ? ` · ${event.lotto}` : ""}
          </span>
        </span>
        {event.workflowStatus ? (
          <WorkflowStatusBadge status={event.workflowStatus} />
        ) : null}
        {event.quoteStatus ? <QuoteStatusBadge status={event.quoteStatus} /> : null}
      </div>

      <p className={cn("mt-2 text-sm tabular-nums flex items-center gap-1.5", timeClass)}>
        <ClipboardList className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden="true" />
        {event.timeLabel}
      </p>
    </div>
  )
}

export const PlantStatusSectionHeader = ({ label, count }) => (
  <div className="mb-4 rounded-xl border border-border bg-card/80 px-4 py-3.5 sm:px-5 sm:py-4 shadow-[0_0_20px_rgba(59,130,246,0.08)]">
    <div className="flex items-center justify-between gap-3">
      <h3 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
        {label}
      </h3>
      <Badge
        variant="secondary"
        className="h-7 min-w-7 justify-center rounded-full px-2.5 text-xs tabular-nums"
      >
        {count}
      </Badge>
    </div>
  </div>
)

export const PlantStatusTimeline = ({
  events,
  selectedId,
  onOpen,
  animate = true,
}) => {
  if (!events?.length) return null

  return (
    <div className="plant-status-timeline -ml-1 sm:ml-0">
      <VerticalTimeline
        layout="1-column-left"
        lineColor="rgba(59, 130, 246, 0.35)"
        animate={animate}
      >
        {events.map((event) => {
          const typeMeta = PLANT_EVENT_TYPES[event.type] || PLANT_EVENT_TYPES.ordinary
          const Icon = TYPE_ICONS[event.type] || AlertTriangle
          const color = typeMeta.timelineColor || "#3b82f6"
          const selected = selectedId === event.id
          const isCritical =
            event.priority === "critical" || event.dueStatus === "overdue"

          return (
            <VerticalTimelineElement
              key={event.id}
              className={cn(
                "plant-status-timeline__item cursor-pointer",
                selected && "plant-status-timeline__item--selected"
              )}
              date={formatTimelineTime(event.occurredAt)}
              dateClassName="!text-muted-foreground !opacity-100 !font-medium !text-xs sm:!text-sm"
              icon={<Icon className="h-5 w-5" strokeWidth={2} aria-hidden="true" />}
              iconStyle={{
                background: color,
                color: "#fff",
                boxShadow: isCritical
                  ? `0 0 0 4px rgba(0,0,0,0.35), 0 0 18px ${color}`
                  : `0 0 0 4px rgba(0,0,0,0.35), 0 0 12px ${color}88`,
              }}
              contentStyle={{
                background: selected
                  ? "rgba(30, 58, 138, 0.45)"
                  : "rgba(15, 23, 42, 0.72)",
                color: "hsl(var(--foreground))",
                border: selected
                  ? "1px solid rgba(96, 165, 250, 0.55)"
                  : "1px solid rgba(51, 65, 85, 0.7)",
                borderLeft: `4px solid ${color}`,
                borderRadius: "0.75rem",
                boxShadow: isCritical
                  ? "0 0 24px rgba(239, 68, 68, 0.15)"
                  : "0 0 18px rgba(0, 0, 0, 0.25)",
                padding: "1rem 1.1rem",
                cursor: "pointer",
              }}
              contentArrowStyle={{
                borderRight: `7px solid ${
                  selected ? "rgba(96, 165, 250, 0.55)" : "rgba(51, 65, 85, 0.85)"
                }`,
              }}
              onContentClick={() => onOpen?.(event)}
            >
              <div
                role="button"
                tabIndex={0}
                onClick={() => onOpen?.(event)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault()
                    onOpen?.(event)
                  }
                }}
                className="cursor-pointer rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <EventCardBody event={event} />
              </div>
            </VerticalTimelineElement>
          )
        })}
      </VerticalTimeline>
    </div>
  )
}
