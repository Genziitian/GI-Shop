import React from 'react';

// Keeps one broken tab from blanking the whole app. Resets when `resetKey` changes.
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('UI crashed:', error, info?.componentStack);
  }

  componentDidUpdate(prev) {
    if (this.state.error && prev.resetKey !== this.props.resetKey) this.setState({ error: null });
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="cx-empty" style={{ margin: '1rem 0' }}>
        <div className="cx-empty-title">Something went wrong</div>
        <p className="cx-empty-sub">This section could not be displayed.</p>
        <button type="button" className="btn" onClick={() => { this.setState({ error: null }); this.props.onRetry?.(); }}>
          Try again
        </button>
      </div>
    );
  }
}
