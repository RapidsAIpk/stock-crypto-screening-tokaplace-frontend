import { INDICATOR_CATEGORY_COLORS, INDICATOR_CATEGORY_MAP, type IndicatorConfig } from "@/types/screener";

export function getIndicatorColor(badge: string, indicatorConfigs?: IndicatorConfig[]) {
  const lowered = badge.toLowerCase();

  // If badge is Trendy ADX, check if a specific background_color is configured
  if (lowered.includes("adx")) {
    const adxConfig = indicatorConfigs?.find((ind) => ind.name === "adx")?.config;
    const bgColorChoice = String(adxConfig?.background_color ?? "green").toLowerCase();

    if (bgColorChoice === "red") {
      return {
        bg: "bg-red-500/20",
        text: "text-red-300 font-semibold",
        border: "border-red-500/50",
      };
    }
    if (bgColorChoice === "green") {
      return {
        bg: "bg-emerald-500/20",
        text: "text-emerald-300 font-semibold",
        border: "border-emerald-500/50",
      };
    }
  }

  for (const [name, category] of Object.entries(INDICATOR_CATEGORY_MAP)) {
    if (lowered.startsWith(name.toLowerCase())) {
      return INDICATOR_CATEGORY_COLORS[category];
    }
  }

  if (lowered.includes("confluence")) {
    return INDICATOR_CATEGORY_COLORS.confluence;
  }

  if (lowered.includes("channel") || lowered.includes("respect")) {
    return INDICATOR_CATEGORY_COLORS.channel;
  }

  return {
    bg: "bg-primary/10",
    text: "text-primary",
    border: "border-primary/20",
  };
}
