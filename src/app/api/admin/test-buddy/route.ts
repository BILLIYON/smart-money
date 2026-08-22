import { NextResponse } from "next/server";
import { sendMessage, type Message } from "@/lib/ai";
import type { Buddy } from "@/lib/buddies";

export async function POST(req: Request) {
  try {
    const { name, tag, philosophy, ai_model, is_fan_sim, fan_disclaimer, testPrompt } = await req.json();

    if (!testPrompt || !testPrompt.trim()) {
      return NextResponse.json({ error: "Test prompt is required" }, { status: 400 });
    }

    // Construct transient Buddy representation for testing
    const tempBuddy: Buddy = {
      id: "temp-test-buddy",
      name: name || "Test AI Buddy",
      tag: tag || "Financial Advisor",
      desc: "Testing buddy responses in real-time.",
      price: "Free",
      priceNote: "Testing mode",
      badge: "Free",
      badgeType: "free",
      bannerColor: "linear-gradient(135deg,#0B1E3D,#1A3A6E)",
      avatarBg: "#1A3A6E",
      avatarContent: "🧪",
      avatarIsSerif: false,
      model: (ai_model || "claude") as any,
      modelColor: "#7B68EE",
      rating: "5.0",
      reviewCount: "1",
      isFanSim: Boolean(is_fan_sim),
      disclaimer: fan_disclaimer || undefined,
      categories: ["Investing"],
      philosophy: philosophy || "Help the user make smart financial choices.",
      samples: [],
      reviews: [],
      includes: [],
    };

    const messages: Message[] = [
      { role: "user", content: testPrompt.trim() },
    ];

    // Call sendMessage with override or system prompt
    const stream = await sendMessage({
      buddyId: "contrarian", // fallback base ID
      messages,
      databankContext: { currency: "NGN" },
      modelOverride: ai_model as any,
    });

    // Read full stream into string for modal display
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let resultText = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        resultText += decoder.decode(value, { stream: true });
      }
    }
    resultText += decoder.decode();

    return NextResponse.json({
      success: true,
      modelUsed: ai_model || "claude",
      response: resultText.trim(),
    });
  } catch (err: any) {
    console.error("[/api/admin/test-buddy] Error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to generate AI test response." },
      { status: 500 }
    );
  }
}
