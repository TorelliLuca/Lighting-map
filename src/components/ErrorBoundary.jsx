import React from "react";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Qui puoi loggare l'errore su un servizio esterno se vuoi
    if (process.env.NODE_ENV !== "production") {
      console.error("Errore catturato da ErrorBoundary:", error, errorInfo);
    }
  }

  handleReload = () => {
    if (this.props.onReload) {
      this.props.onReload();
    } else {
      // Fallback: ricarica la pagina (PWA friendly, ricarica solo se necessario)
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full min-h-[60vh] p-8 bg-white dark:bg-gray-900">
          <h2 className="text-2xl font-bold mb-4 text-red-600 dark:text-red-400">Qualcosa è andato storto nella mappa.</h2>
          <p className="mb-4 text-gray-700 dark:text-gray-200">Riprova a ricaricare la pagina o contatta l'assistenza se il problema persiste.</p>
          <button
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition font-semibold shadow"
            onClick={this.handleReload}
          >
            Ricarica la mappa
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary; 