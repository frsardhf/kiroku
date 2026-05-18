import { GraphQLClient, type RequestDocument, type Variables } from 'graphql-request'
import { clearToken, getToken } from '@/lib/auth'

const ENDPOINT = 'https://graphql.anilist.co'

export class AnilistAuthError extends Error {
  constructor(message = 'AniList authentication failed') {
    super(message)
    this.name = 'AnilistAuthError'
  }
}

export class AnilistDownError extends Error {
  constructor(message = 'AniList API is temporarily unavailable') {
    super(message)
    this.name = 'AnilistDownError'
  }
}

function makeClient(): GraphQLClient {
  const token = getToken()
  return new GraphQLClient(ENDPOINT, {
    headers: token
      ? {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        }
      : { Accept: 'application/json' },
  })
}

export async function anilistRequest<T = unknown>(
  document: RequestDocument,
  variables?: Variables,
): Promise<T> {
  const client = makeClient()
  try {
    return await client.request<T>(document, variables)
  } catch (err: unknown) {
    const status = (err as { response?: { status?: number } })?.response?.status
    if (status === 401 || status === 400) {
      clearToken()
      throw new AnilistAuthError()
    }
    if (status === 503 || status === 403 || err instanceof TypeError) {
      throw new AnilistDownError()
    }
    throw err
  }
}
