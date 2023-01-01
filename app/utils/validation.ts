/** Email regex based on the HTML Spec, as mentioned by MDN */
export const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;

/** Password regex requiring a minimum of 8 characters, with at least 1 number AND at least 1 letter */
export const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;

export function validatePassword(password: string): boolean {
  return passwordRegex.test(password);
}

export function validateEmail(email: string): boolean {
  return emailRegex.test(email);
}
