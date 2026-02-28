import { Component, type ErrorInfo, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Custom fallback UI. Receives the error and a reset function. */
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * React class-based Error Boundary.
 *
 * Wraps any subtree to catch render / lifecycle errors and show a fallback UI
 * instead of a blank white screen.
 *
 * Usage:
 * ```tsx
 * <ErrorBoundary>
 *   <MyComponent />
 * </ErrorBoundary>
 *
 * // With custom fallback:
 * <ErrorBoundary fallback={(err, reset) => <MyFallback error={err} onReset={reset} />}>
 *   <MyComponent />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary] Caught error:", error, info.componentStack);
  }

  reset = () => {
    this.setState({ error: null });
  };

  override render() {
    const { error } = this.state;
    const { children, fallback } = this.props;

    if (error) {
      if (fallback) return fallback(error, this.reset);
      return <DefaultErrorFallback error={error} reset={this.reset} />;
    }

    return children;
  }
}

function DefaultErrorFallback({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100dvh",
        padding: "2rem",
        fontFamily: "system-ui, sans-serif",
        background: "#0a0a0a",
        color: "#e5e5e5",
      }}
    >
      <div
        style={{
          maxWidth: 480,
          width: "100%",
          background: "#1a1a1a",
          border: "1px solid #333",
          borderRadius: 12,
          padding: "2rem",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 48, marginBottom: "1rem" }}>⚠️</div>
        <h2 style={{ margin: "0 0 0.5rem", fontSize: 20, fontWeight: 600 }}>
          出错了 / Something went wrong
        </h2>
        <p
          style={{
            margin: "0 0 1.5rem",
            fontSize: 14,
            color: "#888",
            wordBreak: "break-all",
          }}
        >
          {error.message}
        </p>
        <button
          type="button"
          onClick={reset}
          style={{
            padding: "0.5rem 1.5rem",
            background: "#3b82f6",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            fontSize: 14,
            cursor: "pointer",
          }}
        >
          重试 / Retry
        </button>
      </div>
    </div>
  );
}
