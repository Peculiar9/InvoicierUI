import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { authApi } from '@/api/auth';
import { businessProfileApi } from '@/api/businessProfile';
import { businessProfileKey, hasOnboarded } from '@/hooks/useBusinessProfile';
import { useAuthStore } from '@/stores/authStore';
import type { LoginCredentials, SignupCredentials } from '@/types';

export const useLogin = () => {
  const { setUser } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (credentials: LoginCredentials) => authApi.login(credentials),
    meta: { doing: 'Signing you in' },
    onSuccess: async (data) => {
      setUser(data.user, data.token);
      queryClient.invalidateQueries({ queryKey: ['user'] });

      // Where they land is a fact about their account, not about this
      // browser. It used to be read from localStorage, so signing in on a new
      // device sent a long-standing customer back through onboarding.
      // fetchQuery seeds the cache too, so the page that follows does not
      // ask again.
      let onboarded = false;
      try {
        const profile = await queryClient.fetchQuery({
          queryKey: businessProfileKey,
          queryFn: businessProfileApi.get,
        });
        onboarded = hasOnboarded(profile);
      } catch {
        // no profile, or we could not reach it: onboarding is the safe
        // landing, and it is idempotent
      }
      navigate({ to: onboarded ? '/dashboard' : '/welcome' });
    },
  });
};

export const useSignup = () => {
  const { setUser } = useAuthStore();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (credentials: SignupCredentials) => authApi.signup(credentials),
    meta: { doing: 'Creating your account' },
    onSuccess: (data) => {
      setUser(data.user, data.token);
      // a new account has a profile but no details in it yet, so onboarding
      // is always next
      navigate({ to: '/welcome' });
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
