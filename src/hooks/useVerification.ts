import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useProfile } from '@/hooks/useAuth';

/**
 * One answer to "is this account's email verified?", taken from the server's
 * user record (the single source of truth) with the login-time copy in the
 * auth store as the instant first paint. When the two disagree, the server
 * wins and the store is brought in line, so a verification done on another
 * device clears the badge here on the next profile fetch or window focus.
 */
export const useVerification = () => {
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const { data: profile } = useProfile();

  const serverSays = profile?.email_verified;
  useEffect(() => {
    if (serverSays !== undefined && user && serverSays !== user.email_verified) {
      updateUser({ email_verified: serverSays });
    }
  }, [serverSays, user, updateUser]);

  return {
    verified: (serverSays ?? user?.email_verified) !== false,
    email: user?.email,
  };
};
