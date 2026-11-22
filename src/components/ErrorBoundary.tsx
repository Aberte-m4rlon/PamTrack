import React from 'react';
import { RefreshCw, ShieldAlert } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string | null;
}

export class GlassErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error?.message || 'An unexpected application error occurred.',
    };
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="pamasahe-scenic-bg min-h-screen flex items-center justify-center p-4 text-[#24191D]">
        <div className="glass-card-strong liquid-glass-sheen max-w-lg w-full rounded-[30px] p-6 sm:p-8 space-y-4 text-center">
          <div className="glass-pill-tile mx-auto flex h-12 w-12 items-center justify-center rounded-full text-[#DC2626]">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <h1 className="font-display text-2xl font-extrabold text-[#24191D]">
            Something went wrong
          </h1>
          <p className="text-sm text-[#78716C]">
            Pamasahe Tracker encountered a temporary display error and prevented a blank screen.
          </p>
          {this.state.errorMessage && (
            <p className="glass-pill-tile rounded-2xl px-3 py-2 text-xs font-mono text-[#B91C1C] break-words">
              {this.state.errorMessage}
            </p>
          )}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="liquid-btn-primary inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white transition"
            >
              <RefreshCw className="h-4 w-4" />
              Reload Application
            </button>
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false, errorMessage: null });
                window.location.href = '/';
              }}
              className="liquid-btn-secondary inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition"
            >
              Return Home
            </button>
          </div>
        </div>
      </div>
    );
  }
}
