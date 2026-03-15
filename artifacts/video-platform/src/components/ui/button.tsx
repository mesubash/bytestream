import * as React from "react"
import { cn } from "@/lib/utils"
import { Loader2 } from "lucide-react"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "secondary" | "outline" | "ghost" | "destructive" | "glass"
  size?: "default" | "sm" | "lg" | "icon"
  isLoading?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", isLoading, children, disabled, ...props }, ref) => {
    
    const variants = {
      default: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_15px_rgba(6,182,212,0.2)] hover:shadow-[0_0_25px_rgba(6,182,212,0.4)] border border-primary/50",
      secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-white/5",
      outline: "border border-input bg-transparent hover:bg-accent hover:text-accent-foreground",
      ghost: "hover:bg-white/5 hover:text-accent-foreground text-muted-foreground",
      destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
      glass: "bg-white/5 backdrop-blur-md border border-white/10 hover:bg-white/10 text-foreground"
    }

    const sizes = {
      default: "h-11 px-6 py-2",
      sm: "h-9 rounded-md px-3 text-sm",
      lg: "h-12 rounded-xl px-8 text-lg",
      icon: "h-11 w-11",
    }

    return (
      <button
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap rounded-xl font-medium ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
          variants[variant],
          sizes[size],
          className
        )}
        ref={ref}
        disabled={isLoading || disabled}
        {...props}
      >
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {children}
      </button>
    )
  }
)
Button.displayName = "Button"

export { Button }
