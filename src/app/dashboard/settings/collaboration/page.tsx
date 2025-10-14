'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { UserAvatar } from '@/components/ui/user-avatar';
import {
	Clock,
	Crown,
	Link,
	Mail,
	MoreHorizontal,
	Plus,
	Save,
	Share,
	Trash2,
	UserPlus,
	Users,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface CollaborationSettings {
	defaultPermissions: 'view' | 'comment' | 'edit';
	allowPublicLinks: boolean;
	requireApproval: boolean;
	autoAcceptFrom: 'none' | 'connections' | 'domain';
	trustedDomains: string[];
	shareLinkExpiry: 'never' | '24h' | '7d' | '30d';
	notifications: {
		invitations: boolean;
		mentions: boolean;
		edits: boolean;
		comments: boolean;
	};
}

export default function CollaborationSettingsPage() {
	const [isSaving, setIsSaving] = useState(false);
	const [newMemberEmail, setNewMemberEmail] = useState('');
	const [newMemberRole, setNewMemberRole] = useState<'admin' | 'member'>(
		'member'
	);
	const [newDomain, setNewDomain] = useState('');

	const [settings, setSettings] = useState<CollaborationSettings>({
		defaultPermissions: 'view',
		allowPublicLinks: false,
		requireApproval: true,
		autoAcceptFrom: 'none',
		trustedDomains: [],
		shareLinkExpiry: 'never',
		notifications: {
			invitations: false,
			mentions: false,
			edits: false,
			comments: false,
		},
	});

	const handleSave = async () => {
		setIsSaving(true);

		try {
			// Note: Collaboration settings are not yet implemented in the backend
			// This page shows UI mockups for future collaboration features
			await new Promise((resolve) => setTimeout(resolve, 1000));

			toast.success('Collaboration settings updated successfully!');
		} catch (error) {
			console.error('Failed to save collaboration settings:', error);
			toast.error('Failed to save collaboration settings');
		} finally {
			setIsSaving(false);
		}
	};

	const handleInviteMember = async () => {
		if (!newMemberEmail.trim()) return;

		try {
			// TODO: Implement API call to invite member
			toast.success(`Invitation sent to ${newMemberEmail}`);
			setNewMemberEmail('');
			setNewMemberRole('member');
		} catch {
			toast.error('Failed to send invitation');
		}
	};

	const addTrustedDomain = () => {
		if (
			newDomain.trim() &&
			!settings.trustedDomains.includes(newDomain.trim())
		) {
			setSettings((prev) => ({
				...prev,
				trustedDomains: [...prev.trustedDomains, newDomain.trim()],
			}));
			setNewDomain('');
		}
	};

	const removeTrustedDomain = (domain: string) => {
		setSettings((prev) => ({
			...prev,
			trustedDomains: prev.trustedDomains.filter((d) => d !== domain),
		}));
	};

	const updateSetting = <K extends keyof CollaborationSettings>(
		key: K,
		value: CollaborationSettings[K]
	) => {
		setSettings((prev) => ({
			...prev,
			[key]: value,
		}));
	};

	const updateNotificationSetting = <
		K extends keyof CollaborationSettings['notifications'],
	>(
		key: K,
		value: CollaborationSettings['notifications'][K]
	) => {
		setSettings((prev) => ({
			...prev,
			notifications: {
				...prev.notifications,
				[key]: value,
			},
		}));
	};

	const getRoleBadgeColor = (role: string) => {
		switch (role) {
			case 'owner':
				return 'bg-amber-900/50 text-amber-200 border-amber-700/50';
			case 'admin':
				return 'bg-blue-900/50 text-blue-200 border-blue-700/50';
			case 'member':
				return 'bg-green-900/50 text-green-200 border-green-700/50';
			default:
				return 'bg-zinc-700 text-zinc-300 border-zinc-600';
		}
	};

	const getStatusBadgeColor = (status: string) => {
		switch (status) {
			case 'active':
				return 'bg-green-900/50 text-green-200 border-green-700/50';
			case 'pending':
				return 'bg-yellow-900/50 text-yellow-200 border-yellow-700/50';
			case 'inactive':
				return 'bg-zinc-700 text-zinc-300 border-zinc-600';
			default:
				return 'bg-zinc-700 text-zinc-300 border-zinc-600';
		}
	};

	return (
		<div className='space-y-6'>
			{/* Header */}
			<div className='flex items-center justify-between'>
				<div>
					<h2 className='text-2xl font-bold text-white'>
						Collaboration Settings
					</h2>

					<p className='text-zinc-400 mt-1'>
						Manage team access and collaboration preferences
					</p>
				</div>

				<Button
					className='bg-sky-600 hover:bg-sky-700'
					disabled={isSaving}
					onClick={handleSave}
				>
					<Save className='size-4 mr-2' />

					{isSaving ? 'Saving...' : 'Save Changes'}
				</Button>
			</div>

			{/* Team Members */}
			<Card className='bg-zinc-900 border-zinc-700'>
				<CardHeader>
					<CardTitle className='text-white flex items-center gap-2'>
						<Users className='size-5' />
						Team Members
					</CardTitle>

					<CardDescription>
						Manage who has access to your workspace
					</CardDescription>
				</CardHeader>

				<CardContent className='space-y-4'>
					{/* Invite new member */}
					<div className='p-4 bg-zinc-800/30 rounded-lg space-y-3'>
						<Label className='text-white'>Invite new member</Label>

						<div className='flex gap-2'>
							<Input
								className='bg-zinc-800 border-zinc-600 flex-1'
								placeholder='email@example.com'
								value={newMemberEmail}
								onChange={(e) => setNewMemberEmail(e.target.value)}
							/>

							<Select
								value={newMemberRole}
								onValueChange={(value: 'admin' | 'member') =>
									setNewMemberRole(value)
								}
							>
								<SelectTrigger className='bg-zinc-800 border-zinc-600 w-32'>
									<SelectValue />
								</SelectTrigger>

								<SelectContent>
									<SelectItem value='member'>Member</SelectItem>

									<SelectItem value='admin'>Admin</SelectItem>
								</SelectContent>
							</Select>

							<Button size='sm' onClick={handleInviteMember}>
								<UserPlus className='size-4 mr-2' />
								Invite
							</Button>
						</div>
					</div>

					<Separator className='bg-zinc-700' />

					{/* Current members */}
					<div className='space-y-3'>
						{teamMembers.map((member) => (
							<div
								className='flex items-center justify-between p-3 bg-zinc-800/30 rounded-lg'
								key={member.id}
							>
								<div className='flex items-center gap-3'>
									<UserAvatar
										size='sm'
										user={{
											id: member.id,
											user_id: member.id,
											full_name: member.name,
											avatar_url: member.avatar,
											created_at: member.joinedAt,
										}}
									/>

									<div>
										<div className='flex items-center gap-2'>
											<span className='font-medium text-white'>
												{member.name}
											</span>

											{member.role === 'owner' && (
												<Crown className='size-4 text-amber-400' />
											)}
										</div>

										<p className='text-sm text-zinc-400'>{member.email}</p>
									</div>
								</div>

								<div className='flex items-center gap-2'>
									<Badge className={getRoleBadgeColor(member.role)}>
										{member.role}
									</Badge>

									<Badge className={getStatusBadgeColor(member.status)}>
										{member.status}
									</Badge>

									{member.role !== 'owner' && (
										<Button size='sm' variant='ghost'>
											<MoreHorizontal className='size-4' />
										</Button>
									)}
								</div>
							</div>
						))}
					</div>

					{/* Pending invitations */}
					{pendingInvitations.length > 0 && (
						<>
							<Separator className='bg-zinc-700' />

							<div className='space-y-3'>
								<Label className='text-white'>Pending invitations</Label>

								{pendingInvitations.map((invitation) => (
									<div
										className='flex items-center justify-between p-3 bg-zinc-800/30 rounded-lg border border-yellow-700/30'
										key={invitation.id}
									>
										<div className='flex items-center gap-3'>
											<div className='w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center'>
												<Mail className='size-4 text-zinc-400' />
											</div>

											<div>
												<span className='font-medium text-white'>
													{invitation.email}
												</span>

												<p className='text-sm text-zinc-400 flex gap-1'>
													<span>Expires</span>

													<span>
														{new Date(
															invitation.expiresAt
														).toLocaleDateString()}
													</span>
												</p>
											</div>
										</div>

										<div className='flex items-center gap-2'>
											<Badge className={getRoleBadgeColor(invitation.role)}>
												{invitation.role}
											</Badge>

											<Badge className='bg-yellow-900/50 text-yellow-200 border-yellow-700/50'>
												pending
											</Badge>

											<Button size='sm' variant='ghost'>
												<Trash2 className='size-4 text-red-400' />
											</Button>
										</div>
									</div>
								))}
							</div>
						</>
					)}
				</CardContent>
			</Card>

			{/* Sharing Settings */}
			<Card className='bg-zinc-900 border-zinc-700'>
				<CardHeader>
					<CardTitle className='text-white flex items-center gap-2'>
						<Share className='size-5' />
						Sharing Settings
					</CardTitle>

					<CardDescription>
						Configure default permissions and sharing behavior
					</CardDescription>
				</CardHeader>

				<CardContent className='space-y-4'>
					<div className='space-y-2'>
						<Label>Default permissions for new collaborators</Label>

						<Select
							value={settings.defaultPermissions}
							onValueChange={(value: 'view' | 'comment' | 'edit') =>
								updateSetting('defaultPermissions', value)
							}
						>
							<SelectTrigger className='bg-zinc-800 border-zinc-600'>
								<SelectValue />
							</SelectTrigger>

							<SelectContent>
								<SelectItem value='view'>
									View only - Can see content
								</SelectItem>

								<SelectItem value='comment'>
									Comment - Can add comments
								</SelectItem>

								<SelectItem value='edit'>Edit - Can modify content</SelectItem>
							</SelectContent>
						</Select>
					</div>

					<Separator className='bg-zinc-700' />

					<div className='flex items-center justify-between'>
						<div>
							<Label>Allow public sharing links</Label>

							<p className='text-sm text-zinc-400'>
								Enable creating shareable links for mind maps
							</p>
						</div>

						<Switch
							checked={settings.allowPublicLinks}
							onCheckedChange={(checked) =>
								updateSetting('allowPublicLinks', checked)
							}
						/>
					</div>

					{settings.allowPublicLinks && (
						<div className='space-y-2 pl-6'>
							<Label>Share link expiry</Label>

							<Select
								value={settings.shareLinkExpiry}
								onValueChange={(value: 'never' | '24h' | '7d' | '30d') =>
									updateSetting('shareLinkExpiry', value)
								}
							>
								<SelectTrigger className='bg-zinc-800 border-zinc-600'>
									<SelectValue />
								</SelectTrigger>

								<SelectContent>
									<SelectItem value='never'>
										<div className='flex items-center gap-2'>
											<Link className='size-4' />
											Never expire
										</div>
									</SelectItem>

									<SelectItem value='24h'>
										<div className='flex items-center gap-2'>
											<Clock className='size-4' />
											24 hours
										</div>
									</SelectItem>

									<SelectItem value='7d'>
										<div className='flex items-center gap-2'>
											<Clock className='size-4' />7 days
										</div>
									</SelectItem>

									<SelectItem value='30d'>
										<div className='flex items-center gap-2'>
											<Clock className='size-4' />
											30 days
										</div>
									</SelectItem>
								</SelectContent>
							</Select>
						</div>
					)}

					<Separator className='bg-zinc-700' />

					<div className='flex items-center justify-between'>
						<div>
							<Label>Require approval for new collaborators</Label>

							<p className='text-sm text-zinc-400'>
								New collaborators must be approved before gaining access
							</p>
						</div>

						<Switch
							checked={settings.requireApproval}
							onCheckedChange={(checked) =>
								updateSetting('requireApproval', checked)
							}
						/>
					</div>

					<div className='space-y-2'>
						<Label>Auto-accept collaboration requests from</Label>

						<Select
							value={settings.autoAcceptFrom}
							onValueChange={(value: 'none' | 'connections' | 'domain') =>
								updateSetting('autoAcceptFrom', value)
							}
						>
							<SelectTrigger className='bg-zinc-800 border-zinc-600'>
								<SelectValue />
							</SelectTrigger>

							<SelectContent>
								<SelectItem value='none'>
									None - Always require approval
								</SelectItem>

								<SelectItem value='connections'>
									Existing connections
								</SelectItem>

								<SelectItem value='domain'>Trusted domains</SelectItem>
							</SelectContent>
						</Select>
					</div>
				</CardContent>
			</Card>

			{/* Trusted Domains */}
			<Card className='bg-zinc-900 border-zinc-700'>
				<CardHeader>
					<CardTitle className='text-white'>Trusted Domains</CardTitle>

					<CardDescription>
						Automatically approve collaboration requests from these domains
					</CardDescription>
				</CardHeader>

				<CardContent className='space-y-4'>
					<div className='flex gap-2'>
						<Input
							className='bg-zinc-800 border-zinc-600'
							placeholder='company.com'
							value={newDomain}
							onChange={(e) => setNewDomain(e.target.value)}
							onKeyPress={(e) => e.key === 'Enter' && addTrustedDomain()}
						/>

						<Button size='sm' onClick={addTrustedDomain}>
							<Plus className='size-4' />
						</Button>
					</div>

					<div className='flex flex-wrap gap-2'>
						{settings.trustedDomains.map((domain) => (
							<Badge
								className='bg-sky-900/50 text-sky-200 hover:bg-sky-800 border border-sky-700/50'
								key={domain}
								variant='secondary'
							>
								{domain}

								<button
									className='ml-1 hover:text-red-400'
									onClick={() => removeTrustedDomain(domain)}
								>
									<Trash2 className='size-3' />
								</button>
							</Badge>
						))}
					</div>
				</CardContent>
			</Card>

			{/* Collaboration Notifications */}
			<Card className='bg-zinc-900 border-zinc-700'>
				<CardHeader>
					<CardTitle className='text-white'>
						Collaboration Notifications
					</CardTitle>

					<CardDescription>
						Configure notifications for collaboration activities
					</CardDescription>
				</CardHeader>

				<CardContent className='space-y-4'>
					<div className='flex items-center justify-between'>
						<div>
							<Label>Collaboration invitations</Label>

							<p className='text-sm text-zinc-400'>
								Get notified when someone invites you to collaborate
							</p>
						</div>

						<Switch
							checked={settings.notifications.invitations}
							onCheckedChange={(checked) =>
								updateNotificationSetting('invitations', checked)
							}
						/>
					</div>

					<div className='flex items-center justify-between'>
						<div>
							<Label>Mentions in comments</Label>

							<p className='text-sm text-zinc-400'>
								Get notified when someone mentions you in comments
							</p>
						</div>

						<Switch
							checked={settings.notifications.mentions}
							onCheckedChange={(checked) =>
								updateNotificationSetting('mentions', checked)
							}
						/>
					</div>

					<div className='flex items-center justify-between'>
						<div>
							<Label>Content edits</Label>

							<p className='text-sm text-zinc-400'>
								Get notified when collaborators edit shared content
							</p>
						</div>

						<Switch
							checked={settings.notifications.edits}
							onCheckedChange={(checked) =>
								updateNotificationSetting('edits', checked)
							}
						/>
					</div>

					<div className='flex items-center justify-between'>
						<div>
							<Label>New comments</Label>

							<p className='text-sm text-zinc-400'>
								Get notified when someone comments on shared content
							</p>
						</div>

						<Switch
							checked={settings.notifications.comments}
							onCheckedChange={(checked) =>
								updateNotificationSetting('comments', checked)
							}
						/>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
