import { NextResponse } from "next/server";

const WEB_APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://127.0.0.1:3000";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const targetUrl = new URL("/api/contact", WEB_APP_URL);
    searchParams.forEach((v, k) => targetUrl.searchParams.set(k, v));

    const res = await fetch(targetUrl.toString(), {
      headers: {
        cookie: req.headers.get("cookie") || "",
      },
      cache: "no-store",
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err: any) {
    console.error("[GET /api/contact proxy]", err);
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const res = await fetch(`${WEB_APP_URL}/api/contact`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        cookie: req.headers.get("cookie") || "",
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err: any) {
    console.error("[POST /api/contact proxy]", err);
    return NextResponse.json({ error: "Failed to forward contact request" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const res = await fetch(`${WEB_APP_URL}/api/contact`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        cookie: req.headers.get("cookie") || "",
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err: any) {
    console.error("[PATCH /api/contact proxy]", err);
    return NextResponse.json({ error: "Failed to update ticket" }, { status: 500 });
  }
}
