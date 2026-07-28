'use client'

import type { ServiceOfferingsResponse } from '@robosystems/client'
import React, { createContext, useContext, useEffect, useState } from 'react'
import { SDK } from '..'

// Re-export SDK type for direct usage
export type { ServiceOfferingsResponse }

// Transform SDK response to camelCase for frontend compatibility
export interface ServiceOfferings {
  billingEnabled: boolean
  graphPlans?: {
    [key: string]: {
      name: string
      displayName: string
      monthlyPrice: number
      monthlyCredits: number
      features: string[]
      instanceStorageLimitGb?: number
      creditMultiplier: number
    }
  }
  repositoryPlans?: {
    [repositoryType: string]: {
      name: string
      description: string
      enabled: boolean
      comingSoon?: boolean
      plans: Array<{
        plan: string
        name: string
        monthlyPrice: number
        monthlyCredits: number
        features?: string[]
      }>
    }
  }
  features?: {
    [key: string]: any
  }
}

interface ServiceOfferingsContextValue {
  offerings: ServiceOfferings | null
  isLoading: boolean
  error: string | null
  refresh: () => Promise<void>
}

const ServiceOfferingsContext = createContext<ServiceOfferingsContextValue>({
  offerings: null,
  isLoading: true,
  error: null,
  refresh: async () => {},
})

export function ServiceOfferingsProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [offerings, setOfferings] = useState<ServiceOfferings | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchOfferings = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await SDK.getServiceOfferings()

      if (response.data) {
        // Typed, not `as any`. The previous cast is what let graph tiers be
        // read as `monthly_price`/`monthly_credits` — fields the endpoint has
        // never returned for tiers — so every graphPlans entry carried an
        // undefined price. Keep this typed so a field rename fails the build
        // instead of silently producing undefined at runtime.
        const apiData: ServiceOfferingsResponse = response.data

        // Transform repository_subscriptions.repositories array into repositoryPlans object
        const repositoryPlans: ServiceOfferings['repositoryPlans'] = {}

        if (apiData.repository_subscriptions?.repositories) {
          apiData.repository_subscriptions.repositories.forEach((repo: any) => {
            repositoryPlans[repo.type] = {
              name: repo.name,
              description: repo.description,
              enabled: repo.enabled,
              comingSoon: repo.coming_soon,
              plans: repo.plans.map((plan: any) => ({
                plan: plan.plan,
                name: plan.name,
                monthlyPrice: plan.monthly_price,
                monthlyCredits: plan.monthly_credits,
                features: plan.features,
              })),
            }
          })
        }

        // Transform graph tiers array into graphPlans object
        const graphPlans: ServiceOfferings['graphPlans'] = {}

        if (apiData.graph_subscriptions?.tiers) {
          apiData.graph_subscriptions.tiers.forEach((tier: any) => {
            // Skip trial tier for selection
            if (tier.name === 'trial') return

            graphPlans[tier.name] = {
              name: tier.name,
              displayName: tier.display_name,
              // Graph tiers are per-graph and use the *_per_graph fields.
              // Repository plans above legitimately use monthly_price /
              // monthly_credits — the two shapes differ, and copying the
              // repository mapping here is what introduced the bug.
              monthlyPrice: tier.monthly_price_per_graph,
              monthlyCredits: tier.monthly_credits_per_graph,
              features: tier.features || [],
              // The endpoint serves no per-tier credit multiplier, so this has
              // always resolved to 1. Kept as a constant rather than reading a
              // field that does not exist; retained in the public type so
              // consumers don't break.
              creditMultiplier: 1,
              // Served by the API since robosystems v1.6.14 but absent from the
              // pinned @robosystems/client types. Drop the cast once the client
              // is regenerated.
              instanceStorageLimitGb: (
                tier as { instance_storage_limit_gb?: number }
              ).instance_storage_limit_gb,
            }
          })
        }

        const offerings: ServiceOfferings = {
          billingEnabled: apiData.billing_enabled ?? true,
          repositoryPlans,
          graphPlans,
          // `features` is intentionally unset: the endpoint returns no
          // top-level features object, so this only ever assigned undefined.
          // The optional field stays on the public type for compatibility.
        }

        setOfferings(offerings)
      } else {
        throw new Error('No data received from service offerings API')
      }
    } catch (err) {
      console.error('Failed to fetch service offerings:', err)
      setError('Failed to load service offerings')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchOfferings()
  }, [])

  return (
    <ServiceOfferingsContext.Provider
      value={{
        offerings,
        isLoading,
        error,
        refresh: fetchOfferings,
      }}
    >
      {children}
    </ServiceOfferingsContext.Provider>
  )
}

export function useServiceOfferings() {
  const context = useContext(ServiceOfferingsContext)
  if (!context) {
    throw new Error(
      'useServiceOfferings must be used within ServiceOfferingsProvider'
    )
  }
  return context
}
