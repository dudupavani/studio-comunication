"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      aria-label="Alternar tema"
    >
      <Sun className="scale-100 dark:scale-0 transition-transform duration-200" />
      <Moon className="absolute scale-0 dark:scale-100 transition-transform duration-200" />
    </Button>
  );
}
