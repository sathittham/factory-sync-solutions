/**
 * Verify a Firebase ID token inside the Worker (no firebase-admin / Node SDK).
 *
 * Firebase ID tokens are RS256 JWTs signed by Google. We verify the signature
 * against Google's published public keys (JWKS) and assert the standard
 * Firebase claims (`iss`, `aud`, `exp`). The web-backoffice role is carried in
 * the `backofficeRole` custom claim, set server-side by the Go backend — since
 * it is inside the signed token, it cannot be forged by the client.
 */

import { createRemoteJWKSet, jwtVerify } from 'jose'

/** Google's JWK set for Firebase ID tokens. jose caches + rotates keys. */
const FIREBASE_JWKS = createRemoteJWKSet(
  new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'),
)

export interface FirebaseIdentity {
  uid: string
  email: string
  name: string
  /** web-backoffice role from the custom claim: 'superadmin' | 'staff' | ''. */
  backofficeRole: string
}

/**
 * Verify the token for the given Firebase project. Throws if the signature,
 * issuer, audience, or expiry is invalid (jose checks exp/nbf automatically).
 */
export async function verifyFirebaseToken(
  token: string,
  projectId: string,
): Promise<FirebaseIdentity> {
  const { payload } = await jwtVerify(token, FIREBASE_JWKS, {
    issuer: `https://securetoken.google.com/${projectId}`,
    audience: projectId,
  })

  const uid = (payload.sub ?? (payload.user_id as string | undefined) ?? '') as string
  const email = (payload.email as string | undefined) ?? ''
  const name = (payload.name as string | undefined) ?? ''
  const backofficeRole = (payload.backofficeRole as string | undefined) ?? ''

  if (!uid || !email) {
    throw new Error('firebase token missing uid or email')
  }
  return { uid, email, name, backofficeRole }
}
