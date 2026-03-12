import { describe, it, expect, vi, beforeEach } from 'vitest';

// Use vi.hoisted so mock fns are available when vi.mock factory runs (hoisted to top)
const {
  mockSignInWithOAuth,
  mockSignInWithPassword,
  mockSignUp,
  mockVerifyOtp,
  mockResetPasswordForEmail,
  mockUpdateUser,
  mockSignOut,
} = vi.hoisted(() => ({
  mockSignInWithOAuth: vi.fn(),
  mockSignInWithPassword: vi.fn(),
  mockSignUp: vi.fn(),
  mockVerifyOtp: vi.fn(),
  mockResetPasswordForEmail: vi.fn(),
  mockUpdateUser: vi.fn(),
  mockSignOut: vi.fn(),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    auth: {
      signInWithOAuth: mockSignInWithOAuth,
      signInWithPassword: mockSignInWithPassword,
      signUp: mockSignUp,
      verifyOtp: mockVerifyOtp,
      resetPasswordForEmail: mockResetPasswordForEmail,
      updateUser: mockUpdateUser,
      signOut: mockSignOut,
    },
  }),
}));

// Import after mock setup
import {
  signInWithGoogle,
  signInWithEmail,
  signUpWithEmail,
  verifyEmailOtp,
  resetPassword,
  verifyRecoveryOtp,
  updatePassword,
  signOut,
} from '../auth';

describe('auth helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('signInWithGoogle', () => {
    it('calls supabase.auth.signInWithOAuth with provider google and correct redirectTo', async () => {
      mockSignInWithOAuth.mockResolvedValue({ data: { url: 'https://google.com' }, error: null });

      await signInWithGoogle();

      expect(mockSignInWithOAuth).toHaveBeenCalledWith({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
    });

    it('throws on error', async () => {
      const error = new Error('OAuth failed');
      mockSignInWithOAuth.mockResolvedValue({ data: null, error });

      await expect(signInWithGoogle()).rejects.toThrow('OAuth failed');
    });
  });

  describe('signInWithEmail', () => {
    it('calls supabase.auth.signInWithPassword with email and password', async () => {
      mockSignInWithPassword.mockResolvedValue({
        data: { user: { id: '1' }, session: {} },
        error: null,
      });

      await signInWithEmail('test@example.com', 'password123');

      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });

    it('throws on error', async () => {
      const error = new Error('Invalid credentials');
      mockSignInWithPassword.mockResolvedValue({ data: null, error });

      await expect(signInWithEmail('test@example.com', 'wrong')).rejects.toThrow('Invalid credentials');
    });
  });

  describe('signUpWithEmail', () => {
    it('calls supabase.auth.signUp with email and password', async () => {
      mockSignUp.mockResolvedValue({
        data: { user: { id: '1', identities: [{ id: '1' }] }, session: null },
        error: null,
      });

      await signUpWithEmail('new@example.com', 'password123');

      expect(mockSignUp).toHaveBeenCalledWith({
        email: 'new@example.com',
        password: 'password123',
      });
    });

    it('detects fake success when identities array is empty (email enumeration protection)', async () => {
      mockSignUp.mockResolvedValue({
        data: { user: { id: '1', identities: [] }, session: null },
        error: null,
      });

      await expect(signUpWithEmail('existing@example.com', 'password123')).rejects.toThrow('email_exists');
    });

    it('throws on error', async () => {
      const error = new Error('Signup failed');
      mockSignUp.mockResolvedValue({ data: null, error });

      await expect(signUpWithEmail('test@example.com', 'pass')).rejects.toThrow('Signup failed');
    });
  });

  describe('verifyEmailOtp', () => {
    it('calls supabase.auth.verifyOtp with type email', async () => {
      mockVerifyOtp.mockResolvedValue({
        data: { user: { id: '1' }, session: {} },
        error: null,
      });

      await verifyEmailOtp('test@example.com', '123456');

      expect(mockVerifyOtp).toHaveBeenCalledWith({
        email: 'test@example.com',
        token: '123456',
        type: 'email',
      });
    });

    it('throws on error', async () => {
      const error = new Error('Invalid OTP');
      mockVerifyOtp.mockResolvedValue({ data: null, error });

      await expect(verifyEmailOtp('test@example.com', '000000')).rejects.toThrow('Invalid OTP');
    });
  });

  describe('resetPassword', () => {
    it('calls supabase.auth.resetPasswordForEmail', async () => {
      mockResetPasswordForEmail.mockResolvedValue({ data: {}, error: null });

      await resetPassword('test@example.com');

      expect(mockResetPasswordForEmail).toHaveBeenCalledWith('test@example.com');
    });

    it('throws on error', async () => {
      const error = new Error('Reset failed');
      mockResetPasswordForEmail.mockResolvedValue({ data: null, error });

      await expect(resetPassword('test@example.com')).rejects.toThrow('Reset failed');
    });
  });

  describe('verifyRecoveryOtp', () => {
    it('calls supabase.auth.verifyOtp with type recovery', async () => {
      mockVerifyOtp.mockResolvedValue({
        data: { user: { id: '1' }, session: {} },
        error: null,
      });

      await verifyRecoveryOtp('test@example.com', '654321');

      expect(mockVerifyOtp).toHaveBeenCalledWith({
        email: 'test@example.com',
        token: '654321',
        type: 'recovery',
      });
    });
  });

  describe('updatePassword', () => {
    it('calls supabase.auth.updateUser with new password', async () => {
      mockUpdateUser.mockResolvedValue({
        data: { user: { id: '1' } },
        error: null,
      });

      await updatePassword('newPassword456');

      expect(mockUpdateUser).toHaveBeenCalledWith({ password: 'newPassword456' });
    });

    it('throws on error', async () => {
      const error = new Error('Update failed');
      mockUpdateUser.mockResolvedValue({ data: null, error });

      await expect(updatePassword('weak')).rejects.toThrow('Update failed');
    });
  });

  describe('signOut', () => {
    it('calls supabase.auth.signOut', async () => {
      mockSignOut.mockResolvedValue({ error: null });

      await signOut();

      expect(mockSignOut).toHaveBeenCalled();
    });

    it('throws on error', async () => {
      const error = new Error('SignOut failed');
      mockSignOut.mockResolvedValue({ error });

      await expect(signOut()).rejects.toThrow('SignOut failed');
    });
  });
});
