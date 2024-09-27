/** Email regex based on the HTML Spec, as mentioned by MDN */
export const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;

/** Password regex requiring a minimum of 8 characters, with at least 1 number AND at least 1 letter */
export const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;

/** The regex representing a valid phone number (minimal, assumes US-only) */
export const phoneRegex = /^1\d{10}$/;

export function validatePassword(password: string): boolean {
  return passwordRegex.test(password);
}

export function validateEmail(email: string): boolean {
  return emailRegex.test(email);
}

export function validatePhone(phone: string): boolean {
  return phoneRegex.test(phone);
}
