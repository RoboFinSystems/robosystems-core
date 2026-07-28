import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getServiceOfferings } from '@robosystems/client'
import {
  ServiceOfferingsProvider,
  useServiceOfferings,
} from '../service-offerings-context'

const mockGetServiceOfferings = vi.mocked(getServiceOfferings)

function offeringsResponse() {
  return {
    data: {
      billing_enabled: true,
      graph_subscriptions: {
        tiers: [
          {
            name: 'ladybug-standard',
            display_name: 'Standard',
            // The endpoint returns *_per_graph for tiers. A previous `as any`
            // cast read monthly_price / monthly_credits here, which do not
            // exist on a tier, so every plan carried an undefined price.
            monthly_price_per_graph: 99,
            monthly_credits_per_graph: 8000,
            max_subgraphs: 3,
            backup_retention_days: 7,
            features: ['8,000 AI credits per graph'],
            instance_storage_limit_gb: 20,
          },
        ],
      },
      repository_subscriptions: {
        repositories: [
          {
            type: 'sec',
            name: 'SEC EDGAR Filings',
            description: 'SEC data',
            enabled: true,
            plans: [
              // Repository plans genuinely use these field names — the two
              // shapes differ, which is how the tier mapping went wrong.
              {
                plan: 'starter',
                name: 'Starter',
                monthly_price: 29,
                monthly_credits: 5000,
              },
            ],
          },
        ],
      },
    },
  }
}

function Probe() {
  const { offerings, isLoading } = useServiceOfferings()
  if (isLoading) return <div>loading</div>
  const standard = offerings?.graphPlans?.['ladybug-standard']
  const starter = offerings?.repositoryPlans?.['sec']?.plans[0]
  return (
    <div>
      <span data-testid="price">{String(standard?.monthlyPrice)}</span>
      <span data-testid="credits">{String(standard?.monthlyCredits)}</span>
      <span data-testid="storage">
        {String(standard?.instanceStorageLimitGb)}
      </span>
      <span data-testid="multiplier">{String(standard?.creditMultiplier)}</span>
      <span data-testid="repo-price">{String(starter?.monthlyPrice)}</span>
    </div>
  )
}

describe('ServiceOfferingsProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('maps graph tiers from the per-graph fields the endpoint actually returns', async () => {
    mockGetServiceOfferings.mockResolvedValue(offeringsResponse() as never)

    render(
      <ServiceOfferingsProvider>
        <Probe />
      </ServiceOfferingsProvider>
    )

    await waitFor(() =>
      expect(screen.getByTestId('price')).toHaveTextContent('99')
    )
    expect(screen.getByTestId('credits')).toHaveTextContent('8000')
    expect(screen.getByTestId('storage')).toHaveTextContent('20')
    // No per-tier multiplier is served, so this is a constant.
    expect(screen.getByTestId('multiplier')).toHaveTextContent('1')
  })

  it('keeps repository plans on their own field names', async () => {
    mockGetServiceOfferings.mockResolvedValue(offeringsResponse() as never)

    render(
      <ServiceOfferingsProvider>
        <Probe />
      </ServiceOfferingsProvider>
    )

    await waitFor(() =>
      expect(screen.getByTestId('repo-price')).toHaveTextContent('29')
    )
  })

  it('never yields an undefined price for a tier the API priced', async () => {
    mockGetServiceOfferings.mockResolvedValue(offeringsResponse() as never)

    render(
      <ServiceOfferingsProvider>
        <Probe />
      </ServiceOfferingsProvider>
    )

    await waitFor(() =>
      expect(screen.getByTestId('price')).not.toHaveTextContent('undefined')
    )
  })
})
