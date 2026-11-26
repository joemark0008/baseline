import { Logger } from '@nestjs/common'
import type { AppEnv } from '../config/env.js'
import { clientIp, type HeaderBag } from './client-ip.js'

/** The Express request/response the Nest Better Auth integration hands to its `middleware`. */
export interface AuthRequest {
  headers: HeaderBag
  ip?: string
  originalUrl?: string
  url?: string
  socket?: { remoteAddress?: string }
}
export interface AuthResponse {
  statusCode: number
  once(event: 'finish', listener: () => void): unknown
}
export type AuthMiddleware = (
  req: AuthRequest,
  res: AuthResponse,
  next: (error?: unknown) => void,
) => void

const BASE_PATH = '/api/auth'

function authPath(req: AuthRequest): string {
  const path = (req.originalUrl ?? req.url ?? '').split('?')[0]
  return (path.startsWith(BASE_PATH) ? path.slice(BASE_PATH.length) : path) || '/'
}

function isSignInGroup(path: string): boolean {
  return path.startsWith('/sign-in') || path.startsWith('/sign-up')
}

/**
 * Better Auth answers 429 on its own routes without any hook; this wrapper logs those refusals
 * in the same format as the API guard, never touching the request body (FR-010).
 */
export function authRefusalLogger(env: AppEnv, logger = new Logger('RateLimit')): AuthMiddleware {
  return (req, res, next) => {
    res.once('finish', () => {
      if (res.statusCode !== 429) return
      const path = authPath(req)
      const signIn = isSignInGroup(path)
      const rule = signIn ? env.rateLimit.signIn : env.rateLimit.general
      const caller = clientIp(req.headers, env.clientIpHeaders, req.ip ?? req.socket?.remoteAddress)
      logger.warn(
        `Rate limit hit: group=${signIn ? 'sign-in' : 'general'} caller=ip:${caller} limit=${rule.max}/${rule.windowSeconds}s path=${path}`,
      )
    })
    next()
  }
}
