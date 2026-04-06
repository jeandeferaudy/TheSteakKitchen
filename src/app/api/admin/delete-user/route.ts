import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type DeleteUserPayload = {
  profileId?: string | null;
};

function getBearerToken(req: Request): string {
  const auth = req.headers.get("authorization") || "";
  const match = auth.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || "";
}

export async function POST(req: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return NextResponse.json(
        { ok: false, error: "Missing Supabase server configuration." },
        { status: 500 }
      );
    }

    const token = getBearerToken(req);
    if (!token) {
      return NextResponse.json({ ok: false, error: "Missing auth token." }, { status: 401 });
    }

    const body = (await req.json()) as DeleteUserPayload;
    const profileId = String(body.profileId ?? "").trim();
    if (!profileId) {
      return NextResponse.json({ ok: false, error: "Missing profile id." }, { status: 400 });
    }

    const authClient = createClient(supabaseUrl, anonKey);
    const {
      data: { user: actingUser },
      error: authError,
    } = await authClient.auth.getUser(token);
    if (authError || !actingUser) {
      return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
    }
    if (actingUser.id === profileId) {
      return NextResponse.json(
        { ok: false, error: "You cannot delete your own user account." },
        { status: 400 }
      );
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    let role: string | null = null;
    const byId = await adminClient
      .from("profiles")
      .select("role")
      .eq("id", actingUser.id)
      .maybeSingle();
    if (!byId.error && byId.data?.role) role = String(byId.data.role);

    if (!role) {
      const byUserId = await adminClient
        .from("profiles")
        .select("role")
        .eq("user_id", actingUser.id)
        .maybeSingle();
      if (!byUserId.error && byUserId.data?.role) role = String(byUserId.data.role);
    }

    if (role !== "admin") {
      return NextResponse.json({ ok: false, error: "Admin access required." }, { status: 403 });
    }

    const deleteAuthUser = await adminClient.auth.admin.deleteUser(profileId);
    if (deleteAuthUser.error) {
      return NextResponse.json(
        { ok: false, error: deleteAuthUser.error.message || "Failed to delete auth user." },
        { status: 400 }
      );
    }

    await adminClient.from("profiles").delete().eq("id", profileId);

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Unknown error." },
      { status: 500 }
    );
  }
}

export async function GET() {
  const available = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
      process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  return NextResponse.json({ ok: true, available });
}
