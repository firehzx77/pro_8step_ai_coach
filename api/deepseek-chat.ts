// api/deepseek-chat.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";

const DEEPSEEK_BASE_URL = "https://api.deepseek.com/chat/completions";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return res
      .status(500)
      .json({ error: "DEEPSEEK_API_KEY is not set in environment variables" });
  }

  try {
    const { model, messages, temperature } = req.body || {};
    if (!model || !messages) {
      return res
        .status(400)
        .json({ error: "Missing model or messages in request body" });
    }

    const dsBody = {
      model,
      messages,
      temperature: typeof temperature === "number" ? temperature : 0.2,
    };

    const dsRes = await fetch(DEEPSEEK_BASE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(dsBody),
    });

    const dsJson = await dsRes.json();
    if (!dsRes.ok) {
      console.error("DeepSeek API error:", dsRes.status, dsJson);
      return res
        .status(dsRes.status)
        .json({ error: "DeepSeek API error", detail: dsJson });
    }

    // 透明转发给前端
    return res.status(200).json(dsJson);
  } catch (err: any) {
    console.error("Proxy error:", err);
    return res.status(500).json({ error: "Proxy error", detail: err?.message });
  }
}
