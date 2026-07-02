import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Top-level error boundary so a render exception (e.g. in a chart) degrades
 * to a recoverable message instead of a blank page.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6 dark:bg-brand-900">
        <div className="max-w-md rounded-xl border border-red-200 bg-white p-6 text-center shadow-card dark:border-red-800 dark:bg-brand-800">
          <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
            Something went wrong
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            The dashboard hit an unexpected rendering error. Reloading usually fixes it.
          </p>
          <p className="mt-2 break-words font-mono text-xs text-red-600 dark:text-red-400">
            {this.state.error.message}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-4 rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700 dark:bg-accent-700 dark:hover:bg-accent-600"
          >
            Reload app
          </button>
        </div>
      </div>
    );
  }
}
