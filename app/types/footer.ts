import type { NavItem } from '@/types/navbar'

export type FooterPageLink = NavItem & { kind: 'page' }

export type FooterLink = FooterPageLink | { kind: 'email' } | { kind: 'account' }

export type FooterColumn = {
  id: string
  titleKey: string
  links: readonly FooterLink[]
}
