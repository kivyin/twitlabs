import { Component } from "react";
import { reportClientError } from "../api/logsApi";
import ErrorPage from "../pages/ErrorPage";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Unhandled application error:", error, errorInfo);
    reportClientError({
      message: error?.message || "Unhandled React error",
      stack: error?.stack || null,
      function_name: "ErrorBoundary.componentDidCatch",
      component_stack: errorInfo?.componentStack || null,
      data: {
        type: "react_error_boundary",
        componentStack: errorInfo?.componentStack || null,
      },
    });
  }

  handleRetry = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback({
          error: this.state.error,
          retry: this.handleRetry,
        });
      }

      return (
        <ErrorPage
          error={this.state.error}
          onRetry={this.handleRetry}
          showHomeLink={this.props.showHomeLink ?? true}
        />
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
