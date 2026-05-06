import { NextRequest, NextResponse } from "next/server"

const upstreamBase = process.env.CONSOLE_API_BASE_URL ?? "http://127.0.0.1:4000"

function buildUpstreamHeaders(request: NextRequest) {
  const headers = new Headers()
  headers.set("Remote-User", request.headers.get("x-console-subject") ?? process.env.CONSOLE_PROXY_SUBJECT ?? "admin")
  headers.set("Remote-Email", request.headers.get("x-console-email") ?? process.env.CONSOLE_PROXY_EMAIL ?? "admin@example.com")
  headers.set("Remote-Groups", request.headers.get("x-console-groups") ?? process.env.CONSOLE_PROXY_GROUPS ?? "admin")

  const contentType = request.headers.get("content-type")
  if (contentType) {
    headers.set("content-type", contentType)
  }

  return headers
}

async function handler(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params
  const search = request.nextUrl.search
  const upstreamUrl = `${upstreamBase}/api/console/${path.join("/")}${search}`
  const body = request.method === "GET" || request.method === "HEAD" ? undefined : await request.text()

  const response = await fetch(upstreamUrl, {
    method: request.method,
    headers: buildUpstreamHeaders(request),
    body,
    cache: "no-store",
  })

  return new NextResponse(response.body, {
    status: response.status,
    headers: {
      "content-type": response.headers.get("content-type") ?? "application/json",
    },
  })
}

export { handler as GET, handler as POST, handler as PUT, handler as PATCH, handler as DELETE }
