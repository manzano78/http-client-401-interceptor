import { HttpClient, Response } from '@manzano/http-client'
import {
  OnUnauthorized,
  ShouldBypassInterceptor,
  Unauthorization
} from './interceptUnauthorizations-types'

const HTTP_UNAUTHORIZED_STATUS_CODE = 401

export function interceptUnauthorizations(
  httpClient: HttpClient<any>,
  onUauthorized: OnUnauthorized,
  shouldBypassInterceptor?: ShouldBypassInterceptor
) {
  let isInterceptorActive = true
  const unauthorizations: Unauthorization[] = []

  const retryUnauthorizedRequests = () => {
    if (isInterceptorActive) {
      unauthorizations.splice(0).forEach(({ retry }) => {
        retry()
      })
    }
  }

  const releaseUnauthorizedRequests = () => {
    unauthorizations.forEach(({ release }) => {
      release()
    })
  }

  const shouldInterceptError = (error: any) => {
    return (
      isInterceptorActive &&
      HttpClient.isHttpError(error) &&
      error.response?.status === HTTP_UNAUTHORIZED_STATUS_CODE &&
      (!shouldBypassInterceptor || !shouldBypassInterceptor(error.config))
    )
  }

  const responseErrorHandler = async (error: any): Promise<Response> => {
    if (shouldInterceptError(error)) {
      if (unauthorizations.length === 0) {
        onUauthorized(retryUnauthorizedRequests)
      }

      return await new Promise<Response>((resolve, reject) => {
        const retry = () => {
          httpClient.exchange(error.config).then(resolve, reject)
        }

        const release = () => {
          reject(error)
        }

        unauthorizations.push({ retry, release })
      })
    }

    throw error
  }

  const removeInterceptor = httpClient.addResponseInterceptor(
    undefined,
    responseErrorHandler
  )

  return (shouldReleaseUnauthorizedRequests = false) => {
    if (isInterceptorActive) {
      isInterceptorActive = false

      removeInterceptor()

      if (shouldReleaseUnauthorizedRequests) {
        releaseUnauthorizedRequests()
      }
    }
  }
}
