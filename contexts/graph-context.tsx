'use client'

import type { GraphInfo } from '@robosystems/client'
import * as SDK from '@robosystems/client'
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'
import { unwrapSdk } from '../lib/sdk-errors'

// Generic graph state that can be extended by apps
export interface GraphState {
  graphs: GraphInfo[]
  currentGraphId: string | null
  isLoading: boolean
  error: string | null
}

// Base context value that apps can extend
export interface GraphContextValue<T extends GraphState = GraphState> {
  // State
  state: T
  // Core actions
  loadGraphs: () => Promise<void>
  setCurrentGraph: (graphId: string) => Promise<void>
  refreshGraphs: () => Promise<void>
}

// Factory function to create a typed graph context
export function createGraphContext<T extends GraphState = GraphState>() {
  return createContext<GraphContextValue<T> | null>(null)
}

// Props for the provider
export interface GraphProviderProps<T extends GraphState = GraphState> {
  children: React.ReactNode
  // Optional initial graph ID (from cookies/server)
  initialGraphId?: string | null
  // Optional graph filter (e.g., only graphs with certain extensions)
  graphFilter?: (graph: GraphInfo) => boolean
  // Optional state transformer for app-specific needs
  transformState?: (baseState: GraphState) => T
  // Server action to persist graph selection
  persistGraphSelection: (graphId: string) => Promise<void>
}

// Generic provider factory
export function createGraphProvider<T extends GraphState = GraphState>(
  Context: React.Context<GraphContextValue<T> | null>
) {
  return function GraphProvider({
    children,
    initialGraphId,
    graphFilter,
    transformState,
    persistGraphSelection,
  }: GraphProviderProps<T>) {
    const [baseState, setBaseState] = useState<GraphState>({
      graphs: [],
      currentGraphId: initialGraphId ?? null,
      isLoading: false,
      error: null,
    })

    // Latest graph list, readable synchronously from callbacks
    const graphsRef = useRef(baseState.graphs)
    graphsRef.current = baseState.graphs

    // Transform state if needed
    const state = transformState ? transformState(baseState) : (baseState as T)

    // Load all user graphs
    const loadGraphs = useCallback(async () => {
      setBaseState((prev) => ({ ...prev, isLoading: true, error: null }))

      try {
        const response = await SDK.getGraphs()
        const data = unwrapSdk(response)

        if (data) {
          const graphsData = data as any
          let graphs = graphsData.graphs || []

          // Apply optional filter
          if (graphFilter) {
            graphs = graphs.filter(graphFilter)
          }

          const selectedGraphId = graphsData.selectedGraphId || initialGraphId

          // Validate that selectedGraphId exists in graphs array
          const graphIds = graphs.map((g: any) => g.graphId)
          const validSelectedId =
            selectedGraphId && graphIds.includes(selectedGraphId)
              ? selectedGraphId
              : null

          // Visible to setCurrentGraph before the next render: a caller that
          // awaits refreshGraphs() and then selects the new graph must find it.
          graphsRef.current = graphs

          setBaseState((prev) => {
            // Determine which graph should be selected
            let newCurrentGraphId =
              validSelectedId || (graphs.length > 0 ? graphs[0].graphId : null)

            // IMPORTANT: If we currently have a repository selected, preserve it
            // The API's selectedGraphId only tracks user graphs, not repositories
            if (prev.currentGraphId) {
              const currentGraph = graphs.find(
                (g: any) => g.graphId === prev.currentGraphId
              )
              // If current selection is still in the graph list, keep it
              // This prevents loadGraphs from overwriting repository selections
              if (currentGraph) {
                newCurrentGraphId = prev.currentGraphId
              }
            }

            return {
              ...prev,
              graphs,
              currentGraphId: newCurrentGraphId,
              isLoading: false,
            }
          })
        } else {
          throw new Error('Empty response from the graph list endpoint')
        }
      } catch (error) {
        console.error('Failed to load graphs:', error)
        setBaseState((prev) => ({
          ...prev,
          isLoading: false,
          error: 'Failed to load graphs',
        }))
      }
    }, [initialGraphId, graphFilter])

    // Set current graph with persistence
    const setCurrentGraph = useCallback(
      async (graphId: string) => {
        try {
          // Decide from the current graph list, not inside a state updater:
          // React may defer the updater, which left the flag unset and
          // skipped the API call.
          const graph = graphsRef.current.find((g) => g.graphId === graphId)
          // Only treat as a user graph if found and NOT a repository
          const isUserGraph = graph ? !graph.isRepository : false
          setBaseState((prev) => ({
            ...prev,
            currentGraphId: graphId,
          }))

          // Only call selectGraph API for user graphs, not repositories
          // Repositories can be accessed but not "selected" in the backend
          // If graph is not found in local state, skip the API call (likely a repository)
          if (isUserGraph) {
            unwrapSdk(
              await SDK.selectGraph({
                path: { graph_id: graphId },
              })
            )
          }
        } catch (error) {
          console.error('Failed to select graph via API:', error)
          // Don't throw - state is already updated, navigation should continue
        }

        // Persist to cookies via server action - fire and forget
        // This can fail in production (e.g. server action issues behind CDN)
        // but shouldn't block graph selection since React state is already set
        persistGraphSelection(graphId).catch((error) => {
          console.warn('Failed to persist graph selection to cookie:', error)
        })
      },
      [persistGraphSelection]
    )

    // Refresh graphs
    const refreshGraphs = useCallback(async () => {
      await loadGraphs()
    }, [loadGraphs])

    // Initialize on mount
    useEffect(() => {
      loadGraphs()
    }, [loadGraphs])

    const value: GraphContextValue<T> = {
      state,
      loadGraphs,
      setCurrentGraph,
      refreshGraphs,
    }

    return <Context.Provider value={value}>{children}</Context.Provider>
  }
}

// Factory for creating a typed hook
export function createUseGraphContext<T extends GraphState = GraphState>(
  Context: React.Context<GraphContextValue<T> | null>
) {
  return function useGraphContext() {
    const context = useContext(Context)
    if (!context) {
      throw new Error('useGraphContext must be used within a GraphProvider')
    }
    return context
  }
}

// Default implementation for simple use cases
export const GraphContext = createGraphContext()
export const GraphProvider = createGraphProvider(GraphContext)
export const useGraphContext = createUseGraphContext(GraphContext)
