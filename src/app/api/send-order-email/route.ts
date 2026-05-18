import { NextResponse } from "next/server";

type SendOrderEmailPayload = {
  email?: string | null;
  name?: string | null;
  orderId: string;
  orderNumber?: string | null;
  origin?: string | null;
};

const DEFAULT_ADMIN_BCC = [
  "uzziel.sanjuan@gmail.com",
  "jeandeferaudy@gmail.com",
  "adriel.sanjuan1@gmail.com",
];

function formatSender(name: string, address: string): string {
  const trimmedName = name.trim();
  const trimmedAddress = address.trim();
  if (!trimmedName) return trimmedAddress;
  return `${trimmedName} <${trimmedAddress}>`;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as SendOrderEmailPayload;
    const email = String(body.email ?? "").trim();
    const orderId = String(body.orderId ?? "").trim();
    if (!orderId) {
      return NextResponse.json({ ok: false, error: "Missing order id." }, { status: 400 });
    }

    const fromName = process.env.ORDER_EMAIL_FROM_NAME || "The Steak Kitchen Orders";
    const fromAddress = process.env.ORDER_EMAIL_FROM_ADDRESS || "noreply@thesteakkitchenph.com";
    const replyTo = process.env.ORDER_EMAIL_REPLY_TO || fromAddress;
    const supportPhone = String(process.env.ORDER_EMAIL_PHONE ?? "").trim();
    const from = formatSender(fromName, fromAddress);
    const adminBccEnv = String(process.env.ADMIN_BCC_EMAILS ?? "")
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
    const adminBcc = adminBccEnv.length ? adminBccEnv : DEFAULT_ADMIN_BCC;
    const recipients = email ? [email] : adminBcc;
    const bccRecipients = email ? adminBcc : [];
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          ok: true,
          skipped: true,
          reason: "Missing RESEND_API_KEY.",
          debug: {
            from,
            replyTo,
            recipientMode: email ? "customer+bcc" : "admin-only",
            toCount: recipients.length,
            bccCount: bccRecipients.length,
            orderId,
            supportPhone: supportPhone || null,
          },
        },
        { status: 200 }
      );
    }

    const origin =
      String(body.origin ?? "").trim() || "https://www.thesteakkitchenph.com";
    const orderNumber = String(body.orderNumber ?? "").trim();
    const orderLabel = orderNumber ? `Order ${orderNumber}` : "Your order";
    const orderUrl = `${origin.replace(/\/$/, "")}/order?id=${encodeURIComponent(orderId)}`;
    const displayName = String(body.name ?? "").trim() || "there";
    const debug = {
      from,
      replyTo,
      recipientMode: email ? "customer+bcc" : "admin-only",
      to: recipients,
      bcc: bccRecipients,
      orderId,
      orderNumber: orderNumber || null,
      orderUrl,
      origin,
      supportPhone: supportPhone || null,
    };

    const html = `
      <div style="font-family: Arial, sans-serif; color: #111;">
        <p>Hi ${displayName},</p>
        <p>Your order has been placed successfully.</p>
        <p><strong>${orderLabel}</strong></p>
        <p>You can view your order summary anytime using this link:</p>
        <p><a href="${orderUrl}">${orderUrl}</a></p>
        <p>If you have any questions, reply to this email and our team will help you.</p>
        ${supportPhone ? `<p>Phone: ${supportPhone}</p>` : ""}
        <p>Team TheSteakKitchen</p>
      </div>
    `;

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        reply_to: replyTo,
        to: recipients,
        ...(bccRecipients.length ? { bcc: bccRecipients } : null),
        subject: `${orderLabel} has been placed`,
        html,
      }),
    });

    if (!resendResponse.ok) {
      const errText = await resendResponse.text();
      return NextResponse.json(
        {
          ok: false,
          error: "Resend request failed.",
          details: errText,
          resendStatus: resendResponse.status,
          debug,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true, debug });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Unknown error.",
      },
      { status: 500 }
    );
  }
}
