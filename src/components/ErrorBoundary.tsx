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
      errorMessage: error?.message || 'Nagkaroon ng hindi inaasahang error sa page.',
    };
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="pamasahe-scenic-bg min-h-screen flex items-center justify-center p-4 text-[#29262B]">
        <div className="glass-card-strong liquid-glass-sheen liquid-page-enter max-w-lg w-full rounded-[30px] p-6 sm:p-8 space-y-4 text-center">
          <div className="glass-pill-tile mx-auto flex h-12 w-12 items-center justify-center rounded-full text-[#C9182B]">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <h1 className="font-display text-2xl font-extrabold text-[#29262B]">
            May kaunting problema lang
          </h1>
          <p className="text-sm text-[#777078]">
            Nagkaroon ng pansamantalang display error ang Pamasahe Tracker pero naiwasan ang blank screen.
          </p>
          {this.state.errorMessage && (
            <p className="glass-pill-tile rounded-2xl px-3 py-2 text-xs font-mono text-[#B51224] break-words">
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
              I-reload ang App
            </button>
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false, errorMessage: null });
                window.location.href = '/';
              }}
              className="liquid-btn-secondary inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition"
            >
              Bumalik sa Home
            </button>
          </div>
        </div>
      </div>
    );
  }
}
