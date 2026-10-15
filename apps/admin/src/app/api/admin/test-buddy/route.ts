import { NextResponse } from "next/server";
import { sendMessage, getBuddySystemPrompt, type Message } from "@/lib/ai";
import type { Buddy } from "@/lib/buddies";

export async function POST(req: Request) {
  try {
    const { id, name, tag, philosophy, ai_model, is_fan_sim, fan_disclaimer, testPrompt } = await req.json();

    if (!testPrompt || !testPrompt.trim()) {
      return NextResponse.json({ error: "Test prompt is required" }, { status: 400 });
    }

    const targetBuddyId = id || "contrarian";

    const messages: Message[] = [
      { role: "user", content: testPrompt.trim() },
    ];

    // Call sendMessage with requested model override
    const stream = await sendMessage({
      buddyId: targetBuddyId,
      messages,
      databankContext: { currency: "NGN" },
      model: (ai_model || "claude") as any,
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
