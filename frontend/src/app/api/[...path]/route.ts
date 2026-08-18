import { NextRequest } from "next/server";

const BACKEND = process.env.BACKEND_URL || "http://127.0.0.1:8000";

export const dynamic = "force-dynamic";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "OPTIONS";

function buildHandler(method: HttpMethod) {
  return async (
    request: NextRequest,
    ctx: { params: Promise<{ path: string[] }> }
  ) => {
    const { path } = await ctx.params;
    const trailing = request.nextUrl.pathname.endsWith("/") ? "/" : "";
    const query = request.nextUrl.search;
    const url = `${BACKEND}/api/${path.join("/")}${trailing}${query}`;

    const headers = new Headers(request.headers);
    for (const name of [
      "host",
      "connection",
      "content-length",
      "accept-encoding",
      "transfer-encoding",
      "te",
      "expect",
    ]) {
      headers.delete(name);
    }

    const init: RequestInit = { method, headers };
    if (method === "POST" || method === "PUT" || method === "PATCH") {
      init.body = await request.arrayBuffer();
    }

    const upstream = await fetch(url, init);
    const body = await upstream.arrayBuffer();
    const responseHeaders = new Headers(upstream.headers);
    for (const name of [
      "content-encoding",
      "content-length",
      "transfer-encoding",
      "connection",
      "keep-alive",
    ]) {
      responseHeaders.delete(name);
    }

    const noBody =
      upstream.status === 204 || upstream.status === 205 || upstream.status === 304;

    return new Response(noBody ? null : body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  };
}

export const GET = buildHandler("GET");
export const POST = buildHandler("POST");
export const PUT = buildHandler("PUT");
export const PATCH = buildHandler("PATCH");
export const DELETE = buildHandler("DELETE");
export const OPTIONS = buildHandler("OPTIONS");
