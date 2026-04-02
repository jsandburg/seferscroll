/**
 * components/ErrorBoundary.jsx
 *
 * React class component Error Boundary. Catches render-time errors in any
 * child component and shows a useful recovery UI instead of a blank page.
 *
 * Must be a class component — React does not support error boundaries as
 * function components (hooks cannot catch render errors).
 */

import { Component } from 'react';
import { THEME } from '../constants/theme.js';

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary] Render error caught:', error, info);
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div style={{
        minHeight: '100vh',
        background: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
        fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
        color: '#36454f',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>
          Something went wrong
        </div>
        <div style={{
          fontSize: 13, color: '#708090', marginBottom: 24, maxWidth: 400, lineHeight: 1.6,
        }}>
          The simulator encountered an error. This can happen if a saved hearing
          profile is in an older format. Refreshing the page will restore normal function.
        </div>
        {this.state.error?.message && (
          <div style={{
            fontSize: 11, color: '#9aa5ad',
            fontFamily: '"Courier New", monospace',
            background: '#f5f5f5',
            border: '1px solid #d3d3d3',
            borderRadius: 4,
            padding: '10px 14px',
            marginBottom: 24,
            maxWidth: 500,
            textAlign: 'left',
            wordBreak: 'break-word',
          }}>
            {this.state.error.message}
          </div>
        )}
        <button
          type="button"
          onClick={() => window.location.reload()}
          style={{
            padding: '10px 24px',
            background: '#36454f',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer',
            fontSize: 13,
            fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
            color: '#ffffff',
            marginBottom: 12,
          }}
        >
          Refresh page
        </button>
        <button
          type="button"
          onClick={() => {
            try { localStorage.removeItem('hearing-sim-custom-audiograms'); } catch (_) {}
            window.location.reload();
          }}
          style={{
            padding: '8px 16px',
            background: 'none',
            border: '1px solid #d3d3d3',
            borderRadius: 4,
            cursor: 'pointer',
            fontSize: 11,
            fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
            color: '#708090',
          }}
        >
          Clear saved audiograms and refresh
        </button>
      </div>
    );
  }
}
