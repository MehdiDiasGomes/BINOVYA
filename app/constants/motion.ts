import type {
  CubicBezier,
  RevealDirection,
  RevealOffset,
  SpringTransition,
  TweenTransition,
} from '@/types/motion'
import type { TransitionProps } from 'vue'

export const MOTION_EASE: CubicBezier = [0.22, 1, 0.36, 1]

export const REVEAL_DURATION: number = 0.6

export const REVEAL_STAGGER: number = 0.08

export const REVEAL_MAX_STAGGER_STEPS: number = 3

export const REVEAL_OFFSETS: Record<RevealDirection, RevealOffset> = {
  up: { x: 0, y: 24 },
  left: { x: -32, y: 0 },
  right: { x: 32, y: 0 },
  none: { x: 0, y: 0 },
}

export const HERO_ENTER_CLASS: string =
  'animate-in fade-in slide-in-from-bottom-6 fill-mode-both duration-enter ease-brand motion-reduce:animate-none'

export const CONTENT_ENTER_OFFSET: number = REVEAL_OFFSETS.up.y

export const CONTENT_ENTER_TRANSITION: TweenTransition = {
  duration: REVEAL_DURATION,
  ease: MOTION_EASE,
}

export const STEP_OFFSET: number = 16

export const FEEDBACK_OFFSET: number = STEP_OFFSET / 2

export const STEP_TRANSITION: TweenTransition = { duration: 0.22, ease: MOTION_EASE }

export const POP_SPRING: SpringTransition = { type: 'spring', stiffness: 260, damping: 18 }

export const ACCORDION_ENTER_ACTIVE_CLASS: string =
  'transition-[grid-template-rows,opacity] duration-lift ease-[cubic-bezier(0.37,0,0.63,1)] motion-reduce:transition-none'

export const ACCORDION_LEAVE_ACTIVE_CLASS: string =
  'transition-[grid-template-rows,opacity] duration-press ease-brand motion-reduce:transition-none'

export const COLLAPSE_TRANSITION: TransitionProps = {
  enterActiveClass: ACCORDION_ENTER_ACTIVE_CLASS,
  enterFromClass: 'grid-rows-[0fr] opacity-0',
  enterToClass: 'grid-rows-[1fr] opacity-100',
  leaveActiveClass: ACCORDION_LEAVE_ACTIVE_CLASS,
  leaveFromClass: 'grid-rows-[1fr] opacity-100',
  leaveToClass: 'grid-rows-[0fr] opacity-0',
}

export const COLLAPSE_SLIDE_TRANSITION: TransitionProps = {
  enterActiveClass:
    'transition-[grid-template-rows,opacity,translate] duration-lift ease-[cubic-bezier(0.37,0,0.63,1)] motion-reduce:transition-none',
  enterFromClass: 'grid-rows-[0fr] -translate-y-1 opacity-0 motion-reduce:translate-y-0',
  enterToClass: 'grid-rows-[1fr] translate-y-0 opacity-100',
  leaveActiveClass:
    'transition-[grid-template-rows,opacity,translate] duration-press ease-brand motion-reduce:transition-none',
  leaveFromClass: 'grid-rows-[1fr] translate-y-0 opacity-100',
  leaveToClass: 'grid-rows-[0fr] -translate-y-1 opacity-0 motion-reduce:translate-y-0',
}

export const ACCORDION_PANEL_MOTION_CLASS: string =
  'duration-lift ease-brand *:duration-lift *:ease-brand data-[state=open]:*:animate-in data-[state=open]:*:fade-in data-[state=closed]:*:animate-out data-[state=closed]:*:fade-out motion-reduce:animate-none! motion-reduce:*:animate-none!'

export const ACCORDION_ICON_MOTION_CLASS: string =
  'transition-[rotate] duration-lift ease-brand motion-reduce:transition-none'
