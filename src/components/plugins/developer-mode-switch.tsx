'use client';

import { Switch } from '@/components/ui/switch';
import useAppStore from '@/store/mind-map-store';
import { useShallow } from 'zustand/react/shallow';

interface DeveloperModeSwitchProps {
	id: string;
	checked: boolean;
	disabled?: boolean;
	onCheckedChange: (checked: boolean) => void;
}

/** The "Developer mode" row: label, what it does, and the switch. */
export function DeveloperModeSwitch({
	id,
	checked,
	disabled = false,
	onCheckedChange,
}: DeveloperModeSwitchProps) {
	return (
		<div className='flex items-start justify-between gap-4'>
			<div className='flex min-w-0 flex-col gap-1'>
				<label className='text-sm font-medium text-text-primary' htmlFor={id}>
					Developer mode
				</label>

				<p className='text-xs leading-[17px] text-text-secondary' id={`${id}-description`}>
					Shows the Developer section in the Plugins panel, for loading plugins
					you&apos;re building from localhost. Only you see those plugins.
				</p>
			</div>

			{/* The Switch is a hidden checkbox; the label makes its track clickable. */}
			<label className='mt-0.5 shrink-0 cursor-pointer' htmlFor={id}>
				<Switch
					aria-describedby={`${id}-description`}
					checked={checked}
					disabled={disabled}
					id={id}
					onCheckedChange={onCheckedChange}
					role='switch'
				/>
			</label>
		</div>
	);
}

/** The signed-in account's Developer mode, saved to `user_profiles.preferences` right away. */
export function useDeveloperMode() {
	const { enabled, available, updatePreferences } = useAppStore(
		useShallow((state) => ({
			enabled: state.userProfile?.preferences?.developerMode === true,
			// Guests can't own maps, so they can't load developer plugins.
			available: Boolean(state.userProfile && !state.userProfile.is_anonymous),
			updatePreferences: state.updatePreferences,
		}))
	);
	return {
		enabled,
		available,
		setEnabled: (developerMode: boolean) =>
			updatePreferences({ developerMode }),
	};
}

/** Developer mode switch that saves as soon as it's flipped (Map Settings, the guide). */
export function DeveloperModeSetting({ id }: { id: string }) {
	const { enabled, available, setEnabled } = useDeveloperMode();
	return (
		<DeveloperModeSwitch
			checked={enabled}
			disabled={!available}
			id={id}
			onCheckedChange={(checked) => void setEnabled(checked)}
		/>
	);
}
