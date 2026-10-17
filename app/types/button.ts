export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'destructive'
  | 'warning'
  | 'onDark'
  | 'onDarkWarning'
  | 'onDarkGhost'
  | 'onDarkOutline'

export type ButtonSize = 'md' | 'sm'

export type ButtonType = 'button' | 'submit' | 'reset'

export type ButtonClassOptions = {
  variant: ButtonVariant
  size: ButtonSize
}

export type ButtonClassBuilder = (options: ButtonClassOptions) => string

export type FocusTarget = Pick<HTMLElement, 'focus'>
