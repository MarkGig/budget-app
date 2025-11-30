import React from 'react'

type State = { hasError: boolean; error?: Error | null }

export default class ErrorBoundary extends React.Component<React.PropsWithChildren, State> {
  constructor(props: React.PropsWithChildren) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: any) {
    // You could log this to an external service
    // console.error('Unhandled error captured by ErrorBoundary', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 max-w-3xl mx-auto mt-8 bg-red-50 border border-red-200 rounded">
          <h2 className="text-lg font-semibold text-red-700">Une erreur est survenue</h2>
          <pre className="mt-2 text-xs text-red-800 whitespace-pre-wrap">{String(this.state.error)}</pre>
          <p className="mt-2 text-sm text-gray-600">Ouvrez la console du navigateur (F12) pour plus de détails.</p>
        </div>
      )
    }

    return this.props.children
  }
}
