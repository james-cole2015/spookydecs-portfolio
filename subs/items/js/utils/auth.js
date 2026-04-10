export function canMutate() {
  const claims = window.SpookyAuth?.getTokenClaims?.();
  return claims?.['custom:role'] !== 'readonly';
}

export function canAdminAction() {
  const claims = window.SpookyAuth?.getTokenClaims?.();
  return claims?.['custom:role'] === 'admin';
}
