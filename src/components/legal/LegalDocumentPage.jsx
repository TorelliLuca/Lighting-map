import { Link } from "react-router-dom"
import { ArrowLeft, FileWarning } from "lucide-react"
import Logo from "../Logo"
import { LEGAL_META } from "../../data/legalDocuments"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const formatDate = (isoDate) => {
  try {
    return new Intl.DateTimeFormat("it-IT", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date(isoDate))
  } catch {
    return isoDate
  }
}

const Paragraphs = ({ items }) =>
  (items || []).map((text, index) => (
    <p
      key={`${index}-${text.slice(0, 40)}`}
      className="text-sm leading-relaxed text-blue-100/80 sm:text-[15px]"
    >
      {text}
    </p>
  ))

const BulletList = ({ items }) => {
  if (!Array.isArray(items) || items.length === 0) return null
  return (
    <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-blue-100/80 sm:text-[15px]">
      {items.map((item, index) => (
        <li key={`${index}-${String(item).slice(0, 40)}`}>{item}</li>
      ))}
    </ul>
  )
}

const NumberedList = ({ items }) => {
  if (!Array.isArray(items) || items.length === 0) return null
  return (
    <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed text-blue-100/80 sm:text-[15px]">
      {items.map((item, index) => (
        <li key={`${index}-${String(item).slice(0, 40)}`}>{item}</li>
      ))}
    </ol>
  )
}

const DefinitionList = ({ items }) => {
  if (!Array.isArray(items) || items.length === 0) return null
  return (
    <dl className="space-y-3 text-sm leading-relaxed sm:text-[15px]">
      {items.map((item) => (
        <div key={item.term}>
          <dt className="font-semibold text-white">{item.term}</dt>
          <dd className="mt-0.5 text-blue-100/80">{item.description}</dd>
        </div>
      ))}
    </dl>
  )
}

const DataTable = ({ table }) => {
  if (!table?.headers?.length || !table?.rows?.length) return null
  return (
    <div className="-mx-1 overflow-x-auto rounded-xl border border-blue-500/20">
      <table className="min-w-full border-collapse text-left text-xs sm:text-sm">
        <thead className="bg-blue-950/60">
          <tr>
            {table.headers.map((header) => (
              <th
                key={header}
                className="whitespace-nowrap border-b border-blue-500/20 px-3 py-2.5 font-semibold text-blue-100"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, rowIndex) => (
            <tr
              key={rowIndex}
              className="odd:bg-black/20 even:bg-blue-950/20 align-top"
            >
              {row.map((cell, cellIndex) => (
                <td
                  key={`${rowIndex}-${cellIndex}`}
                  className="border-b border-blue-500/10 px-3 py-2.5 text-blue-100/80"
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const SectionBlock = ({ section }) => (
  <section className="space-y-3">
    <h2 className="text-lg font-semibold text-white sm:text-xl">{section.heading}</h2>
    <Paragraphs items={section.paragraphs} />
    <NumberedList items={section.numberedList} />
    <BulletList items={section.list} />
    <DefinitionList items={section.definitionList} />
    <DataTable table={section.table} />
    <Paragraphs items={section.paragraphsAfter} />
  </section>
)

export const LegalDocumentPage = ({ document, alternate }) => {
  if (!document) return null

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-blue-950 to-black text-white">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:py-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button
            asChild
            variant="ghost"
            className="h-10 px-2 text-blue-300 hover:bg-blue-900/30 hover:text-blue-100"
          >
            <Link to="/login">
              <ArrowLeft className="h-4 w-4" />
              Torna al login
            </Link>
          </Button>
          <Logo className="h-8 w-auto opacity-90" />
        </div>

        <header className="space-y-3 rounded-2xl border border-blue-500/20 bg-black/40 p-5 shadow-[0_0_40px_rgba(0,149,255,0.08)] backdrop-blur-xl sm:p-7">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-blue-300/70">
            Documenti legali · {LEGAL_META.productName}
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            {document.title}
          </h1>
          {document.subtitle && (
            <p className="text-sm italic text-blue-200/75">{document.subtitle}</p>
          )}
          <p className="text-sm text-blue-200/70">
            Ultimo aggiornamento: {formatDate(LEGAL_META.lastUpdated)}
          </p>

          {LEGAL_META.isDraft && (
            <div
              className={cn(
                "flex gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100"
              )}
              role="status"
            >
              <FileWarning className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" aria-hidden="true" />
              <div className="space-y-1">
                <p className="font-medium text-amber-50">Bozza in attesa di revisione legale</p>
                <p className="text-amber-100/85">{document.draftNotice}</p>
              </div>
            </div>
          )}
        </header>

        <article className="space-y-8 rounded-2xl border border-blue-500/20 bg-black/35 p-5 backdrop-blur-xl sm:p-7">
          {document.sections.map((section) => (
            <SectionBlock key={section.heading} section={section} />
          ))}
        </article>

        <footer className="flex flex-col gap-3 border-t border-blue-500/15 pt-4 text-sm text-blue-200/70 sm:flex-row sm:items-center sm:justify-between">
          <p>
            Contatti privacy:{" "}
            <a
              href={`mailto:${LEGAL_META.controller.email}`}
              className="font-medium text-blue-300 hover:text-blue-200"
            >
              {LEGAL_META.controller.email}
            </a>
          </p>
          {alternate && (
            <Link
              to={alternate.path}
              className="font-medium text-blue-400 transition-colors hover:text-blue-300"
            >
              Vedi anche: {alternate.title}
            </Link>
          )}
        </footer>
      </div>
    </div>
  )
}

export const AuthLegalFooter = ({ className }) => (
  <nav
    aria-label="Documenti legali"
    className={cn(
      "mt-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center text-xs text-blue-300/70",
      className
    )}
  >
    <Link to="/privacy" className="transition-colors hover:text-blue-200">
      Privacy
    </Link>
    <span aria-hidden="true" className="text-blue-500/40">
      ·
    </span>
    <Link to="/cookie" className="transition-colors hover:text-blue-200">
      Cookie
    </Link>
  </nav>
)
