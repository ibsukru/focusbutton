import { headers } from "next/headers"

export async function getUserAgentInfo() {
  const headersList = await headers()
  const userAgent = headersList.get("user-agent") || ""

  const isDesktop = !userAgent.match(
    /(Android|webOS|iPhone|iPad|iPod|BlackBerry|Windows Phone)/i,
  )
  const isChrome = userAgent.indexOf("Chrome") > -1
  const isFirefox = userAgent.indexOf("Firefox") > -1
  const isMacOs = userAgent.indexOf("Mac") > -1

  return {
    isDesktop,
    isChrome,
    isFirefox,
    isMacOs,
  }
}
