"use client";

import useAppStore from "@/contexts/mind-map/mind-map-store";
import { SpecificLayoutConfig } from "@/types/layout-types";
import { cn } from "@/utils/cn";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Circle,
  Grid,
  Network,
  Settings,
  TreePine,
  Zap,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useMemo, useState } from "react";
import { useShallow } from "zustand/shallow";
import { Button } from "./ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";

const layoutIcons: Record<string, React.ElementType> = {
  "dagre-tb": ArrowDown,
  "dagre-lr": ArrowRight,
  "dagre-bt": ArrowUp,
  "dagre-rl": ArrowLeft,
  "force-directed": Zap,
  circular: Circle,
  radial: Network,
  grid: Grid,
  tree: TreePine,
  hierarchical: ArrowDown,
};

const layoutCategories = {
  hierarchical: { name: "Hierarchical", color: "bg-blue-500" },
  force: { name: "Force-Based", color: "bg-green-500" },
  geometric: { name: "Geometric", color: "bg-purple-500" },
  custom: { name: "Custom", color: "bg-orange-500" },
};

interface LayoutConfigPanelProps {
  config: SpecificLayoutConfig;
  onConfigChange: (config: SpecificLayoutConfig) => void;
}

function LayoutConfigPanel({ config, onConfigChange }: LayoutConfigPanelProps) {
  const updateConfig = useCallback(
    (updates: Partial<SpecificLayoutConfig>) => {
      onConfigChange({ ...config, ...updates } as SpecificLayoutConfig);
    },
    [config, onConfigChange],
  );

  return (
    <div className="space-y-4 p-4 border-t border-zinc-700">
      <h4 className="text-sm font-medium text-zinc-300">Layout Settings</h4>

      {/* Common settings */}
      <div className="grid grid-cols-2 gap-3">
        {config.nodeSpacing !== undefined && (
          <div className="space-y-1">
            <label className="text-xs text-zinc-400">Node Spacing</label>

            <input
              type="range"
              min="20"
              max="200"
              value={config.nodeSpacing}
              onChange={(e) =>
                updateConfig({ nodeSpacing: Number(e.target.value) })
              }
              className="w-full"
            />

            <span className="text-xs text-zinc-500">
              {config.nodeSpacing}px
            </span>
          </div>
        )}

        {config.rankSpacing !== undefined && (
          <div className="space-y-1">
            <label className="text-xs text-zinc-400">Rank Spacing</label>

            <input
              type="range"
              min="50"
              max="300"
              value={config.rankSpacing}
              onChange={(e) =>
                updateConfig({ rankSpacing: Number(e.target.value) })
              }
              className="w-full"
            />

            <span className="text-xs text-zinc-500">
              {config.rankSpacing}px
            </span>
          </div>
        )}
      </div>

      {/* Algorithm-specific settings */}
      {config.algorithm === "force-directed" && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs text-zinc-400">Iterations</label>

            <input
              type="range"
              min="50"
              max="500"
              value={(config as { iterations?: number }).iterations || 300}
              onChange={(e) =>
                updateConfig({
                  iterations: Number(e.target.value),
                } as Partial<SpecificLayoutConfig>)
              }
              className="w-full"
            />

            <span className="text-xs text-zinc-500">
              {(config as { iterations?: number }).iterations || 300}
            </span>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-zinc-400">Strength</label>

            <input
              type="range"
              min="-500"
              max="-100"
              value={(config as { strength?: number }).strength || -300}
              onChange={(e) =>
                updateConfig({
                  strength: Number(e.target.value),
                } as Partial<SpecificLayoutConfig>)
              }
              className="w-full"
            />

            <span className="text-xs text-zinc-500">
              {(config as { strength?: number }).strength || -300}
            </span>
          </div>
        </div>
      )}

      {config.algorithm === "circular" && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs text-zinc-400">Radius</label>

            <input
              type="range"
              min="100"
              max="500"
              value={(config as { radius?: number }).radius || 200}
              onChange={(e) =>
                updateConfig({
                  radius: Number(e.target.value),
                } as Partial<SpecificLayoutConfig>)
              }
              className="w-full"
            />

            <span className="text-xs text-zinc-500">
              {(config as { radius?: number }).radius || 200}px
            </span>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-zinc-400">Start Angle</label>

            <input
              type="range"
              min="0"
              max="360"
              value={
                ((config as { startAngle?: number }).startAngle || 0) *
                (180 / Math.PI)
              }
              onChange={(e) =>
                updateConfig({
                  startAngle: Number(e.target.value) * (Math.PI / 180),
                } as Partial<SpecificLayoutConfig>)
              }
              className="w-full"
            />

            <span className="text-xs text-zinc-500">
              {Math.round(
                ((config as { startAngle?: number }).startAngle || 0) *
                  (180 / Math.PI),
              )}
              °
            </span>
          </div>
        </div>
      )}

      {config.algorithm === "grid" && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs text-zinc-400">Columns</label>

            <input
              type="range"
              min="2"
              max="10"
              value={(config as { columns?: number }).columns || 4}
              onChange={(e) =>
                updateConfig({
                  columns: Number(e.target.value),
                } as Partial<SpecificLayoutConfig>)
              }
              className="w-full"
            />

            <span className="text-xs text-zinc-500">
              {(config as { columns?: number }).columns || 4}
            </span>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-zinc-400">Cell Width</label>

            <input
              type="range"
              min="200"
              max="500"
              value={(config as { cellWidth?: number }).cellWidth || 350}
              onChange={(e) =>
                updateConfig({
                  cellWidth: Number(e.target.value),
                } as Partial<SpecificLayoutConfig>)
              }
              className="w-full"
            />

            <span className="text-xs text-zinc-500">
              {(config as { cellWidth?: number }).cellWidth || 350}px
            </span>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <Button
          onClick={() => onConfigChange(config)}
          className="flex-1 bg-teal-600 hover:bg-teal-700 text-white"
          size="sm"
        >
          Apply Layout
        </Button>
      </div>
    </div>
  );
}

