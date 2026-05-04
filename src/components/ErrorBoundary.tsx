import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Logger } from '@/utils/logger';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    Logger.error('ErrorBoundary', 'Uncaught error', {
      message: error.message,
      stack: error.stack?.substring(0, 300),
      componentStack: info.componentStack?.substring(0, 300),
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.message}>{this.state.error?.message}</Text>
          <TouchableOpacity style={styles.button} onPress={this.handleReset} activeOpacity={0.8}>
            <Text style={styles.buttonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    padding: 32,
  },
  title: { fontSize: 20, fontWeight: '700', color: '#FF9900', marginBottom: 12 },
  message: { fontSize: 14, color: '#a0a0b0', textAlign: 'center', marginBottom: 24 },
  button: {
    backgroundColor: '#FF9900',
    borderRadius: 12,
    paddingHorizontal: 32,
    paddingVertical: 14,
  },
  buttonText: { fontSize: 15, fontWeight: '600', color: '#1a1a2e' },
});
