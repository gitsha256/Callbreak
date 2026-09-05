
"use client"

import * as React from "react"
import { Lightbulb } from "lucide-react"
import { useTheme } from "next-themes"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  return (
    <button
      onClick={toggleTheme}
      type="button"
      aria-label="Toggle theme"
      title="Toggle theme"
      className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent"
    >
        <Lightbulb className="h-4 w-4" />
    </button>
  )
}
