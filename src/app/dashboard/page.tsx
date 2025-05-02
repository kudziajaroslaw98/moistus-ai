"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import useFetch from "@/hooks/use-fetch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface MindMapData {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export default function DashboardPage() {
  const [mindMaps, setMindMaps] = useState<MindMapData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newMapTitle, setNewMapTitle] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [notification, setNotification] = useState<{
    message: string | null;
    type: "success" | "error" | null;
  }>({ message: null, type: null });

  const { fetch } = useFetch();
  const router = useRouter();

  const showNotification = useCallback(
    (message: string, type: "success" | "error") => {
      setNotification({ message, type });
      const timer = setTimeout(() => {
        setNotification({ message: null, type: null });
      }, 5000);
      return () => clearTimeout(timer);
    },
    [],
  );

  const fetchMindMaps = useCallback(async () => {
    setLoading(true);
    setError(null);

    const response = await fetch<{ maps: MindMapData[] }>("/api/maps", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (response.status === "error") {
      const errorMsg = response.error || "Failed to fetch mind maps.";
      setError(errorMsg);
      // Optionally show notification for fetch error
      // showNotification(errorMsg, "error");
    } else {
      setMindMaps(response.data.maps);
    }

    setLoading(false);
  }, []); // Removed showNotification dependency

  useEffect(() => {
    fetchMindMaps();
  }, [fetchMindMaps]);

  const handleCreateMap = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMapTitle.trim() || isCreating) return;

    setIsCreating(true);
    setError(null);
    // No pending notification needed, button shows loading state

    try {
      const response = await fetch<{ map: MindMapData }>("/api/maps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newMapTitle }),
      });

      if (response.status === "error") {
        throw new Error(response.error || "Failed to create new mind map.");
      }

      setMindMaps([response.data.map, ...mindMaps]);
      setNewMapTitle("");
      showNotification("Map created successfully!", "success");
      router.push(`/mind-map/${response.data.map.id}`);
    } catch (err: unknown) {
      console.error("Error creating map:", err);
      const message =
        err instanceof Error
          ? err.message
          : "An error occurred while creating the map.";
      setError(message); // Keep track of error state
      showNotification(message, "error");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteMap = async (mapId: string) => {
    // Consider using a custom modal later
    if (!confirm("Delete this mind map? This action cannot be undone.")) {
      return;
    }

    // Visually disable or indicate loading on the specific card being deleted (more advanced)
    setError(null);

    try {
      const response = await fetch(`/api/maps/${mapId}`, {
        method: "DELETE",
      });

      if (response.status === "error") {
        throw new Error(response.error || "Failed to delete mind map.");
      }

      setMindMaps(mindMaps.filter((map) => map.id !== mapId));
      showNotification("Map deleted successfully.", "success");
    } catch (err: unknown) {
      console.error("Error deleting map:", err);
      const message =
        err instanceof Error
          ? err.message
          : "An error occurred while deleting the map.";
      setError(message); // Keep track of error state
      showNotification(message, "error");
    }
    // Add finally block to remove loading state from card if implemented
  };

  if (loading && mindMaps.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center text-zinc-400">
        Loading your maps...
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-zinc-900 p-6 md:p-8">
      <div className="mx-auto h-full w-full max-w-4xl">
        <h1 className="mb-8 text-3xl font-bold text-zinc-100">
          Your Mind Maps
        </h1>

        {/* Create New Map Form */}
        <form
          onSubmit={handleCreateMap}
          className="mb-8 flex flex-col gap-3 sm:flex-row"
        >
          <Input
            type="text"
            value={newMapTitle}
            onChange={(e) => setNewMapTitle(e.target.value)}
            placeholder="New Mind Map Title"
            className="flex-grow"
            disabled={isCreating}
          />
          <Button type="submit" disabled={!newMapTitle.trim() || isCreating}>
            {isCreating ? "Creating..." : "Create Map"}
          </Button>
        </form>

        {/* Loading/Error State */}
        {loading && mindMaps.length > 0 && (
          <p className="mb-4 text-zinc-400">Refreshing maps...</p>
        )}
        {error && <p className="mb-4 text-red-400">Error: {error}</p>}

        {/* Mind Map List */}
        {mindMaps.length === 0 && !loading ? (
          <div className="py-10 text-center text-zinc-400">
            <p>You don&apos;t have any mind maps yet.</p>
            <p>Create one using the form above to get started!</p>
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {mindMaps.map((map) => (
              <li
                key={map.id}
                className="flex flex-col justify-between rounded-sm bg-zinc-800 p-5 shadow-md transition-shadow duration-200 hover:shadow-lg"
              >
                <div>
                  <h2 className="mb-1 truncate text-lg font-semibold text-zinc-100">
                    {map.title}
                  </h2>
                  <p className="mb-4 text-sm text-zinc-400">
                    Created: {new Date(map.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="mt-4 flex items-center justify-end gap-2">
                  <Button
                    onClick={() => handleDeleteMap(map.id)}
                    title="Delete Map"
                    variant="ghost"
                    size="icon"
                    className="text-zinc-400 hover:text-rose-400"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </Button>
                  <Link
                    href={`/mind-map/${map.id}`}
                    title="Open Map"
                    className="inline-flex items-center rounded-sm border border-transparent bg-sky-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-sky-700 focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-zinc-800 focus:outline-none"
                  >
                    Open
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="ml-1.5 h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                      />
                    </svg>
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* Notification Display */}
        {notification.message && (
          <div
            className={`fixed right-5 bottom-5 z-50 max-w-sm rounded-sm p-3 text-sm font-medium shadow-lg ${
              notification.type === "success"
                ? "bg-emerald-600 text-white"
                : "bg-rose-600 text-white"
            }`}
          >
            {notification.message}
          </div>
        )}
      </div>
    </div>
  );
}
