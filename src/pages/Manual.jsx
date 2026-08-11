import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  AlertTriangle,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Compass,
  Gauge,
  Home,
  Info,
  LayoutPanelLeft,
  List,
  Map as MapIcon,
  MapPin,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Wrench,
} from "lucide-react"
import Logo from "../components/Logo"

const MANUAL_SECTIONS = [
  {
    id: "intro",
    icon: "◈",
    title: "Introduzione",
    content: [
      { type: "heading", text: "Cos’è LightingMap" },
      {
        type: "paragraph",
        text: "LightingMap è una WebApp sviluppata dallo Studio Elettrotecnico Torelli ss per la gestione georeferenziata degli impianti di illuminazione pubblica. Permette di visualizzare su mappa tutti i punti luce, monitorarne lo stato, segnalare guasti e registrare interventi manutentivi.",
      },
      {
        type: "info",
        text: "LightingMap è una WebApp: non richiede installazione e funziona su qualsiasi dispositivo (PC, smartphone, tablet) con qualsiasi sistema operativo, utilizzando semplicemente il browser.",
      },
      { type: "heading2", text: "A chi è rivolto" },
      {
        type: "paragraph",
        text: "La piattaforma è destinata alle amministrazioni pubbliche e ai manutentori degli impianti. A seconda del ruolo assegnato (Amministratore, Super Amministratore, Manutentore) le funzionalità disponibili possono variare.",
      },
      { type: "heading2", text: "Come iniziare" },
      {
        type: "steps",
        items: [
          "Il censimento georeferenziato dei punti luce viene caricato sulla piattaforma dal team di Studio Torelli",
          "Viene creato il tuo account con le credenziali di accesso",
          "Accedi alla piattaforma dal browser e inizia a utilizzarla",
        ],
      },
    ],
  },
  {
    id: "login",
    icon: "⬡",
    title: "Accesso alla piattaforma",
    content: [
      { type: "heading", text: "Come accedere" },
      {
        type: "paragraph",
        text: "La schermata di accesso è composta da due campi: indirizzo email e password. Dopo aver inserito le credenziali, clicca il pulsante «Accedi» per entrare nella piattaforma.",
      },
      {
        type: "steps",
        items: [
          "Apri il browser e naviga all’indirizzo della piattaforma LightingMap",
          "Inserisci il tuo indirizzo email nel campo «Indirizzo email»",
          "Inserisci la password nel campo «Password» (usa l’icona a occhio per mostrarla o nasconderla)",
          "Clicca il pulsante «Accedi»",
        ],
      },
      {
        type: "warning",
        text: "Se le credenziali non sono corrette, la piattaforma mostra il messaggio «Credenziali non valide. Riprova.» in rosso sotto i campi. Verifica email e password e riprova.",
      },
      { type: "heading2", text: "Password dimenticata" },
      {
        type: "paragraph",
        text: "Sotto il pulsante «Accedi» è presente il link «Password dimenticata?». Cliccalo per avviare la procedura di recupero tramite email.",
      },
      { type: "heading2", text: "Primo accesso — Registrazione" },
      {
        type: "paragraph",
        text: "Se non hai ancora un account, clicca «Registrati» sotto il pulsante di accesso. La registrazione è gratuita per i clienti di Studio Torelli.",
      },
    ],
  },
  {
    id: "interfaccia",
    icon: "▦",
    title: "Interfaccia principale",
    content: [
      { type: "heading", text: "Barra di navigazione superiore" },
      {
        type: "paragraph",
        text: "Dopo il login, la schermata principale mostra la mappa dell’impianto. In alto è sempre visibile la barra di navigazione con i seguenti elementi:",
      },
      {
        type: "list",
        items: [
          "Barra di ricerca «Cerca…» — per trovare punti luce o quadri elettrici (vedi sezione Ricerca)",
          "Selettore tipo ricerca — il menu a tendina accanto alla barra permette di scegliere tra «Numero Palo» e «Quadro»",
          "Selettore comune — indica il comune attivo (es. «Villar Perosa»); se hai accesso a più comuni puoi cambiarlo da qui",
          "Profilo utente — in alto a destra mostra il nome e il ruolo dell’utente (es. «Super Amministratore»)",
        ],
      },
      { type: "heading2", text: "Pulsanti a sinistra della mappa" },
      {
        type: "list",
        items: [
          "«+» — aggiunge un nuovo punto luce sulla mappa",
          "Icona libro — apre il pannello con Azioni, Supporto, Preferenze e Visualizzazione",
          "Icona cursori — accesso rapido alle preferenze",
          "Icona imbuto — apre i filtri per la mappa",
        ],
      },
      { type: "heading2", text: "Controlli della mappa" },
      {
        type: "list",
        items: [
          "«+» e «−» in alto a destra sulla mappa — zoom avanti e indietro",
          "Icona freccia (↑) — orienta la mappa verso nord",
          "Icona mirino — centra la mappa sulla tua posizione GPS",
        ],
      },
    ],
  },
  {
    id: "mappa",
    icon: "◎",
    title: "Navigazione della mappa",
    content: [
      { type: "heading", text: "Visualizzazione dei punti luce" },
      {
        type: "paragraph",
        text: "I punti luce sulla mappa sono rappresentati da cerchi colorati. Il colore indica il quadro elettrico di appartenenza: ogni quadro ha un colore diverso, rendendo immediata la lettura dell’impianto per zone.",
      },
      { type: "heading2", text: "Stile mappa: Classica e Satellite" },
      {
        type: "paragraph",
        text: "In alto a sinistra compare il toggle «Classica». Nella modalità Complessa è disponibile anche il pulsante «Satellite» per passare alla vista aerea.",
      },
      {
        type: "list",
        items: [
          "Classica — mappa stradale con sfondo chiaro",
          "Satellite — vista aerea fotografica del territorio (disponibile in modalità Complessa)",
        ],
      },
      { type: "heading2", text: "Modalità Semplice e Complessa" },
      {
        type: "paragraph",
        text: "Dal pannello laterale (icona libro), nella sezione «Visualizzazione», puoi scegliere tra:",
      },
      {
        type: "list",
        items: [
          "Semplice — i punti luce appaiono come cerchi colorati con il numero palo accanto; più leggibile a distanza",
          "Complessa — i punti luce appaiono come spilli (pin) con etichette numerate; più utile a zoom ravvicinato per l’identificazione precisa",
        ],
      },
      { type: "heading2", text: "Navigare sulla mappa" },
      {
        type: "list",
        items: [
          "Zoom: usa i pulsanti +/− oppure la rotella del mouse (PC) o il gesto di pinch (touch)",
          "Spostamento: tieni premuto e trascina sulla mappa",
          "Clicca su un punto luce per aprire la sua scheda di dettaglio",
        ],
      },
    ],
  },
  {
    id: "preferenze",
    icon: "◧",
    title: "Pannello e preferenze",
    content: [
      { type: "heading", text: "Il pannello laterale" },
      {
        type: "paragraph",
        text: "Cliccando sull’icona libro a sinistra della mappa si apre un pannello con quattro sezioni. Per chiuderlo clicca la X in basso.",
      },
      { type: "heading2", text: "AZIONI" },
      {
        type: "list",
        items: [
          "Statistiche impianto — apre la panoramica del sistema con dati numerici, grafici e segnalazioni",
          "Scarica report — scarica un report dell’impianto direttamente sul dispositivo",
        ],
      },
      { type: "heading2", text: "SUPPORTO" },
      {
        type: "list",
        items: [
          "FAQ — domande frequenti sull’utilizzo della piattaforma",
          "Scopri di più — informazioni aggiuntive su LightingMap",
        ],
      },
      { type: "heading2", text: "PREFERENZE" },
      {
        type: "list",
        items: [
          "Mostra numero quadro — toggle on/off per mostrare l’identificativo del quadro sui punti in mappa",
          "Mostra numero palo — toggle on/off per mostrare il numero del palo in mappa",
        ],
      },
      { type: "heading2", text: "VISUALIZZAZIONE" },
      {
        type: "paragraph",
        text: "Toggle Semplice/Complessa per cambiare la modalità di visualizzazione dei punti luce sulla mappa (vedi sezione Mappa per i dettagli).",
      },
    ],
  },
  {
    id: "ricerca",
    icon: "⊕",
    title: "Ricerca",
    content: [
      { type: "heading", text: "Barra di ricerca" },
      {
        type: "paragraph",
        text: "La barra «Cerca…» in alto permette di trovare rapidamente un punto luce o un quadro elettrico. Prima di digitare seleziona il tipo dal menu a tendina accanto alla barra.",
      },
      { type: "heading2", text: "Ricerca per Numero Palo" },
      {
        type: "steps",
        items: [
          "Clicca il menu a tendina e seleziona «Numero Palo»",
          "Clicca nella barra di ricerca e digita il numero del palo (es. 2001)",
          "Mentre digiti appare un elenco di suggerimenti con i punti luce corrispondenti e il loro indirizzo",
          "Clicca sul risultato: la mappa si centrerà su quel punto luce",
        ],
      },
      { type: "heading2", text: "Ricerca per Quadro" },
      {
        type: "steps",
        items: [
          "Clicca il menu a tendina e seleziona «Quadro»",
          "Clicca nella barra di ricerca: appaiono tutti i quadri disponibili (es. PC01, PC02…) con il loro indirizzo",
          "Clicca sul quadro desiderato per centrare la mappa su di esso",
        ],
      },
      {
        type: "info",
        text: "Nei suggerimenti, accanto ad ogni punto luce è visibile il nome della via, utile per distinguere punti con numeri simili.",
      },
    ],
  },
  {
    id: "punto-luce",
    icon: "◉",
    title: "Scheda punto luce",
    content: [
      { type: "heading", text: "Aprire la scheda" },
      {
        type: "paragraph",
        text: "Cliccando su un qualsiasi punto luce sulla mappa si apre una scheda con tutte le informazioni tecniche censite per quel punto.",
      },
      { type: "heading2", text: "Informazioni visualizzate" },
      {
        type: "list",
        items: [
          "Numero palo — identificativo univoco del palo",
          "Composizione punto — es. Singolo, Doppio",
          "Indirizzo — via e numero civico",
          "Lotto — lotto di riferimento (N.D. se non disponibile)",
          "Quadro — quadro elettrico di appartenenza (es. PC04)",
          "Proprietà — es. Municipale",
          "Tipo apparecchio — es. Lanterna, Stradale, Decorativo, Lampara, Proiettore",
          "Marca apparecchio — marca dell’apparecchio",
          "Modello apparecchio — modello specifico dell’apparecchio",
          "Numero apparecchi — quanti apparecchi sono montati sul palo",
          "Tipo lampada — tecnologia (es. LED, SAP, FLUO)",
          "Potenza lampada — potenza in watt (es. 70)",
          "Tipo sostegno — es. Palo artistico per lanterna",
          "Altezza sostegno — altezza del sostegno",
          "Tipo linea — es. Cavo interrato con pozzetti",
          "Promiscuità — presenza di altri servizi sulla stessa linea",
          "Note — annotazioni libere",
          "Garanzia — data o stato garanzia",
          "Data creazione — data e ora di inserimento nel sistema",
        ],
      },
      { type: "heading2", text: "Pulsanti di azione" },
      {
        type: "list",
        items: [
          "Street View — apre Google Street View nel punto esatto del palo",
          "Vai al punto — avvia la navigazione GPS verso il punto luce",
          "Risolvi — registra un intervento di manutenzione su quel punto (vedi sezione Operazioni)",
          "Segnala — apre il form per segnalare un guasto (vedi sezione Segnalazioni)",
          "Modifica — modifica i dati tecnici del punto luce",
          "Elimina — elimina definitivamente il punto luce dal sistema",
        ],
      },
      {
        type: "warning",
        text: "I pulsanti «Modifica» ed «Elimina» potrebbero non essere visibili a tutti gli utenti: la loro disponibilità dipende dal ruolo assegnato all’account.",
      },
    ],
  },
  {
    id: "segnalazioni",
    icon: "◫",
    title: "Segnalare un guasto",
    content: [
      { type: "heading", text: "Come segnalare un guasto" },
      {
        type: "paragraph",
        text: "Quando noti un malfunzionamento su un punto luce, puoi inviare una segnalazione direttamente dalla sua scheda. La segnalazione viene notificata al manutentore responsabile dell’area.",
      },
      {
        type: "steps",
        items: [
          "Trova il punto luce sulla mappa e cliccaci sopra per aprire la scheda",
          "Clicca il pulsante «Segnala»",
          "Nel form «Segnala guasto» verifica i dati precompilati: N° Punto Luce, Indirizzo e Segnalante",
          "Seleziona il «Tipo di guasto» dal menu a tendina (es. «Punto luce spento»)",
          "Se necessario, aggiungi ulteriori dettagli nel campo «Descrizione»",
          "Clicca «Invia Segnalazione» per inviare",
        ],
      },
      {
        type: "info",
        text: "I campi N° Punto Luce, Indirizzo e Segnalante vengono compilati automaticamente dal sistema in base al punto selezionato e all’utente connesso.",
      },
      { type: "heading2", text: "Monitorare le segnalazioni" },
      {
        type: "paragraph",
        text: "Lo stato delle segnalazioni è consultabile nella sezione «Statistiche Impianto» → tab «Segnalazioni», che riepiloga segnalazioni in corso, risolte e operazioni totali.",
      },
    ],
  },
  {
    id: "operazioni",
    icon: "◬",
    title: "Registrare un’operazione",
    content: [
      { type: "heading", text: "Cos’è un’operazione" },
      {
        type: "paragraph",
        text: "Le operazioni rappresentano gli interventi di manutenzione eseguiti su un punto luce. Possono essere collegati a una segnalazione esistente oppure registrati autonomamente per lavori non preceduti da segnalazione.",
      },
      {
        type: "steps",
        items: [
          "Clicca sul punto luce dalla mappa per aprire la scheda",
          "Clicca il pulsante «Risolvi»",
          "Nel form «Registra Operazione» verifica l’ID Punto Luce e l’utente registrante",
          "Dal menu «Seleziona Problema da Risolvere» scegli la segnalazione collegata, oppure seleziona «Risolvi guasto senza segnalazione» per interventi non preceduti da segnalazione",
          "Dal menu «Tipo di Operazione» seleziona il tipo di intervento effettuato (es. «Messa in sicurezza ma da ripristinare impianto»)",
          "Seleziona il «Tipo di Manutenzione»: Ordinaria o Straordinaria",
          "Aggiungi eventuali dettagli nel campo «Note»",
          "Clicca «Registra Operazione» per salvare",
        ],
      },
      {
        type: "warning",
        text: "Seleziona «Risolvi guasto senza segnalazione» solo se stai risolvendo un problema che non era stato precedentemente segnalato tramite la piattaforma.",
      },
      {
        type: "info",
        text: "Clicca «Annulla e torna alla dashboard» in qualsiasi momento per uscire dal form senza salvare.",
      },
    ],
  },
  {
    id: "statistiche",
    icon: "◪",
    title: "Statistiche impianto",
    content: [
      { type: "heading", text: "Panoramica del Sistema" },
      {
        type: "paragraph",
        text: "La sezione «Statistiche Impianto», accessibile dal pannello laterale → Azioni → Statistiche impianto, offre una panoramica completa dell’impianto organizzata in tre tab.",
      },
      { type: "heading2", text: "Tab Statistiche" },
      {
        type: "list",
        items: [
          "Statistiche Generali: Punti Totali, Apparecchi Totali, Quadri Totali, Segnalazioni Attive",
          "Punti Luce per Proprietà: suddivisione per tipo di proprietà (es. Municipale)",
          "Punti Luce per Tipo di Apparecchio: Decorativo, Stradale, Lampara, Lanterna, Proiettore",
          "Punti Luce per Tipo di Lampada (visibile scorrendo verso il basso)",
        ],
      },
      { type: "heading2", text: "Tab Grafici" },
      {
        type: "paragraph",
        text: "Presenta le stesse informazioni in forma visiva tramite grafici a ciambella (donut chart). Ogni fetta del grafico è colorata e riporta l’etichetta con il valore numerico.",
      },
      { type: "heading2", text: "Tab Segnalazioni" },
      {
        type: "list",
        items: [
          "Segnalazioni in Corso — segnalazioni aperte non ancora risolte",
          "Segnalazioni Risolte — segnalazioni chiuse",
          "Operazioni Totali — totale degli interventi registrati",
        ],
      },
      {
        type: "info",
        text: "Se non ci sono segnalazioni attive, il sistema mostra «Nessuna Segnalazione — Non sono presenti segnalazioni o operazioni per l’area selezionata».",
      },
      { type: "heading2", text: "Scaricare il report" },
      {
        type: "paragraph",
        text: "Dal pannello laterale → AZIONI → «Scarica report» è possibile esportare i dati dell’impianto. Il file viene scaricato direttamente sul dispositivo in uso.",
      },
    ],
  },
]

