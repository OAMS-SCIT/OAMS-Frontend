import type { AuthUser } from '@/types';

/** Route that forces a signed-in user to replace their emailed temp password. */
export const FIRST_LOGIN_PATH = '/first-login';

/**
 * Where a signed-in user belongs. A user who has never changed their temporary
 * password is sent to the forced-change screen first; otherwise the role picks
 * the portal. Keep every post-authentication redirect going through this so the
 * two portals can never drift apart.
 */
export function landingPathFor(
  user: Pick<AuthUser, 'role' | 'isFirstLogin'>,
): string {
  if (user.isFirstLogin) return FIRST_LOGIN_PATH;
  return user.role === 'Admin' ? '/admin/dashboard' : '/employee/dashboard';
}
