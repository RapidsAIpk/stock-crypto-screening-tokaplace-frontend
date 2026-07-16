import { AssetTypeFilter } from "./filters/AssetTypeFilter";
import { ComplianceFilter } from "./filters/ComplianceFilter";
import { AssetCategoryFilter } from "./filters/AssetCategoryFilter";
import { SectorFilter } from "./filters/SectorFilter";
import { EthicalFilter } from "./filters/EthicalFilter";
import { CryptoExchangeFilter } from "./filters/CryptoExchangeFilter";
import { TimeframeFilter } from "./filters/TimeframeFilter";
import { IndicatorsFilter } from "./filters/IndicatorsFilter";
import { ChannelRespectFilter } from "./filters/ChannelRespectFilter";
import { ConfluenceFilter } from "./filters/ConfluenceFilter";
import { PriceRangeFilter } from "./filters/PriceRangeFilter";
import { DeadAssetsFilter } from "./filters/DeadAssetsFilter";
import type { useScreener } from "@/hooks/useScreener";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
} from "@/components/ui/sidebar";
import { SlidersHorizontal, Clock3, Layers } from "lucide-react";

type ScreenerState = ReturnType<typeof useScreener>;

export function FilterSidebar({
  state,
  disabledIndicators,
}: {
  state: ScreenerState;
  disabledIndicators?: string[];
}) {
  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border/80">
      <SidebarContent className="overflow-x-hidden p-0">
        <div className="flex min-h-full flex-col bg-[radial-gradient(circle_at_top,hsl(var(--primary)_/_0.12),transparent_30%),linear-gradient(180deg,hsl(var(--sidebar-background)),hsl(214_28%_9%))] px-2 py-5 pb-8 group-data-[collapsible=icon]:px-1">
          <div className="hidden flex-col items-center gap-3 group-data-[collapsible=icon]:flex">
            {[
              { label: "Filters", icon: SlidersHorizontal },
              { label: "Timeframe", icon: Clock3 },
              { label: "Settings", icon: Layers },
            ].map((item) => (
              <button
                key={item.label}
                title={item.label}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-sidebar-border/70 bg-sidebar-accent/35 text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent/55"
              >
                <item.icon className="h-4 w-4" />
              </button>
            ))}
          </div>

          <div className="group-data-[collapsible=icon]:hidden">

            <div className="mt-6 space-y-6">
              <SidebarGroup className="rounded-[24px] border border-sidebar-border/70 bg-sidebar-accent/30 p-4 shadow-[inset_0_1px_0_hsl(0_0%_100%_/_0.02)]">
                <SidebarGroupLabel className="px-0 text-[11px] uppercase tracking-[0.22em] text-sidebar-foreground/55">
                  Filters
                </SidebarGroupLabel>
                <SidebarGroupContent className="space-y-4 pt-2">
                  <AssetTypeFilter value={state.assetType} onChange={state.setAssetType} />
                  <PriceRangeFilter
                    value={state.priceRange}
                    onChange={state.setPriceRange}
                  />
                  {state.assetType === "stocks" && (
                    <>
                      <ComplianceFilter
                        status={state.complianceStatus}
                        onStatusChange={state.setComplianceStatus}
                      />
                      <AssetCategoryFilter
                        options={state.availableStockAssetCategories}
                        loading={state.stockFilterOptionsLoading}
                        selected={state.assetCategories}
                        onChange={state.setAssetCategories}
                      />
                      <SectorFilter
                        options={state.availableStockSectors}
                        loading={state.stockFilterOptionsLoading}
                        selected={state.sectors}
                        onChange={state.setSectors}
                      />
                    </>
                  )}
                  {state.assetType === "crypto" && (
                    <>
                      <CryptoExchangeFilter
                        availableExchanges={state.availableCryptoExchanges}
                        loading={state.cryptoExchangeOptionsLoading}
                        exchanges={state.cryptoExchanges}
                        onExchangesChange={state.setCryptoExchanges}
                      />
                      <EthicalFilter
                        excluded={state.excludedCategories}
                        onChange={state.setExcludedCategories}
                      />
                    </>
                  )}
                  <DeadAssetsFilter
                    value={state.deadAssets}
                    onChange={state.setDeadAssets}
                  />
                  <IndicatorsFilter
                    indicators={state.indicators}
                    onChange={state.setIndicators}
                    timeframeMode={state.timeframeMode}
                    disabledIndicators={disabledIndicators}
                  />
                  <ChannelRespectFilter
                    value={state.channelRespect}
                    onChange={state.setChannelRespect}
                  />
                  <ConfluenceFilter
                    value={state.confluence}
                    onChange={state.setConfluence}
                  />
                </SidebarGroupContent>
              </SidebarGroup>

              <SidebarGroup className="rounded-[24px] border border-sidebar-border/70 bg-sidebar-accent/30 p-4 shadow-[inset_0_1px_0_hsl(0_0%_100%_/_0.02)]">
                <SidebarGroupLabel className="px-0 text-[11px] uppercase tracking-[0.22em] text-sidebar-foreground/55">
                  Timeframe
                </SidebarGroupLabel>
                <SidebarGroupContent className="pt-2">
                  <TimeframeFilter
                    mode={state.timeframeMode}
                    onModeChange={state.setTimeframeMode}
                    singleTimeframe={state.singleTimeframe}
                    onSingleChange={state.setSingleTimeframe}
                    gateTimeframe={state.gateTimeframe}
                    onGateChange={state.setGateTimeframe}
                    entryTimeframe={state.entryTimeframe}
                    onEntryChange={state.setEntryTimeframe}
                  />
                </SidebarGroupContent>
              </SidebarGroup>
            </div>
          </div>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
