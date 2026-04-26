import colors from "@/constants/colors";
import { useTheme } from "@/context/ThemeContext";

export function useColors() {
  const { isDark } = useTheme();
  const palette = isDark && "dark" in colors
    ? (colors as Record<string, typeof colors.light>).dark
    : colors.light;
  return { ...palette, radius: colors.radius, isDark };
}
