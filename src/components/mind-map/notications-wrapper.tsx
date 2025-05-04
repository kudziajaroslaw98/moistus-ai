"use client";
import { useMindMapContext } from "@/contexts/mind-map/mind-map-context";
import { NotificationsDisplay } from "../notifications-display";

export function NotificationsWrapper() {
  const { notification } = useMindMapContext();
  return <NotificationsDisplay notification={notification} />;
}
