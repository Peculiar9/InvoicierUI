import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { authApi } from '@/api/auth';
import { businessProfileApi } from '@/api/businessProfile';
import { businessProfileKey, hasOnboarded } from '@/hooks/useBusinessProfile';
import { useAuthStore } from '@/stores/authStore';
import type { AuthSession } from '@/api/auth';
import type { LoginCredentials, SignupCredentials, User } from '@/types';
import type { QueryClient } from '@tanstack/react-query';

type SetSession = (user: User, token: string, refreshToken: string) => void;

/** Where the verify-email page finds its handle after signup. */
export const PENDING_VERIFICATION_KEY = 'invoicier-pending-verification';

/**
 * The shared tail of every sign-in, whichever lock they opened: seat the
 * session, then read from the server where this account lands. Both the
 * password and the OTP path run this identical errand so the sign-in loader
 * plays over real work, not a made-up delay.
 */
const seatSessionAndResolveLanding = async (
  data: AuthSession,
  setSession: SetSession,
  queryClient: QueryClient
) => {
  setSession(data.user, data.accessToken, data.refreshToken);
  queryClient.invalidateQueries({ queryKey: ['user'] });

  // Where they land is a fact about their account, not this browser, so we
  // read it from the server. fetchQuery seeds the cache too, so the page
  // that follows does not ask again.
  let onboarded = false;
  try {
    const profile = await queryClient.fetchQuery({
      queryKey: businessProfileKey,
      queryFn: businessProfileApi.get,
    });
    onboarded = hasOnboarded(profile);
  } catch {
    // no profile, or we could not reach it: onboarding is the safe,
    // idempotent landing
  }
  return { user: data.user, target: onboarded ? '/dashboard' : '/welcome' } as const;
};

export const useLogin = () => {
  const { setSession } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    // The whole post-login errand lives here, so the sign-in loader can play
    // over the real work rather than a made-up delay: authenticate, seat the
    // session, then fetch the profile that decides where they land.
    mutationFn: async (credentials: LoginCredentials) => {
      const data = await authApi.login(credentials);
      return seatSessionAndResolveLanding(data, setSession, queryClient);
    },
    meta: { doing: 'Signing you in' },
  });
};

/** Asks the backend which sign-in methods an email holds. Pure lookup. */
export const useLoginMethods = () => {
  return useMutation({
    mutationFn: (email: string) => authApi.loginMethods(email),
  });
};

/** Requests a one-time code; hands back the reference verify will need. */
export const useRequestLoginOtp = () => {
  return useMutation({
    mutationFn: (email: string) => authApi.requestLoginOtp(email),
  });
};

/**
 * The code-based twin of useLogin: same post-auth errand, different lock.
 * Trades an emailed code for a session, then lands them by account state.
 */
export const useVerifyLoginOtp = () => {
  const { setSession } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { email: string; code: string; reference: string }) => {
      const data = await authApi.verifyLoginOtp(input);
      return seatSessionAndResolveLanding(data, setSession, queryClient);
    },
    meta: { doing: 'Signing you in' },
  });
};

export const useSignup = () => {
  const { setSession } = useAuthStore();

  return useMutation({
    mutationFn: (credentials: SignupCredentials) => authApi.signup(credentials),
    meta: { doing: 'Creating your account' },
    onSuccess: (data) => {
      setSession(data.user, data.accessToken, data.refreshToken);
      // the verify-email page needs the reference the backend just minted;
      // sessionStorage survives the redirect without polluting the store
      if (data.verification) {
        try {
          sessionStorage.setItem(
            PENDING_VERIFICATION_KEY,
            JSON.stringify({
              email: data.verification.email,
              reference: data.verification.reference,
            })
          );
        } catch {
          // private mode: the page falls back to asking for a resend
        }
      }
      // Onboarding IS the signup now, so the caller is already standing in
      // the right room. It decides what happens next, not this hook.
    },
  });
};

export const useLogout = () => {
  const { logout } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => authApi.logout(),
    onSuccess: () => {
      logout();
      queryClient.clear();
      navigate({ to: '/login' });
    },
    onError: () => {
      logout();
      queryClient.clear();
      navigate({ to: '/login' });
    },
  });
};

export const useProfile = () => {
  const { isAuthenticated } = useAuthStore();

  return useQuery({
    queryKey: ['user', 'profile'],
    queryFn: () => authApi.getProfile(),
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });
};

export const useUpdateProfile = () => {
  const { updateUser } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: authApi.updateProfile,
    onSuccess: (data) => {
      updateUser(data);
      queryClient.invalidateQueries({ queryKey: ['user', 'profile'] });
    },
  });
};

export const useForgotPassword = () => {
  return useMutation({
    mutationFn: (email: string) => authApi.forgotPassword(email),
  });
};

export const useResetPassword = () => {
  const navigate = useNavigate();

  return useMutation({
    mutationFn: ({ token, password }: { token: string; password: string }) =>
      authApi.resetPassword(token, password),
    onSuccess: () => {
      navigate({ to: '/login' });
    },
  });
};

/**
 * "Stay signed in" — re-establish the session from the still-valid access
 * token when the refresh token is spent. Seats the fresh tokens and user.
 */
export const useExtendSession = () => {
  const setSession = useAuthStore((s) => s.setSession);

  return useMutation({
    mutationFn: () => authApi.extendSession(),
    onSuccess: (data) => {
      setSession(data.user, data.accessToken, data.refreshToken);
    },
  });
};

/**
 * Set or change the signed-in user's password. On success we flip the local
 * `has_password` so Settings switches from "set" to "change" without a refetch,
 * and the sign-in screen will offer the password option next time.
 */
export const useChangePassword = () => {
  const updateUser = useAuthStore((s) => s.updateUser);

  return useMutation({
    mutationFn: (input: {
      currentPassword?: string;
      newPassword: string;
      confirmPassword: string;
    }) => authApi.changePassword(input),
    onSuccess: () => {
      updateUser({ has_password: true });
    },
  });
};
