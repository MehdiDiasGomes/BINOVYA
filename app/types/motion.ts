export type RevealDirection = 'up' | 'left' | 'right' | 'none'

export type RevealOffset = {
  x: number
  y: number
}

export type CubicBezier = [number, number, number, number]

export type TweenTransition = {
  duration: number
  ease: CubicBezier
}

export type SpringTransition = {
  type: 'spring'
  stiffness: number
  damping: number
}
