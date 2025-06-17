'use client';

import React, { useState, useCallback } from 'react';
import { useRealtimeFormEnhanced, type FormConflict, type MergeStrategy } from '@/hooks/realtime/use-realtime-form-enhanced';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Users,
  Lock,
  Unlock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Wifi,
  WifiOff,
  User
} from 'lucide-react';

interface RealtimeFormExampleProps {
  roomName?: string;
  initialData?: Record<string, any>;
}

export function RealtimeFormExample({
  roomName = 'example-form-room',
  initialData = {}
}: RealtimeFormExampleProps) {
  const [mergeStrategy, setMergeStrategy] = useState<MergeStrategy>('newest-timestamp');
  const [enableFieldLocking, setEnableFieldLocking] = useState(true);
  const [autoResolveConflicts, setAutoResolveConflicts] = useState(false);

  const handleConflict = useCallback((conflict: FormConflict) => {
    if (autoResolveConflicts) {
      // Auto-resolve using newest timestamp
      return conflict.remoteTimestamp > conflict.localTimestamp ? 'remote' : 'local';
    }
    return 'manual'; // Let user decide
  }, [autoResolveConflicts]);

  const {
    formState,
    updateField,
    lockField,
    unlockField,
    isFieldLocked,
    getFieldLocker,
    forceSync,
    isConnected,
    activeUsers,
    conflicts,
    resolveConflict,
  } = useRealtimeFormEnhanced(roomName, {
    title: '',
    description: '',
    priority: 'medium',
    tags: [],
    ...initialData,
  }, {
    mergeStrategy,
    debounceMs: 300,
    enableFieldLocking,
    onConflict: handleConflict,
    syncOnMount: true,
  });

  const handleFieldChange = (fieldName: string, value: any) => {
    updateField(fieldName, value);
  };

  const handleFieldFocus = (fieldName: string) => {
    if (enableFieldLocking) {
      lockField(fieldName);
    }
  };

  const handleFieldBlur = (fieldName: string) => {
    if (enableFieldLocking) {
      unlockField(fieldName);
    }
  };

  const getFieldValue = (fieldName: string) => {
    return formState.fields[fieldName]?.value || '';
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const getUserDisplayName = (userId: string) => {
    // In a real app, you'd fetch user data
    return userId.slice(0, 8) + '...';
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header with Connection Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                Realtime Form Example
                {isConnected ? (
                  <Wifi className="h-5 w-5 text-green-500" />
                ) : (
                  <WifiOff className="h-5 w-5 text-red-500" />
                )}
              </CardTitle>
              <CardDescription>
                Collaborative form with conflict resolution and field locking
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={forceSync}
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Force Sync
            </Button>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Form Fields</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Title Field */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="title">Title</Label>
                  {isFieldLocked('title') && (
                    <Badge variant="destructive" className="text-xs">
                      <Lock className="h-3 w-3 mr-1" />
                      Locked by {getUserDisplayName(getFieldLocker('title')!)}
                    </Badge>
                  )}
                </div>
                <Input
                  id="title"
                  value={getFieldValue('title')}
                  onChange={(e) => handleFieldChange('title', e.target.value)}
                  onFocus={() => handleFieldFocus('title')}
                  onBlur={() => handleFieldBlur('title')}
                  disabled={isFieldLocked('title')}
                  className={isFieldLocked('title') ? 'opacity-50' : ''}
                  placeholder="Enter title..."
                />
              </div>

              {/* Description Field */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="description">Description</Label>
                  {isFieldLocked('description') && (
                    <Badge variant="destructive" className="text-xs">
                      <Lock className="h-3 w-3 mr-1" />
                      Locked by {getUserDisplayName(getFieldLocker('description')!)}
                    </Badge>
                  )}
                </div>
                <Textarea
                  id="description"
                  value={getFieldValue('description')}
                  onChange={(e) => handleFieldChange('description', e.target.value)}
                  onFocus={() => handleFieldFocus('description')}
                  onBlur={() => handleFieldBlur('description')}
                  disabled={isFieldLocked('description')}
                  className={isFieldLocked('description') ? 'opacity-50' : ''}
                  placeholder="Enter description..."
                  rows={4}
                />
              </div>

              {/* Priority Field */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="priority">Priority</Label>
                  {isFieldLocked('priority') && (
                    <Badge variant="destructive" className="text-xs">
                      <Lock className="h-3 w-3 mr-1" />
                      Locked by {getUserDisplayName(getFieldLocker('priority')!)}
                    </Badge>
                  )}
                </div>
                <Select
                  value={getFieldValue('priority')}
                  onValueChange={(value) => handleFieldChange('priority', value)}
                  disabled={isFieldLocked('priority')}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Conflicts Section */}
          {conflicts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-orange-600">
                  <AlertTriangle className="h-5 w-5" />
                  Conflicts ({conflicts.length})
                </CardTitle>
                <CardDescription>
                  Resolve conflicts between your changes and others
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {conflicts.map((conflict) => (
                  <Alert key={conflict.fieldName} className="border-orange-200">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>
                      Conflict in "{conflict.fieldName}" field
                    </AlertTitle>
                    <AlertDescription className="space-y-3">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="space-y-1">
                          <p className="font-medium">Your version:</p>
                          <p className="bg-blue-50 p-2 rounded border text-blue-800">
                            {String(conflict.localValue)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Modified at {formatTimestamp(conflict.localTimestamp)}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="font-medium">
                            {getUserDisplayName(conflict.remoteUser)}'s version:
                          </p>
                          <p className="bg-green-50 p-2 rounded border text-green-800">
                            {String(conflict.remoteValue)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Modified at {formatTimestamp(conflict.remoteTimestamp)}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => resolveConflict(conflict.fieldName, 'local')}
                          className="flex items-center gap-1"
                        >
                          <CheckCircle className="h-3 w-3" />
                          Keep Mine
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => resolveConflict(conflict.fieldName, 'remote')}
                          className="flex items-center gap-1"
                        >
                          <CheckCircle className="h-3 w-3" />
                          Accept Theirs
                        </Button>
                      </div>
                    </AlertDescription>
                  </Alert>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Active Users */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Active Users ({activeUsers.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activeUsers.length === 0 ? (
                <p className="text-sm text-muted-foreground">No other users online</p>
              ) : (
                <div className="space-y-2">
                  {activeUsers.map((userId) => (
                    <div key={userId} className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <span className="text-sm">{getUserDisplayName(userId)}</span>
                      <div className="h-2 w-2 bg-green-500 rounded-full" />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Merge Strategy</Label>
                <Select
                  value={mergeStrategy}
                  onValueChange={(value: MergeStrategy) => setMergeStrategy(value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest-timestamp">Newest Timestamp</SelectItem>
                    <SelectItem value="last-writer-wins">Last Writer Wins</SelectItem>
                    <SelectItem value="manual">Manual Resolution</SelectItem>
                    <SelectItem value="field-level">Field Level</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="field-locking"
                  checked={enableFieldLocking}
                  onCheckedChange={setEnableFieldLocking}
                />
                <Label htmlFor="field-locking">Enable Field Locking</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="auto-resolve"
                  checked={autoResolveConflicts}
                  onCheckedChange={setAutoResolveConflicts}
                />
                <Label htmlFor="auto-resolve">Auto-resolve Conflicts</Label>
              </div>
            </CardContent>
          </Card>

          {/* Form State Debug */}
          <Card>
            <CardHeader>
              <CardTitle>Debug Info</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-xs">
                <div>
                  <strong>Last Synced:</strong>{' '}
                  {formatTimestamp(formState.metadata.lastSyncedAt)}
                </div>
                <div>
                  <strong>Version:</strong> {formState.metadata.version}
                </div>
                <div>
                  <strong>Active Fields:</strong>{' '}
                  {Object.keys(formState.activeFields).length}
                </div>
                <div>
                  <strong>Room:</strong> {roomName}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default RealtimeFormExample;
