/** Login Google aktif hanya jika kredensial OAuth sudah diisi di env. */
export function isGoogleLoginEnabled(): boolean {
  return !!process.env.AUTH_GOOGLE_ID && !!process.env.AUTH_GOOGLE_SECRET;
}
