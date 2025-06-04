"use client";

import { SidePanel } from "@/components/side-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import useAppStore from "@/contexts/mind-map/mind-map-store";
import {
  CreateRoomCodeRequest,
  ShareRole,
  ShareToken,
} from "@/types/sharing-types";
import {
  Clock,
  Copy,
  QrCode,
  RefreshCw,
  Settings,
  Share2,
  Users,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useShallow } from "zustand/shallow";

export function SharePanel() {
  const {
    setPopoverOpen,
    popoverOpen,
    shareTokens,
    activeToken,
    guestUsers,
    currentUsers,
    isCreatingToken,
    sharingError,
    createRoomCode,
    refreshRoomCode,
    revokeRoomCode,
    updateTokenPermissions,
    subscribeToSharingUpdates,
    unsubscribeFromSharing,
    setSharingError,
    mindMap,
  } = useAppStore(
    useShallow((state) => ({
      setPopoverOpen: state.setPopoverOpen,
      mindMap: state.mindMap,
      popoverOpen: state.popoverOpen,
      shareTokens: state.shareTokens,
      activeToken: state.activeToken,
      guestUsers: state.guestUsers,
      currentUsers: state.currentUsers,
      isCreatingToken: state.isCreatingToken,
      sharingError: state.sharingError,
      createRoomCode: state.createRoomCode,
      refreshRoomCode: state.refreshRoomCode,
      revokeRoomCode: state.revokeRoomCode,
      updateTokenPermissions: state.updateTokenPermissions,
      subscribeToSharingUpdates: state.subscribeToSharingUpdates,
      unsubscribeFromSharing: state.unsubscribeFromSharing,
      setSharingError: state.setSharingError,
    })),
  );
  const mapId = mindMap?.id;
  const isOpen = popoverOpen.sharePanel;
  const mapTitle = mindMap?.title;

  const [newRoomConfig, setNewRoomConfig] = useState<CreateRoomCodeRequest>({
    map_id: mapId,
    role: "viewer",
    can_edit: false,
    can_comment: true,
    can_view: true,
    max_users: 50,
  });

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);

  useEffect(() => {
    if (isOpen) {
      subscribeToSharingUpdates(mapId);
    } else {
      unsubscribeFromSharing();
    }

    return () => {
      unsubscribeFromSharing();
    };
  }, [isOpen, mapId]);

  useEffect(() => {
    if (sharingError) {
      toast.error(sharingError.message);
      setSharingError(undefined);
    }
  }, [sharingError]);

  const handleCreateRoomCode = async () => {
    try {
      const token = await createRoomCode(newRoomConfig);
      toast.success("Room code created successfully!");
    } catch (error) {
      // Error is already handled by the slice and shown via toast
    }
  };

  const handleCopyRoomCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success("Room code copied to clipboard!");
    } catch (error) {
      toast.error("Failed to copy room code");
    }
  };

  const handleCopyShareLink = async (token: ShareToken) => {
    try {
      const shareUrl = `${window.location.origin}/join/${token.token}`;
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Share link copied to clipboard!");
    } catch (error) {
      toast.error("Failed to copy share link");
    }
  };

  const handleRefreshCode = async (tokenId: string) => {
    try {
      await refreshRoomCode(tokenId);
      toast.success("Room code refreshed!");
    } catch (error) {
      // Error handled by slice
    }
  };

  const handleRevokeCode = async (tokenId: string) => {
    try {
      await revokeRoomCode(tokenId);
      toast.success("Room code revoked");
    } catch (error) {
      // Error handled by slice
    }
  };

  const updateRole = async (tokenId: string, role: ShareRole) => {
    try {
      await updateTokenPermissions(tokenId, {
        role,
        can_edit: role === "editor" || role === "owner",
        can_comment: role !== "viewer" || role === "commenter",
        can_view: true,
      });
      toast.success("Permissions updated");
    } catch (error) {
      // Error handled by slice
    }
  };

  const formatTimeRemaining = (expiresAt?: string) => {
    if (!expiresAt) return "Never expires";

    const expiry = new Date(expiresAt);
    const now = new Date();
    const diff = expiry.getTime() - now.getTime();

    if (diff <= 0) return "Expired";

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}m remaining`;
    }

    return `${minutes}m remaining`;
  };

  const activeRoomTokens = shareTokens.filter(
    (token) => token.is_active && token.token_type === "room_code",
  );

  const handleOnClose = () => {
    setPopoverOpen({ ...popoverOpen, sharePanel: false });
  };

  if (!popoverOpen.sharePanel) {
    return null;
  }

  return (
    <SidePanel
      isOpen={isOpen}
      onClose={handleOnClose}
      title="Share Mind Map"
      className="w-96"
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-zinc-300">
            Sharing: {mapTitle}
          </h3>

          <p className="text-xs text-zinc-400">
            Create room codes for easy collaboration or manage direct share
            links
          </p>
        </div>

        <Tabs defaultValue="room-codes" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="room-codes" className="flex items-center gap-2">
              <QrCode className="h-4 w-4" />
              Room Codes
            </TabsTrigger>

            <TabsTrigger
              value="direct-shares"
              className="flex items-center gap-2"
            >
              <Share2 className="h-4 w-4" />
              Direct Links
            </TabsTrigger>
          </TabsList>

          <TabsContent value="room-codes" className="space-y-4">
            {/* Active Room Codes */}
            {activeRoomTokens.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-zinc-300">
                  Active Room Codes
                </h4>

                {activeRoomTokens.map((token) => (
                  <motion.div
                    key={token.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-lg border border-zinc-700 bg-zinc-800/50 space-y-3"
                  >
                    {/* Room Code Display */}
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <code className="text-lg font-mono font-bold text-teal-400 bg-zinc-900 px-2 py-1 rounded">
                            {token.token}
                          </code>

                          <Badge variant="outline" className="text-xs">
                            {token.permissions.role}
                          </Badge>
                        </div>

                        <p className="text-xs text-zinc-400">
                          {token.current_users} / {token.max_users} users
                        </p>
                      </div>

                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleCopyRoomCode(token.token)}
                          className="h-8 w-8 p-0"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleCopyShareLink(token)}
                          className="h-8 w-8 p-0"
                        >
                          <Share2 className="h-4 w-4" />
                        </Button>

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRefreshCode(token.id)}
                          className="h-8 w-8 p-0"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRevokeCode(token.id)}
                          className="h-8 w-8 p-0 text-red-400 hover:text-red-300"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Permissions */}
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-zinc-400">Role</Label>

                      <Select
                        value={token.permissions.role}
                        onValueChange={(role: ShareRole) =>
                          updateRole(token.id, role)
                        }
                      >
                        <SelectTrigger className="w-32 h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>

                        <SelectContent>
                          <SelectItem value="viewer">Viewer</SelectItem>

                          <SelectItem value="commenter">Commenter</SelectItem>

                          <SelectItem value="editor">Editor</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Expiration */}
                    {token.expires_at && (
                      <div className="flex items-center gap-2 text-xs text-zinc-400">
                        <Clock className="h-3 w-3" />

                        {formatTimeRemaining(token.expires_at)}
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            )}

            {/* Create New Room Code */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-zinc-300">
                  Create Room Code
                </h4>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="text-xs"
                >
                  <Settings className="h-3 w-3 mr-1" />

                  {showAdvanced ? "Basic" : "Advanced"}
                </Button>
              </div>

              <div className="space-y-3">
                {/* Role Selection */}
                <div className="space-y-2">
                  <Label className="text-xs text-zinc-400">Default Role</Label>

                  <Select
                    value={newRoomConfig.role}
                    onValueChange={(role: ShareRole) =>
                      setNewRoomConfig((prev) => ({
                        ...prev,
                        role,
                        can_edit: role === "editor" || role === "owner",
                        can_comment: role !== "viewer" || role === "commenter",
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>

                    <SelectContent>
                      <SelectItem value="viewer">
                        Viewer - Can only view
                      </SelectItem>

                      <SelectItem value="commenter">
                        Commenter - Can view and comment
                      </SelectItem>

                      <SelectItem value="editor">
                        Editor - Can edit everything
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Advanced Options */}
                <AnimatePresence>
                  {showAdvanced && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-3"
                    >
                      {/* Max Users */}
                      <div className="space-y-2">
                        <Label className="text-xs text-zinc-400">
                          Max Users
                        </Label>

                        <Input
                          type="number"
                          min="1"
                          max="100"
                          value={newRoomConfig.max_users}
                          onChange={(e) =>
                            setNewRoomConfig((prev) => ({
                              ...prev,
                              max_users: parseInt(e.target.value) || 50,
                            }))
                          }
                        />
                      </div>

                      {/* Expiration */}
                      <div className="space-y-2">
                        <Label className="text-xs text-zinc-400">
                          Expires After
                        </Label>

                        <Select
                          value={newRoomConfig.expires_at ? "custom" : "never"}
                          onValueChange={(value) => {
                            if (value === "never") {
                              setNewRoomConfig((prev) => ({
                                ...prev,
                                expires_at: undefined,
                              }));
                            } else if (value === "1h") {
                              const expires = new Date();
                              expires.setHours(expires.getHours() + 1);
                              setNewRoomConfig((prev) => ({
                                ...prev,
                                expires_at: expires.toISOString(),
                              }));
                            } else if (value === "24h") {
                              const expires = new Date();
                              expires.setHours(expires.getHours() + 24);
                              setNewRoomConfig((prev) => ({
                                ...prev,
                                expires_at: expires.toISOString(),
                              }));
                            }
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>

                          <SelectContent>
                            <SelectItem value="never">Never</SelectItem>

                            <SelectItem value="1h">1 Hour</SelectItem>

                            <SelectItem value="24h">24 Hours</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Custom Permissions */}
                      <div className="space-y-3">
                        <Label className="text-xs text-zinc-400">
                          Custom Permissions
                        </Label>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs">Can Edit</Label>

                            <Switch
                              checked={newRoomConfig.can_edit}
                              onCheckedChange={(checked) =>
                                setNewRoomConfig((prev) => ({
                                  ...prev,
                                  can_edit: checked,
                                }))
                              }
                            />
                          </div>

                          <div className="flex items-center justify-between">
                            <Label className="text-xs">Can Comment</Label>

                            <Switch
                              checked={newRoomConfig.can_comment}
                              onCheckedChange={(checked) =>
                                setNewRoomConfig((prev) => ({
                                  ...prev,
                                  can_comment: checked,
                                }))
                              }
                            />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <Button
                  onClick={handleCreateRoomCode}
                  disabled={isCreatingToken}
                  className="w-full"
                >
                  {isCreatingToken ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <QrCode className="mr-2 h-4 w-4" />
                      Create Room Code
                    </>
                  )}
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="direct-shares" className="space-y-4">
            <div className="text-center py-8 text-zinc-400">
              <Share2 className="h-8 w-8 mx-auto mb-2 opacity-50" />

              <p className="text-sm">Direct sharing coming soon</p>

              <p className="text-xs">Share with specific users via email</p>
            </div>
          </TabsContent>
        </Tabs>

        {/* Current Users */}
        {currentUsers > 0 && (
          <div className="space-y-3">
            <Separator />

            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-zinc-400" />

              <span className="text-sm text-zinc-300">
                {currentUsers} user{currentUsers !== 1 ? "s" : ""} online
              </span>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-xs text-zinc-500 space-y-1">
          <p>• Room codes are case-insensitive</p>

          <p>• Users can join without creating an account</p>

          <p>• All activity is tracked and logged</p>
        </div>
      </div>
    </SidePanel>
  );
}
