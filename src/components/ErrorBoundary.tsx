import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Catches render errors so a bug shows a message and a way out instead of a
 * blank page. Your project is still in browser storage — reloading recovers it.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Unhandled error", error, info);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md space-y-4">
          <h1 className="text-xl font-semibold text-neutral-900">
            Something went wrong
          </h1>
          <p className="text-sm text-neutral-600">
            Your project is saved in this browser, so reloading should bring it
            back. If it keeps happening, please report it with the details
            below.
          </p>
          <pre className="text-xs bg-neutral-100 text-neutral-700 rounded-lg p-3 overflow-auto max-h-40">
            {error.message}
          </pre>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="flex-1 bg-indigo-600 text-white py-2.5 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
            >
              Reload
            </button>
            <a
              href="https://github.com/ElProton/timeLineManager/issues/new?template=bug_report.yml"
              target="_blank"
              rel="noreferrer"
              className="flex-1 text-center bg-white text-neutral-700 py-2.5 rounded-lg font-medium border border-neutral-300 hover:bg-neutral-50 transition-colors"
            >
              Report it
            </a>
          </div>
        </div>
      </div>
    );
  }
}
