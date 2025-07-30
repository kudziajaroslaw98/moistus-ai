export interface MenuItem {
	id: string;
	icon: React.ReactNode;
	label: string;
	onClick: () => void;
	disabled?: boolean;
	variant?: 'default' | 'destructive' | 'primary';
	shortcut?: string;
	loading?: boolean;
	hidden?: boolean;
	customComponent?: React.ReactNode;
}

export interface MenuSection {
	id: string;
	title?: string;
	items: MenuItem[];
	showDivider?: boolean;
}

export interface ContextMenuConfig {
	sections: MenuSection[];
}
