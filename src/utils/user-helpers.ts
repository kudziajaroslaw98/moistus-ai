import type { SupabaseClient } from "@supabase/supabase-js";

export interface UserInfo {
  id: string;
  email?: string;
  displayName: string;
  initials: string;
}

export async function getUserInfo(
  supabase: SupabaseClient,
  userId: string
): Promise<UserInfo> {
  try {
    const { data: user, error } = await supabase.auth.admin.getUserById(userId);
    
    if (error || !user) {
      return {
        id: userId,
        displayName: `User ${userId.substring(0, 8)}`,
        initials: "U"
      };
    }

    const email = user.user.email;
    const displayName = email?.split('@')[0] || `User ${userId.substring(0, 8)}`;
    const initials = displayName.charAt(0).toUpperCase();

    return {
      id: userId,
      email,
      displayName,
      initials
    };
  } catch (error) {
    return {
      id: userId,
      displayName: `User ${userId.substring(0, 8)}`,
      initials: "U"
    };
  }
}

export function getDisplayName(userId: string, email?: string): string {
  if (email) {
    return email.split('@')[0];
  }
  return `User ${userId.substring(0, 8)}`;
}

export function getInitials(displayName: string): string {
  const words = displayName.split(' ');
  if (words.length >= 2) {
    return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
  }
  return displayName.charAt(0).toUpperCase();
}

export function getUserColor(userId: string): string {
  const colors = [
    'from-teal-400 to-blue-500',
    'from-purple-400 to-pink-500',
    'from-green-400 to-blue-500',
    'from-yellow-400 to-orange-500',
    'from-red-400 to-pink-500',
    'from-indigo-400 to-purple-500',
    'from-blue-400 to-cyan-500',
    'from-pink-400 to-rose-500'
  ];
  
  const hash = userId.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);
  
  return colors[Math.abs(hash) % colors.length];
}