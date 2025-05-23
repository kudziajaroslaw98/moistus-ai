import useAppStore from "@/contexts/mind-map/mind-map-store";
import { Command } from "cmdk";
import { Maximize, Plus, Redo, Undo } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useShallow } from "zustand/shallow";

// TODO: Uncomment when AI features are implemented
// interface CommandPaletteProps {
// actions: {
// deleteSelected: () => void;
// triggerAISummarize?: () => void;
// triggerAIConcepts?: () => void;
// triggerAIContent?: () => void;
// triggerSuggestConnections?: () => void;
// triggerSuggestMerges?: () => void;
// applyLayoutTB: () => void;
// applyLayoutLR: () => void;
// aiSearch: (query: string) => void;
// groupSelectedNodes?: () => void;
// };
// }

export function CommandPalette() {
  const [search, setSearch] = useState("");
  const {
    popoverOpen,
    setPopoverOpen,
    nodes,
    canUndo,
    canRedo,
    undo,
    redo,
    toggleFocusMode,
    addNode,
  } = useAppStore(
    useShallow((state) => ({
      popoverOpen: state.popoverOpen,
      setPopoverOpen: state.setPopoverOpen,
      nodes: state.nodes,
      canUndo: state.canUndo,
      canRedo: state.canRedo,
      undo: state.handleUndo,
      redo: state.handleRedo,
      toggleFocusMode: state.toggleFocusMode,
      addNode: state.addNode,
    })),
  );

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setPopoverOpen({ commandPalette: !popoverOpen.commandPalette });
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [popoverOpen]);

  const runCommand = useCallback(
    (command?: () => void) => {
      if (!command) return;

      setPopoverOpen({ commandPalette: false });
      command();
    },
    [setPopoverOpen],
  );

  const selectedNodesCount = nodes.filter((n) => n.selected).length;
  const canGroup = selectedNodesCount >= 2;

  const handleOpenChange = useCallback(
    (open: boolean) => {
      setPopoverOpen({ commandPalette: open });
    },
    [setPopoverOpen],
  );

  const handleAddNode = () => {
    setPopoverOpen({ nodeType: true });
  };

  return (
    <Command.Dialog
      open={popoverOpen.commandPalette}
      onOpenChange={handleOpenChange}
      label="Global Command Menu"
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
    >
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-sm"
        onClick={() => setPopoverOpen({ commandPalette: false })}
      />

      <div className="z-10 w-full max-w-xl rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-200 shadow-lg">
        <Command.Input
          value={search}
          onValueChange={setSearch}
          placeholder="Type a command or search..."
          className="w-full border-b border-zinc-700 bg-transparent px-4 py-3 text-sm focus:outline-none"
        />

        <Command.List className="max-h-[400px] overflow-y-auto p-4">
          <Command.Empty className="p-4 text-center text-sm text-zinc-500">
            No results found.
          </Command.Empty>

          {/* General Actions Group */}
          <Command.Group
            heading="Actions"
            className="text-xs font-medium text-zinc-500 gap-4"
          >
            <div className="flex flex-col py-2">
              <Command.Item
                onSelect={() => runCommand(handleAddNode)}
                className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-zinc-800 aria-selected:bg-zinc-700"
              >
                <Plus className="size-4 text-teal-400" /> Add Node
              </Command.Item>

              <Command.Item
                onSelect={() => runCommand(undo)}
                disabled={!canUndo}
                className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-zinc-800 aria-selected:bg-zinc-700 aria-disabled:opacity-50 aria-disabled:pointer-events-none"
              >
                <Undo className="size-4 text-zinc-400" /> Undo
              </Command.Item>

              <Command.Item
                onSelect={() => runCommand(redo)}
                disabled={!canRedo}
                className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-zinc-800 aria-selected:bg-zinc-700 aria-disabled:opacity-50 aria-disabled:pointer-events-none"
              >
                <Redo className="size-4 text-zinc-400" /> Redo
              </Command.Item>

              <Command.Item
                onSelect={() => runCommand(toggleFocusMode)}
                className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-zinc-800 aria-selected:bg-zinc-700"
              >
                <Maximize className="size-4 text-zinc-400" /> Toggle Focus Mode
              </Command.Item>

              {/* Add Grouping Action */}
              {/* {actions.groupSelectedNodes && (
                <Command.Item
                  onSelect={() => runCommand(actions.groupSelectedNodes)}
                  disabled={!canGroup}
                  className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-zinc-800 aria-selected:bg-zinc-700 aria-disabled:opacity-50 aria-disabled:pointer-events-none"
                >
                  <GroupIcon className="size-4 text-zinc-400" />

                  <span>Group Selected</span>

                  <span>Nodes ({selectedNodesCount}) </span>
                </Command.Item>
              )} */}

              {/* Add Delete Action */}
              {/* <Command.Item
                onSelect={() => runCommand(actions.deleteSelected)}
                className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm text-rose-400 hover:bg-rose-900/50 aria-selected:bg-rose-900/50"
              >
                <Trash className="size-4" /> Delete Selected
              </Command.Item> */}
            </div>
          </Command.Group>

          {/* AI Actions Group */}
          {/* <Command.Group
            heading="AI Features"
            className="mt-2 text-xs font-medium text-zinc-500"
          > */}
          {/* Add other AI commands similarly */}
          {/* {actions.triggerSuggestConnections && (
              <Command.Item
                onSelect={() => runCommand(actions.triggerSuggestConnections!)}
                className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-zinc-800 aria-selected:bg-zinc-700"
              >
                <Network className="size-4 text-sky-400" /> Suggest Connections
              </Command.Item>
            )}

            {actions.triggerSuggestMerges && (
              <Command.Item
                onSelect={() => runCommand(actions.triggerSuggestMerges!)}
                className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-zinc-800 aria-selected:bg-zinc-700"
              >
                <GitPullRequestArrow className="size-4 text-sky-400" /> Suggest
                Merges
              </Command.Item>
            )}
          </Command.Group> */}

          {/* Layout Actions Group */}
          <Command.Group
            heading="Layout"
            className="mt-2 text-xs font-medium text-zinc-500"
          >
            {/* <Command.Item
              onSelect={() => runCommand(actions.applyLayoutTB)}
              className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-zinc-800 aria-selected:bg-zinc-700"
            >
              <LayoutPanelTop className="size-4 text-zinc-400" /> Apply
              Top-to-Bottom Layout
            </Command.Item>

            <Command.Item
              onSelect={() => runCommand(actions.applyLayoutLR)}
              className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-zinc-800 aria-selected:bg-zinc-700"
            >
              <LayoutPanelLeft className="size-4 text-zinc-400" /> Apply
              Left-to-Right Layout
            </Command.Item> */}
          </Command.Group>

          {/* Add more groups and commands here */}
        </Command.List>
      </div>
    </Command.Dialog>
  );
}
