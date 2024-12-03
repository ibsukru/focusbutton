import { headers } from "next/headers";

export async function getUserAgentInfo() {
  const headersList = await headers();
  const userAgent = headersList.get("user-agent") || "";

  const isDesktop = !/Mobile|Android|iPhone|iPad|iPod/i.test(userAgent);
  const isChrome =
    /Chrome/i.test(userAgent) && !/Edge|Edg|OPR/i.test(userAgent);
  const isFirefox = /Firefox/i.test(userAgent) && !/Seamonkey/i.test(userAgent);

  return {
    isDesktop,
    isChrome,
    isFirefox,
  };
}
