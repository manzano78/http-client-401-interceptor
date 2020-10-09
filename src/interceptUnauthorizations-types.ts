import { RequestConfig } from '@manzano/http-client'

export type ReplayUnauthorizedRequests = () => void
export type OnUnauthorized = (
  replayUnauthorizedRequests: ReplayUnauthorizedRequests
) => void

export type ShouldBypassInterceptor = (config: RequestConfig) => boolean

export interface Unauthorization {
  retry: () => void
  release: () => void
}
