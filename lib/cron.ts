import { getMarketplaceCronSecrets } from "./env.ts";

export function isAuthorizedCronRequest(request: Request) {
  const authorization = request.headers.get("authorization")?.trim();

  if (!authorization) {
    return false;
  }

  return getMarketplaceCronSecrets().some(
    (secret) => authorization === `Bearer ${secret}`,
  );
}
