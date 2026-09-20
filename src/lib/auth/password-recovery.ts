export const PASSWORD_RECOVERY_COOKIE =
  "rice-ai-password-recovery";

export const PASSWORD_RECOVERY_COOKIE_MAX_AGE =
  10 * 60;

export function isPasswordRecoveryPath(
  path: string
): boolean {
  return path === "/reset-password";
}
