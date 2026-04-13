import { NextResponse } from "next/server";

type CancelRequestPayload = {
  orderId: string;
  orderNumber?: string | null;
  customerName?: string | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
  deliveryDate?: string | null;
  deliveryStatus?: string | null;
  origin?: string | null;
};

const CANCEL_REQUEST_RECIPIENTS = [
  "Uzziel.sanjuan@gmail.com",
  "jeandeferaudy@gmail.com",
];

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as CancelRequestPayload;
    const orderId = String(body.orderId ?? "").trim();
    if (!orderId) {
      return NextResponse.json({ ok: false, error: "Missing order id." }, { status: 400 });
    }

    const from = process.env.RESEND_FROM || "onboarding@resend.dev";
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ ok: true, skipped: true, reason: "Missing RESEND_API_KEY." });
    }

    const orderNumber = String(body.orderNumber ?? "").trim() || orderId;
    const customerName = String(body.customerName ?? "").trim() || "Unknown customer";
    const customerEmail = String(body.customerEmail ?? "").trim() || "—";
    const customerPhone = String(body.customerPhone ?? "").trim() || "—";
    const deliveryDate = String(body.deliveryDate ?? "").trim() || "—";
    const deliveryStatus = String(body.deliveryStatus ?? "").trim() || "—";
    const origin = String(body.origin ?? "").trim() || "https://www.thesteakkitchenph.com";
    const orderUrl = `${origin.replace(/\/$/, "")}/order?id=${encodeURIComponent(orderId)}`;

    const html = `
      <div style="font-family: Arial, sans-serif; color: #111;">
        <p>A customer requested cancellation for an order.</p>
        <p><strong>Order #:</strong> ${orderNumber}</p>
        <p><strong>Customer:</strong> ${customerName}</p>
        <p><strong>Email:</strong> ${customerEmail}</p>
        <p><strong>Phone:</strong> ${customerPhone}</p>
        <p><strong>Delivery date:</strong> ${deliveryDate}</p>
        <p><strong>Delivery status:</strong> ${deliveryStatus}</p>
        <p><strong>Order link:</strong> <a href="${orderUrl}">${orderUrl}</a></p>
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
        to: CANCEL_REQUEST_RECIPIENTS,
        subject: `Cancellation request for order ${orderNumber}`,
        html,
      }),
    });

    if (!resendResponse.ok) {
      const errText = await resendResponse.text();
      return NextResponse.json(
        { ok: false, error: "Resend request failed.", details: errText },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Unknown error." },
      { status: 500 }
    );
  }
}
