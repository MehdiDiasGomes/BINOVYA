import type {
  CubicBezier,
  RevealDirection,
  RevealOffset,
  SpringTransition,
  TweenTransition,
} from '@/types/motion'

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

export const STEP_TRANSITION: TweenTransition = { duration: 0.22, ease: MOTION_EASE }

export const POP_SPRING: SpringTransition = { type: 'spring', stiffness: 260, damping: 18 }