const SECTION_ICON_COMPONENTS = {
  intro: BookOpen,
  login: Home,
  interfaccia: LayoutPanelLeft,
  mappa: MapIcon,
  preferenze: Gauge,
  ricerca: Search,
  "punto-luce": MapPin,
  segnalazioni: AlertTriangle,
  operazioni: Wrench,
  statistiche: Info,
}

const normalizeLabel = (value) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()

const ContentBlock = ({ block, relatedLinks = [], onGoToSection }) => {
  const renderRelatedLinks = () => {
    if (relatedLinks.length === 0) return null

    return (
      <div className="mt-2 mb-4 flex flex-wrap gap-2">
        {relatedLinks.map((link) => (
          <button
            key={link.id}
            type="button"
            onClick={() => onGoToSection(link.id)}
            className="inline-flex items-center gap-2 rounded-lg border border-blue-500/30 bg-blue-950/40 px-3 py-1.5 text-xs font-medium text-blue-200 transition-colors hover:bg-blue-800/40 hover:text-white"
          >
            <Search className="h-3.5 w-3.5" />
            Vedi sezione {link.title}
          </button>
        ))}
      </div>
    )
  }

  switch (block.type) {
    case "heading":
      return <h2 className="text-2xl font-semibold text-blue-100 mt-0 mb-4">{block.text}</h2>
    case "heading2":
      return (
        <h3 className="text-xs uppercase tracking-[0.14em] font-semibold text-blue-300 mt-8 mb-3">
          {block.text}
        </h3>
      )
    case "paragraph":
      return (
        <>
          <p className="text-sm leading-7 text-slate-300 mb-4">{block.text}</p>
          {renderRelatedLinks()}
        </>
      )
    case "list":
      return (
        <>
          <ul className="space-y-2 mb-4">
          {block.items.map((item, index) => (
            <li key={`${item}-${index}`} className="flex items-start gap-2 text-slate-300 text-sm leading-7">
              <List className="w-4 h-4 text-blue-400 mt-1 shrink-0" />
              <span>{item}</span>
            </li>
          ))}
          </ul>
          {renderRelatedLinks()}
        </>
      )
    case "steps":
      return (
        <>
          <ol className="space-y-3 mb-4">
          {block.items.map((item, index) => (
            <li key={`${item}-${index}`} className="flex items-start gap-3 text-slate-300 text-sm leading-7">
              <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-blue-500/40 bg-blue-900/50 text-xs font-semibold text-blue-200">
                {index + 1}
              </span>
              <span>{item}</span>
            </li>
          ))}
          </ol>
          {renderRelatedLinks()}
        </>
      )
    case "info":
      return (
        <div className="mb-4 rounded-lg border border-blue-500/30 bg-blue-900/30 p-4 text-sm text-blue-100">
          <p className="flex items-start gap-2 leading-7">
            <Info className="mt-1 h-4 w-4 shrink-0 text-blue-300" />
            <span>{block.text}</span>
          </p>
        </div>
      )
    case "warning":
      return (
        <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-900/20 p-4 text-sm text-amber-100">
          <p className="flex items-start gap-2 leading-7">
            <AlertTriangle className="mt-1 h-4 w-4 shrink-0 text-amber-300" />
            <span>{block.text}</span>
          </p>
        </div>
      )
    default:
      return null
  }
}

