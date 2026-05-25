import { NextResponse } from "next/server";
import { AUTH_COOKIE, AUTH_COOKIE_MAX_AGE_SECONDS } from "@/lib/auth";

export async function POST(request: Request) {
  const expected = process.env.PAGE_PASSWORD;
  if (!expected) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "PAGE_PASSWORD ist nicht gesetzt. Bitte in den Environment-Variablen hinterlegen.",
      },
      { status: 500 },
    );
  }

  let password: unknown = "";
  try {
    const body = (await request.json()) as { password?: unknown };
    password = body.password;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Ungueltige Anfrage." },
      { status: 400 },
    );
  }

  if (typeof password !== "string" || password.length === 0) {
    return NextResponse.json(
      { ok: false, error: "Bitte gib das Passwort ein." },
      { status: 400 },
    );
  }

  if (password !== expected) {
    return NextResponse.json(
      { ok: false, error: "Passwort stimmt nicht." },
      { status: 401 },
    );
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: AUTH_COOKIE,
    value: "true",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: AUTH_COOKIE_MAX_AGE_SECONDS,
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: AUTH_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return response;
}
