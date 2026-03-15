import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"
import {
  CheckCircle2,
  XCircle,
  Info,
  AlertTriangle,
  Bell,
} from "lucide-react"

const variantConfig = {
  default: {
    icon: Bell,
    iconColor: "text-cyan-400",
    accent: "bg-cyan-400",
    glow: "shadow-cyan-500/10",
  },
  success: {
    icon: CheckCircle2,
    iconColor: "text-emerald-400",
    accent: "bg-emerald-400",
    glow: "shadow-emerald-500/10",
  },
  destructive: {
    icon: XCircle,
    iconColor: "text-red-400",
    accent: "bg-red-500",
    glow: "shadow-red-500/10",
  },
  info: {
    icon: Info,
    iconColor: "text-blue-400",
    accent: "bg-blue-400",
    glow: "shadow-blue-500/10",
  },
  warning: {
    icon: AlertTriangle,
    iconColor: "text-amber-400",
    accent: "bg-amber-400",
    glow: "shadow-amber-500/10",
  },
} as const

type Variant = keyof typeof variantConfig

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(({ id, title, description, action, variant, ...props }) => {
        const key = (variant ?? "default") as Variant
        const config = variantConfig[key] ?? variantConfig.default
        const Icon = config.icon

        return (
          <Toast key={id} variant={variant} {...props}
            className={`shadow-xl ${config.glow}`}
          >
            {/* Left accent bar */}
            <div className={`absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl ${config.accent}`} />

            {/* Icon */}
            <div className={`shrink-0 mt-0.5 ${config.iconColor}`}>
              <Icon className="h-4 w-4" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 pl-0.5 pr-5">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && <ToastDescription>{description}</ToastDescription>}
            </div>

            {action}
            <ToastClose />

            {/* Auto-dismiss progress bar */}
            <div
              className={`absolute bottom-0 left-0 h-[2px] ${config.accent} opacity-40 rounded-full`}
              style={{
                animation: "toast-progress 5s linear forwards",
              }}
            />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
