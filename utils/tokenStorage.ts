/**
 * Token storage utilities for client-side access token management
 * Access tokens are stored in localStorage
 * Refresh tokens are stored in HttpOnly cookies (handled by server)
 */

const ACCESS_TOKEN_KEY = 'auth_token';

/**
 * Get the access token from localStorage
 * @returns The access token string or null if not found
 */
export function getToken(): string | null {
  if (typeof window === 'undefined') {
    return null; // Server-side rendering
  }
  
  try {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  } catch (error) {
    console.error('Error reading access token from localStorage:', error);
    return null;
  }
}

/**
 * Save the access token to localStorage
 * @param token - The access JWT token to save
 */
export function setToken(token: string): void {
  if (typeof window === 'undefined') {
    return; // Server-side rendering
  }
  
  try {
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
  } catch (error) {
    console.error('Error saving access token to localStorage:', error);
  }
}

/**
 * Remove the access token from localStorage
 */
export function removeToken(): void {
  if (typeof window === 'undefined') {
    return; // Server-side rendering
  }
  
  try {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
  } catch (error) {
    console.error('Error removing access token from localStorage:', error);
  }
}


