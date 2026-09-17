"use client"

import { Bar, BarChart, CartesianGrid, Cell, LabelList, Pie, PieChart, XAxis, YAxis } from "recharts"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"

export const ChartSection = ({ children, className, title, total }) => (
  <section
    className={cn(
      "rounded-xl border border-border/60 bg-card/70 p-4 backdrop-blur-xl sm:p-5",
      className,
    )}
  >
    {(title || total != null) && (
      <div className="mb-3 flex items-center justify-between gap-2">
        {title ? <h3 className="text-sm font-semibold text-blue-300 sm:text-base">{title}</h3> : <span />}
        {total != null && (
          <Badge variant="secondary" className="tabular-nums">
            {total}
          </Badge>
        )}
      </div>
    )}
    {children}
  </section>
)

/**
 * Chart distribuzione shadcn: pie (poche categorie) o bar orizzontali.
 */
export function DistributionChart({ title, model, variant = "auto", className }) {
  if (!model?.data?.length) return null

  const resolved =
    variant === "auto" ? (model.data.length <= 4 ? "pie" : "bar") : variant
  const total = model.data.reduce((sum, d) => sum + d.value, 0)
  const chartHeight = Math.max(180, Math.min(320, 48 + model.data.length * 36))

  return (
    <ChartSection title={title} total={total} className={className}>
      {resolved === "pie" ? (
        <ChartContainer config={model.config} className="mx-auto aspect-square max-h-[240px] w-full">
          <PieChart>
            <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel nameKey="key" />} />
            <Pie
              data={model.data}
              dataKey="value"
              nameKey="key"
              innerRadius={52}
              outerRadius={84}
              strokeWidth={2}
              paddingAngle={2}
            >
              {model.data.map((entry) => (
                <Cell key={entry.key} fill={entry.fill} />
              ))}
            </Pie>
            <ChartLegend content={<ChartLegendContent nameKey="key" className="flex-wrap gap-2" />} />
          </PieChart>
        </ChartContainer>
      ) : (
        <ChartContainer
          config={model.config}
          className="aspect-auto w-full"
          style={{ height: chartHeight }}
        >
          <BarChart
            accessibilityLayer
            data={model.data}
            layout="vertical"
            margin={{ left: 4, right: 28, top: 4, bottom: 4 }}
          >
            <CartesianGrid horizontal={false} strokeDasharray="3 3" />
            <YAxis
              dataKey="name"
              type="category"
              tickLine={false}
              axisLine={false}
              width={108}
              tick={{ fontSize: 11 }}
              tickFormatter={(value) => (value.length > 16 ? `${value.slice(0, 15)}…` : value)}
            />
            <XAxis type="number" hide />
            <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel nameKey="key" />} />
            <Bar dataKey="value" radius={5} maxBarSize={22}>
              {model.data.map((entry) => (
                <Cell key={entry.key} fill={entry.fill} />
              ))}
              <LabelList
                dataKey="value"
                position="right"
                className="fill-foreground text-[11px] font-medium"
              />
            </Bar>
          </BarChart>
        </ChartContainer>
      )}
    </ChartSection>
  )
}
