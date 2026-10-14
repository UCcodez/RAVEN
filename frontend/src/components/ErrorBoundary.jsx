import { Component } from "react";

export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div role="alert" style={{ padding: 32, color: "#fff" }}>
        <h2>Something went wrong on this screen</h2>
        <pre style={{ whiteSpace: "pre-wrap" }}>{String(this.state.error.stack)}</pre>
        <a href="/" style={{ color: "#fff" }}>Back to upload</a>
      </div>
    );
  }
}