const Manual = () => {
  const navigate = useNavigate()
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [activeSectionId, setActiveSectionId] = useState(MANUAL_SECTIONS[0].id)
  const sectionLabelToId = useMemo(() => {
    const map = new Map()
    MANUAL_SECTIONS.forEach((section) => {
      map.set(normalizeLabel(section.title), section.id)
    })
    return map
  }, [])

  const activeSectionIndex = useMemo(
    () => MANUAL_SECTIONS.findIndex((section) => section.id === activeSectionId),
    [activeSectionId],
  )
  const activeSection = MANUAL_SECTIONS[activeSectionIndex]
  const previousSection = activeSectionIndex > 0 ? MANUAL_SECTIONS[activeSectionIndex - 1] : null
  const nextSection =
    activeSectionIndex < MANUAL_SECTIONS.length - 1 ? MANUAL_SECTIONS[activeSectionIndex + 1] : null

  const selectSection = (sectionId) => {
    setActiveSectionId(sectionId)
    window.scrollTo({ top: 0, behavior: "smooth" })
    if (window.innerWidth < 1024) setIsSidebarOpen(false)
  }

  const getLinksForBlock = (block) => {
    const texts = []
    if (typeof block.text === "string") texts.push(block.text)
    if (Array.isArray(block.items)) texts.push(...block.items)
    const foundIds = new Set()

    texts.forEach((text) => {
      const matches = text.matchAll(/vedi sezione\s+([^)—.,;]+)/gi)
      for (const match of matches) {
        const rawTitle = match[1]?.trim()
        if (!rawTitle) continue
        const normalizedTitle = normalizeLabel(rawTitle)
        const linkedSectionId = sectionLabelToId.get(normalizedTitle)
        if (linkedSectionId && linkedSectionId !== activeSectionId) {
          foundIds.add(linkedSectionId)
        }
      }
    })

    return Array.from(foundIds).map((id) => {
      const targetSection = MANUAL_SECTIONS.find((section) => section.id === id)
      return { id, title: targetSection?.title || id }
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
      <header className="sticky top-0 z-20 border-b border-blue-500/30 bg-black/70 backdrop-blur-xl ">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4 md:px-6">
          <button
            type="button"
            onClick={() => setIsSidebarOpen((current) => !current)}
            className="rounded-lg border border-blue-500/30 bg-blue-950/40 p-2 text-blue-300 transition-colors hover:bg-blue-800/40 hover:text-blue-100"
            aria-label={isSidebarOpen ? "Chiudi sezioni" : "Apri sezioni"}
          >
            {isSidebarOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
          </button>
          <Logo className="h-18 w-18" onClick={() => navigate("/dashboard")} />
          <p className="text-sm font-semibold text-blue-100">Manuale operativo</p>
          <span className="text-xs uppercase tracking-wider text-blue-300/70 whitespace-nowrap">
            {activeSectionIndex + 1} / {MANUAL_SECTIONS.length}
          </span>
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="ml-auto inline-flex items-center gap-2 rounded-lg border border-blue-500/30 bg-blue-950/40 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-blue-200 transition-colors hover:bg-blue-800/40 hover:text-white"
          >
            <Home className="h-4 w-4" />
            
          </button>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl">
        {isSidebarOpen && (
          <button
            type="button"
            aria-label="Chiudi menu sezioni"
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 top-14 z-10 bg-black/55 lg:hidden"
          />
        )}
        <aside
          className={`shrink-0 overflow-hidden border-r border-blue-500/30 transition-all duration-200
            fixed left-0 top-14 z-20 h-[calc(100vh-3.5rem)] w-72 overflow-y-auto scrollbar-app bg-black/90
            lg:sticky lg:top-14 lg:z-0 lg:h-[calc(100vh-3.5rem)] lg:translate-x-0 lg:bg-transparent
            ${isSidebarOpen ? "translate-x-0 lg:w-72" : "-translate-x-full lg:w-0 lg:border-r-0"}
          `}
        >
          <div className="w-72 p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-blue-300/80">Sezioni</p>
            <nav className="space-y-1">
              {MANUAL_SECTIONS.map((section) => {
                const isActive = section.id === activeSectionId
                const SectionIcon = SECTION_ICON_COMPONENTS[section.id] || BookOpen
                return (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => selectSection(section.id)}
                    className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                      isActive
                        ? "border-blue-400/50 bg-blue-900/50 text-blue-100"
                        : "border-transparent text-slate-300 hover:border-blue-500/30 hover:bg-blue-900/30 hover:text-blue-100"
                    }`}
                  >
                    <SectionIcon className="h-4 w-4 shrink-0 text-blue-300" />
                    <span>{section.title}</span>
                  </button>
                )
              })}
            </nav>
          </div>
        </aside>

        <main className="flex-1 p-4 md:p-6 lg:pl-6">
          <div className="rounded-xl border border-blue-500/30 bg-black/50 p-5 md:p-7">
            <div className="mb-6 flex items-center gap-3">
              {(() => {
                const HeaderIcon = SECTION_ICON_COMPONENTS[activeSection.id] || BookOpen
                return <HeaderIcon className="h-5 w-5 text-blue-300" />
              })()}
              <div>
                <p className="text-xs uppercase tracking-wider text-blue-300/80">
                  Sezione {activeSectionIndex + 1}
                </p>
                <h1 className="text-2xl font-semibold text-blue-100">{activeSection.title}</h1>
              </div>
            </div>

            <div>
              {activeSection.content.map((block, index) => (
                <ContentBlock
                  key={`${activeSection.id}-${block.type}-${index}`}
                  block={block}
                  relatedLinks={getLinksForBlock(block)}
                  onGoToSection={selectSection}
                />
              ))}
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-blue-500/30 pt-5">
              {previousSection ? (
                <button
                  type="button"
                  onClick={() => selectSection(previousSection.id)}
                  className="inline-flex items-center gap-2 rounded-lg border border-blue-500/30 bg-blue-950/40 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-blue-200 transition-colors hover:bg-blue-800/40 hover:text-white"
                >
                  <ChevronLeft className="h-4 w-4" />
                  {previousSection.title}
                </button>
              ) : (
                <div />
              )}

              {nextSection ? (
                <button
                  type="button"
                  onClick={() => selectSection(nextSection.id)}
                  className="inline-flex items-center gap-2 rounded-lg border border-blue-500/30 bg-blue-950/40 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-blue-200 transition-colors hover:bg-blue-800/40 hover:text-white"
                >
                  {nextSection.title}
                  <ChevronRight className="h-4 w-4" />
                </button>
              ) : (
                <div />
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export default Manual
