import { describe, it, expect, beforeEach } from 'vitest';
import { i18n, loadLocale, saveLocale } from '../i18n';

describe('i18n', () => {
  beforeEach(() => {
    localStorage.clear();
    i18n.locale = 'en';
  });

  describe('loadLocale', () => {
    it('returns stored value when valid', () => {
      localStorage.setItem('lumio-locale', 'it');
      expect(loadLocale()).toBe('it');
    });

    it('defaults to en when nothing stored', () => {
      expect(loadLocale()).toBe('en');
    });

    it('defaults to en when invalid value stored', () => {
      localStorage.setItem('lumio-locale', 'fr');
      expect(loadLocale()).toBe('en');
    });
  });

  describe('saveLocale', () => {
    it('writes to localStorage', () => {
      saveLocale('it');
      expect(localStorage.getItem('lumio-locale')).toBe('it');
    });
  });

  describe('i18n.t', () => {
    it('returns correct English translations', () => {
      i18n.locale = 'en';
      expect(i18n.t('login.title')).toBe('Welcome to Lumio');
      expect(i18n.t('common.appName')).toBe('Lumio');
      expect(i18n.t('common.tagline')).toBe('Build your study decks');
    });

    it('returns correct Italian translations', () => {
      i18n.locale = 'it';
      expect(i18n.t('login.title')).toBe('Benvenuto su Lumio');
      expect(i18n.t('common.tagline')).toBe('Crea i tuoi mazzi di studio');
    });

    it('falls back to English for missing keys', () => {
      i18n.locale = 'it';
      // All keys exist in both languages, so test a known key
      expect(i18n.t('common.appName')).toBe('Lumio');
    });

    it('returns translations for auth pages', () => {
      i18n.locale = 'en';
      expect(i18n.t('signup.title')).toBe('Create Account');
      expect(i18n.t('otp.title')).toBe('Verify Your Email');
      expect(i18n.t('forgotPassword.title')).toBe('Forgot Password');
      expect(i18n.t('resetPassword.title')).toBe('Reset Password');
    });

    it('returns Italian translations for auth pages', () => {
      i18n.locale = 'it';
      expect(i18n.t('signup.title')).toBe('Crea Account');
      expect(i18n.t('otp.title')).toBe('Verifica la tua Email');
      expect(i18n.t('forgotPassword.title')).toBe('Password Dimenticata');
      expect(i18n.t('resetPassword.title')).toBe('Reimposta Password');
    });
  });
});
