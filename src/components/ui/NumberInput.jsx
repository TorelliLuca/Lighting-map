import { forwardRef, useCallback } from "react"
import { ChevronDown, ChevronUp } from "lucide-react"
import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

const cn = (...inputs) => twMerge(clsx(inputs))

const parseNumeric = (raw) => {
  if (raw === "" || raw === "-" || raw === "." || raw === "-.") return null
  const n = Number(raw)
  return Number.isFinite(n) ? n : null
}

const clamp = (n, min, max) => {
  let next = n
  if (min != null && Number.isFinite(Number(min))) next = Math.max(Number(min), next)
  if (max != null && Number.isFinite(Number(max))) next = Math.min(Number(max), next)
  return next
}

/**
 * Input numerico con frecce ± personalizzate (palette blue glass).
 * Le frecce incrementano/decrementano di interi (`step` default 1);
 * digitazione libera di decimali consentita.
 *
 * Drop-in per `<input type="number">`: stessa API `value` / `onChange(e)`
 * e le stesse classi Tailwind (bordo, bg, rounded, width) via `className`.
 */
export const NumberInput = forwardRef(function NumberInput(
  {
    value,
    onChange,
    onBlur,
    min,
    max,
    step = 1,
    disabled = false,
    className = "",
    size = "md",
    textAlign = "left",
    id,
    name,
    "aria-label": ariaLabel,
    "aria-invalid": ariaInvalid,
    placeholder,
    inputMode = "decimal",
    ...rest
  },
  ref
) {
  const emitChange = useCallback(
    (nextValue) => {
      onChange?.({
        target: { value: nextValue, name, id },
        currentTarget: { value: nextValue, name, id },
      })
    },
    [onChange, name, id]
  )

  const bump = useCallback(
    (direction) => {
      if (disabled) return
      const stepAmount = Math.abs(Number(step)) || 1
      const current = parseNumeric(value)
      const base = current ?? 0
      // 2.5 + up → 3; 2.5 + down → 2; poi ± step sugli interi
      const floored = Math.floor(base)
      let next
      if (direction > 0) {
        next = current != null && base !== floored ? floored + 1 : base + stepAmount
      } else {
        next = current != null && base !== floored ? floored : base - stepAmount
      }
      next = clamp(next, min, max)
      emitChange(String(Math.round(next * 1e6) / 1e6))
    },
    [disabled, step, value, min, max, emitChange]
  )

  const handleKeyDown = (e) => {
    if (disabled) return
    if (e.key === "ArrowUp") {
      e.preventDefault()
      bump(1)
    } else if (e.key === "ArrowDown") {
      e.preventDefault()
      bump(-1)
    }
  }

  const currentNum = parseNumeric(value)
  const minNum = min != null && Number.isFinite(Number(min)) ? Number(min) : null
  const maxNum = max != null && Number.isFinite(Number(max)) ? Number(max) : null
  const canDecrement = !disabled && (minNum == null || (currentNum ?? 0) > minNum)
  const canIncrement = !disabled && (maxNum == null || (currentNum ?? 0) < maxNum)

  const isSm = size === "sm"

  const spinnerBtnClass = cn(
    "flex flex-1 items-center justify-center text-blue-300",
    "hover:text-blue-100 hover:bg-blue-500/25",
    "transition-colors duration-150",
    "focus:outline-none focus-visible:bg-blue-500/30 focus-visible:text-blue-100",
    "disabled:opacity-30 disabled:pointer-events-none disabled:hover:bg-transparent"
  )

  return (
    <div
      className={cn(
        "group relative inline-flex min-w-0 items-stretch",
        "focus-within:ring-2 focus-within:ring-blue-400/50 focus-within:border-blue-400/50",
        disabled && "cursor-not-allowed",
        className,
        // Padding sul wrapper annullato: vive sull'input, così lo spinner è a filo bordo
        "px-0 py-0"
      )}
    >
      <input
        ref={ref}
        id={id}
        name={name}
        type="text"
        inputMode={inputMode}
        autoComplete="off"
        disabled={disabled}
        value={value ?? ""}
        placeholder={placeholder}
        aria-label={ariaLabel}
        aria-invalid={ariaInvalid}
        aria-valuemin={minNum ?? undefined}
        aria-valuemax={maxNum ?? undefined}
        aria-valuenow={currentNum ?? undefined}
        role="spinbutton"
        onChange={onChange}
        onBlur={onBlur}
        onKeyDown={handleKeyDown}
        className={cn(
          "w-full min-w-0 flex-1 bg-transparent border-0 shadow-none outline-none ring-0",
          "focus:outline-none focus:ring-0",
          "disabled:cursor-not-allowed",
          isSm ? "py-1.5 pl-2 text-sm" : "py-3 pl-4",
          textAlign === "right" ? "text-right" : "text-left"
        )}
        style={{ paddingRight: isSm ? "1.75rem" : "2.25rem" }}
        {...rest}
      />

      <div
        className={cn(
          "absolute inset-y-0 right-0 my-px mr-px flex flex-col overflow-hidden",
          "border-l border-blue-500/25 bg-blue-950/55",
          "transition-opacity duration-150",
          "opacity-100 sm:opacity-75 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100",
          disabled && "pointer-events-none opacity-40",
          isSm ? "w-6 rounded-r-[calc(0.5rem-1px)]" : "w-7 rounded-r-[calc(0.75rem-1px)]"
        )}
      >
        <button
          type="button"
          tabIndex={-1}
          disabled={!canIncrement}
          aria-label="Aumenta"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => bump(1)}
          className={cn(spinnerBtnClass, "border-b border-blue-500/20")}
        >
          <ChevronUp className={isSm ? "h-3 w-3" : "h-3.5 w-3.5"} strokeWidth={2.5} />
        </button>
        <button
          type="button"
          tabIndex={-1}
          disabled={!canDecrement}
          aria-label="Diminuisci"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => bump(-1)}
          className={spinnerBtnClass}
        >
          <ChevronDown className={isSm ? "h-3 w-3" : "h-3.5 w-3.5"} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  )
})

export default NumberInput
