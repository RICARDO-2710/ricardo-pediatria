import * as React from "react"

export interface TooltipProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "content"> {
  showArrow?: boolean
  portalled?: boolean
  portalRef?: React.RefObject<HTMLElement | null>
  content: React.ReactNode
  contentProps?: React.HTMLAttributes<HTMLDivElement>
  disabled?: boolean
}

export const Tooltip = React.forwardRef<HTMLDivElement, TooltipProps>(
  function Tooltip(props, ref) {
    const {
      children,
      disabled,
      content,
      contentProps,
      ...rest
    } = props

    if (disabled) return <>{children}</>

    const title = typeof content === "string" ? content : undefined

    return (
      <div ref={ref} title={title} {...rest}>
        {children}
        {typeof content !== "string" ? (
          <div hidden {...contentProps}>
            {content}
          </div>
        ) : null}
      </div>
    )
  },
)
