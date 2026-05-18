import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Uncaught render error", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: "2rem", fontFamily: "monospace", color: "#f87171" }}>
          <h2>Something went wrong.</h2>
          <pre style={{ whiteSpace: "pre-wrap", fontSize: "0.85rem" }}>
            {this.state.error.message}
          </pre>
          <button
            onClick={() => this.setState({ error: null })}
            style={{ marginTop: "1rem", padding: "0.4rem 1rem", cursor: "pointer" }}
            type="button"
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
