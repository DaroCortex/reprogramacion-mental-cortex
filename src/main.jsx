import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import IosUxWebPreview from "./ios-ux-preview/IosUxWebPreview.jsx";
import "./styles.css";

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorMessage: "" };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      errorMessage: error?.message || "Error inesperado"
    };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 24, fontFamily: "system-ui, sans-serif" }}>
          <h2 style={{ marginBottom: 8 }}>Se produjo un error en la app</h2>
          <p style={{ margin: 0, opacity: 0.8 }}>
            {this.state.errorMessage}
          </p>
          <p style={{ marginTop: 10, opacity: 0.7 }}>
            Recarga la página. Si persiste, avisa este mensaje al administrador.
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}

const root = createRoot(document.getElementById("root"));
const RootApp = import.meta.env.DEV && window.location.pathname === "/ux-ios-preview"
  ? IosUxWebPreview
  : App;
root.render(
  <AppErrorBoundary>
    <RootApp />
  </AppErrorBoundary>
);
