import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react"
import { useTheme } from "@/components/providers/theme-provider"
import { Toaster as Sonner, type ToasterProps } from "sonner"

/** 项目主题 → sonner theme 映射。sonner 仅支持 light/dark/system，
    sepia 视觉接近暖色浅底 → 映射为 light */
const SONNER_THEME_MAP: Record<string, NonNullable<ToasterProps['theme']>> = {
  light: 'light',
  dark: 'dark',
  sepia: 'light',
}

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme } = useTheme()

  return (
    <Sonner
      theme={SONNER_THEME_MAP[theme] ?? 'light'}
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
