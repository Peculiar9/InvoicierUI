import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { authApi } from '@/api/auth';
import { useAuthStore } from '@/stores/authStore';
import type { LoginCredentials, SignupCredentials } from '@/types';

export const useLogin = () => {
  const { setUser } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (credentials: LoginCredentials) => authApi.login(credentials),
    onSuccess: (data) => {
      setUser(data.user, data.token);
      queryClient.invalidateQueries({ queryKey: ['user'] });
      navigate({ to: '/dashboard' });
    },
  });
};

export const useSignup = () => {
  const { setUser } = useAuthStore();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (credentials: SignupCredentials) => authApi.signup(credentials),
    onSuccess: (data) => {
      setUser(data.user, data.token);
      navigate({ to: '/dashboard' });
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
