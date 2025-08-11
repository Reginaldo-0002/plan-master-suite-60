/**
 * Security utilities for input validation and sanitization
 */

/**
 * Sanitizes HTML content by removing dangerous elements and attributes
 * @param content The HTML content to sanitize
 * @returns Sanitized content safe for display
 */
export const sanitizeHtml = (content: string): string => {
  // Create a temporary div to parse the HTML
  const tempDiv = document.createElement('div');
  tempDiv.textContent = content; // This automatically escapes HTML
  return tempDiv.innerHTML;
};

/**
 * Validates email format
 * @param email Email address to validate
 * @returns True if email is valid
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validates password strength
 * @param password Password to validate
 * @returns Object with validation result and message
 */
export const validatePassword = (password: string): { isValid: boolean; message: string } => {
  if (password.length < 8) {
    return { isValid: false, message: "A senha deve ter pelo menos 8 caracteres" };
  }
  
  if (!/(?=.*[a-z])/.test(password)) {
    return { isValid: false, message: "A senha deve conter pelo menos uma letra minúscula" };
  }
  
  if (!/(?=.*[A-Z])/.test(password)) {
    return { isValid: false, message: "A senha deve conter pelo menos uma letra maiúscula" };
  }
  
  if (!/(?=.*\d)/.test(password)) {
    return { isValid: false, message: "A senha deve conter pelo menos um número" };
  }
  
  return { isValid: true, message: "Senha válida" };
};

/**
 * Sanitizes user input to prevent XSS attacks
 * @param input User input to sanitize
 * @returns Sanitized input
 */
export const sanitizeInput = (input: string): string => {
  return input
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
};

/**
 * Rate limiting for API calls
 */
export class RateLimiter {
  private calls: number[] = [];
  private readonly limit: number;
  private readonly windowMs: number;

  constructor(limit: number, windowMs: number) {
    this.limit = limit;
    this.windowMs = windowMs;
  }

  canMakeRequest(): boolean {
    const now = Date.now();
    // Remove calls outside the window
    this.calls = this.calls.filter(time => now - time < this.windowMs);
    
    if (this.calls.length >= this.limit) {
      return false;
    }
    
    this.calls.push(now);
    return true;
  }
}

// Global rate limiters
export const adminActionLimiter = new RateLimiter(10, 60000); // 10 actions per minute
export const userCreationLimiter = new RateLimiter(5, 300000); // 5 user creations per 5 minutes