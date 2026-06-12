import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from './authStore';

describe('authStore', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      token: null,
      isAuthenticated: false,
    });
  });

  it('should start with initial state', () => {
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.token).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });

  it('should set user and token on login', () => {
    const mockUser = {
      id: '1',
      email: 'test@example.com',
      username: 'testuser',
      createdAt: '2024-01-01',
    };
    const mockToken = 'mock-jwt-token';

    useAuthStore.getState().setUser(mockUser, mockToken);

    const state = useAuthStore.getState();
    expect(state.user).toEqual(mockUser);
    expect(state.token).toBe(mockToken);
    expect(state.isAuthenticated).toBe(true);
  });

  it('should clear state on logout', () => {
    const mockUser = {
      id: '1',
      email: 'test@example.com',
      username: 'testuser',
      createdAt: '2024-01-01',
    };

    useAuthStore.getState().setUser(mockUser, 'token');
    useAuthStore.getState().logout();

    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.token).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });

  it('should update user data', () => {
    const mockUser = {
      id: '1',
      email: 'test@example.com',
      username: 'testuser',
      createdAt: '2024-01-01',
    };

    useAuthStore.getState().setUser(mockUser, 'token');
    useAuthStore.getState().updateUser({ username: 'newusername' });

    const state = useAuthStore.getState();
    expect(state.user?.username).toBe('newusername');
    expect(state.user?.email).toBe('test@example.com');
  });

  it('should not update if user is null', () => {
    useAuthStore.getState().updateUser({ username: 'newusername' });

    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
  });
});
