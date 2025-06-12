import { createClient } from '@/helpers/supabase/client';
import { useEffect, useState } from 'react';

export const useCurrentUserName = () => {
	const [name, setName] = useState<string | null>(null);

	useEffect(() => {
		const fetchProfileName = async () => {
			const { data, error } = await createClient().auth.getSession();
			if (error) {
				console.error(error);
			}

			setName(
				data.session?.user.user_metadata.full_name ??
					data.session?.user.user_metadata.display_name ??
					data.session?.user.email ??
					'Unknown'
			);
		};

		fetchProfileName();
	}, []);

	return name || 'Unknown';
};