export function LayoutSelector() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [currentConfig, setCurrentConfig] =
    useState<SpecificLayoutConfig | null>(null);

  const { applyAdvancedLayout, getLayoutPresets, currentLayoutConfig } =
    useAppStore(
      useShallow((state) => ({
        applyAdvancedLayout: state.applyAdvancedLayout,
        getLayoutPresets: state.getLayoutPresets,
        currentLayoutConfig: state.currentLayoutConfig,
      })),
    );

  const presets = getLayoutPresets();
  const categorizedPresets = useMemo(() => {
    return presets.reduce(
      (acc, preset) => {
        if (!acc[preset.category]) acc[preset.category] = [];
        acc[preset.category].push(preset);
        return acc;
      },
      {} as Record<string, typeof presets>,
    );
  }, [presets]);

  const handlePresetSelect = useCallback(
    (preset: (typeof presets)[0]) => {
      setSelectedPreset(preset.id);
      setCurrentConfig(preset.config);

      if (!showSettings && !preset.disabled) {
        applyAdvancedLayout(preset.config);
        setIsOpen(false);
      }
    },
    [applyAdvancedLayout, setIsOpen, showSettings],
  );

  const handleConfigChange = useCallback(
    (config: SpecificLayoutConfig) => {
      setCurrentConfig(config);
      applyAdvancedLayout(config);
      setIsOpen(false);
      setShowSettings(false);
    },
    [applyAdvancedLayout, setIsOpen, setShowSettings],
  );

  // const currentPreset = presets.find(p => p.id === selectedPreset);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "gap-2 text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800",
            currentLayoutConfig && "text-teal-400",
          )}
        >
          <Network className="size-4" />

          <span>Layout</span>

          {currentLayoutConfig && (
            <div className="size-2 rounded-full bg-teal-400" />
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="w-80 p-0 bg-zinc-950 border-zinc-800"
        align="start"
      >
        <div className="p-4 border-b border-zinc-800">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-zinc-200">Layout Algorithms</h3>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSettings(!showSettings)}
              className={cn("size-8 p-0", showSettings && "bg-zinc-800")}
            >
              <Settings className="size-4" />
            </Button>
          </div>

          <p className="text-xs text-zinc-500 mt-1">
            Choose how to arrange your nodes
          </p>
        </div>

        <div className="max-h-80 overflow-y-auto">
          {Object.entries(categorizedPresets).map(
            ([category, categoryPresets]) => (
              <div key={category} className="p-2">
                <div className="flex items-center gap-2 mb-2 px-2">
                  <div
                    className={cn(
                      "size-3 rounded",
                      layoutCategories[
                        category as keyof typeof layoutCategories
                      ]?.color,
                    )}
                  />

                  <span className="text-xs font-medium text-zinc-400 uppercase tracking-wide">
                    {layoutCategories[category as keyof typeof layoutCategories]
                      ?.name || category}
                  </span>
                </div>

                <div className="space-y-1">
                  {categoryPresets.map((preset) => {
                    const Icon = layoutIcons[preset.id] || Network;
                    const isSelected = selectedPreset === preset.id;
                    const isCurrent =
                      currentLayoutConfig?.algorithm ===
                      preset.config.algorithm;

                    return (
                      <motion.button
                        key={preset.id}
                        onClick={() => handlePresetSelect(preset)}
                        className={cn(
                          "w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all",
                          "hover:bg-zinc-800 border border-transparent disabled:opacity-50",
                          isSelected && "bg-zinc-800 border-teal-500/50",
                          isCurrent && !isSelected && "bg-zinc-800/50",
                        )}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        disabled={preset.disabled}
                      >
                        <div
                          className={cn(
                            "size-8 rounded-md flex items-center justify-center",
                            isSelected ? "bg-teal-600" : "bg-zinc-700",
                          )}
                        >
                          <Icon className="size-4 text-white" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-zinc-200 text-sm">
                            {preset.name}
                          </div>

                          <div className="text-xs text-zinc-500 truncate">
                            {preset.description}
                          </div>
                        </div>

                        {isCurrent && (
                          <div className="size-2 rounded-full bg-teal-400" />
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            ),
          )}
        </div>

        <AnimatePresence>
          {showSettings && currentConfig && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <LayoutConfigPanel
                config={currentConfig}
                onConfigChange={handleConfigChange}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </PopoverContent>
    </Popover>
  );
}
