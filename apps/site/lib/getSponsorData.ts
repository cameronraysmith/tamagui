import { SupabaseClient } from '@supabase/auth-helpers-nextjs'
import { getCookie, setCookie } from 'cookies-next'
import jwt from 'jsonwebtoken'
import { NextApiRequest, NextApiResponse } from 'next'

import { Database } from './supabase-types'
import { getArray } from './supabase-utils'

const STUDIO_COOKIE_NAME = 'studio_jwt'
const JWT_SECRET = process.env.STUDIO_JWT_SECRET!

type PayloadShape = {
  hasStudioAccess: boolean
  teamId: number
}

/**
 * checks is the user has sponsor access and sets a jwt cookie for subsequent requests to be faster
 */
export async function getSponsorData(
  req: NextApiRequest,
  res: NextApiResponse,
  supabase: SupabaseClient<Database>
): Promise<PayloadShape> {
  const oldJwt = getCookie(STUDIO_COOKIE_NAME, { req, res })
  if (oldJwt) {
    try {
      const payload = jwt.verify(oldJwt, JWT_SECRET) as PayloadShape
      return payload
    } catch (error) {
      // continue to create a new one and set it
    }
  }

  const teamsResult = await supabase.from('teams').select('id, name, is_active')
  if (teamsResult.error) {
    throw teamsResult.error
  }
  const teams = getArray(teamsResult.data)
  const teamsWithAccess = teams.filter((team) => team.is_active)
  const hasStudioAccess = teamsWithAccess.length > 0

  const payload: PayloadShape = { hasStudioAccess, teamId: teamsWithAccess[0]?.id }
  const newJwt = jwt.sign(payload, JWT_SECRET)

  setCookie(STUDIO_COOKIE_NAME, newJwt, {
    req,
    res,
    maxAge: 60 * 2,
    httpOnly: true,
    domain: process.env.NODE_ENV === 'production' ? '.tamagui.dev' : 'localhost',
  })

  return payload
}