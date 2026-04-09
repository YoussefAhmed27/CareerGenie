import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("3D Component Crashed:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // Fallback UI if the 3D model crashes
      return (
        <mesh>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="red" />
        </mesh>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;