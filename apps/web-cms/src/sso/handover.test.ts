import { describe, expect, it } from 'vitest'
import { mapCmsRole, splitName } from './handover'

describe('mapCmsRole', () => {
  it('maps backoffice roles to CMS roles', () => {
    expect(mapCmsRole('superadmin')).toBe('admin')
    expect(mapCmsRole('staff')).toBe('editor')
  })

  it('returns null for non-backoffice users (access denied)', () => {
    expect(mapCmsRole('')).toBeNull()
    expect(mapCmsRole('viewer')).toBeNull()
    expect(mapCmsRole('customer')).toBeNull()
  })
})

describe('splitName', () => {
  it('splits a full name into first and last', () => {
    expect(splitName('Sathittham Sangthong', 'x@y.com')).toEqual({
      first: 'Sathittham',
      last: 'Sangthong',
    })
  })

  it('keeps multi-word surnames intact', () => {
    expect(splitName('Ana de Armas', 'x@y.com')).toEqual({ first: 'Ana', last: 'de Armas' })
  })

  it('falls back to a placeholder last name for single names (last_name is NOT NULL)', () => {
    expect(splitName('Cher', 'x@y.com')).toEqual({ first: 'Cher', last: '-' })
  })

  it('derives a name from the email when no name is provided', () => {
    expect(splitName('', 'somebody@example.com')).toEqual({ first: 'somebody', last: '-' })
  })
})
