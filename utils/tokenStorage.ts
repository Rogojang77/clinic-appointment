/**
 * Token storage utilities for client-side token management
 * Uses localStorage for token persistence
 */

const TOKEN_KEY = 'auth_token';

/**
 * Get the authentication token from localStorage
 * @returns The token string or null if not found
 */
export function getToken(): string | null {
  if (typeof window === 'undefined') {
    return null; // Server-side rendering
  }
  
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch (error) {
    console.error('Error reading token from localStorage:', error);
    return null;
  }
}

/**
 * Save the authentication token to localStorage
 * @param token - The JWT token to save
 */
export function setToken(token: string): void {
  if (typeof window === 'undefined') {
    return; // Server-side rendering
  }
  
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch (error) {
    console.error('Error saving token to localStorage:', error);
  }
}

/**
 * Remove the authentication token from localStorage
 */
export function removeToken(): void {
  if (typeof window === 'undefined') {
    return; // Server-side rendering
  }
  
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch (error) {
    console.error('Error removing token from localStorage:', error);
  }
}


