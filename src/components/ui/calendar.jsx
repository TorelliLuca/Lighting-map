"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker, getDefaultClassNames } from "react-day-picker"
import { it } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { Button, buttonVariants } from "@/components/ui/button"

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  components,
  ...props
}) {
  const defaults = getDefaultClassNames()

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      locale={it}
      className={cn(
        "group/calendar bg-background p-2 [--cell-size:1.75rem]",
        className
      )}
      classNames={{
        root: cn("w-fit", defaults.root),
        months: cn("relative flex flex-col", defaults.months),
        month: cn("flex w-full flex-col gap-2", defaults.month),
        nav: cn(
          "absolute inset-x-0 top-0 flex w-full items-center justify-between",
          defaults.nav
        ),
        button_previous: cn(
          buttonVariants({ variant: "ghost" }),
          "h-[--cell-size] w-[--cell-size] p-0 opacity-70 hover:opacity-100",
          defaults.button_previous
        ),
        button_next: cn(
          buttonVariants({ variant: "ghost" }),
          "h-[--cell-size] w-[--cell-size] p-0 opacity-70 hover:opacity-100",
          defaults.button_next
        ),
        month_caption: cn(
          "flex h-[--cell-size] w-full items-center justify-center px-[--cell-size]",
          defaults.month_caption
        ),
        caption_label: cn(
          "select-none text-xs font-medium capitalize",
          defaults.caption_label
        ),
        weekdays: cn("flex", defaults.weekdays),
        weekday: cn(
          "text-muted-foreground flex-1 select-none text-[0.65rem] font-normal",
          defaults.weekday
        ),
        week: cn("mt-1 flex w-full", defaults.week),
        day: cn(
          "group/day relative aspect-square h-full w-full p-0 text-center",
          defaults.day
        ),
        today: cn(
          "bg-accent text-accent-foreground rounded-md",
          defaults.today
        ),
        outside: cn(
          "text-muted-foreground opacity-40",
          defaults.outside
        ),
        disabled: cn("text-muted-foreground opacity-40", defaults.disabled),
        hidden: cn("invisible", defaults.hidden),
        selected: cn("rounded-md", defaults.selected),
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, className: chevronClass, ...chevronProps }) =>
          orientation === "left" ? (
            <ChevronLeft className={cn("size-3.5", chevronClass)} {...chevronProps} />
          ) : (
            <ChevronRight className={cn("size-3.5", chevronClass)} {...chevronProps} />
          ),
        DayButton: ({ className: dayClass, day, modifiers, ...dayProps }) => (
          <Button
            variant="ghost"
            size="icon"
            data-day={day.date.toLocaleDateString("it-IT")}
            data-selected={modifiers.selected || undefined}
            className={cn(
              "h-[--cell-size] w-[--cell-size] p-0 text-xs font-normal leading-none",
              "data-[selected=true]:bg-primary data-[selected=true]:text-primary-foreground",
              dayClass
            )}
            {...dayProps}
          />
        ),
        ...components,
      }}
      {...props}
    />
  )
}

Calendar.displayName = "Calendar"

export { Calendar }
