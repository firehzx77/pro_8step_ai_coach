import type { VercelRequest, VercelResponse } from "@vercel/node";

const DEEPSEEK_ENDPOINT = "https://api.deepseek.com/chat/completions";

function setCors(res: VercelResponse) {
  // 如果你只在同域调用（index.html + /api），其实不加也可以
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res);

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed. Use POST." });
  }

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: "Missing DEEPSEEK_API_KEY in Vercel Environment Variables."
    });
  }

  try {
    // Vercel 通常会自动解析 JSON body（Content-Type: application/json）
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;

    // 允许前端按 OpenAI 风格传：{ model, messages, temperature, stream... }
    const upstreamBody = {
      model: body?.model ?? "deepseek-chat",
      messages: body?.messages ?? [],
      temperature: body?.temperature ?? 0.2,
      stream: body?.stream ?? false
    };

    const upstream = await fetch(DEEPSEEK_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify(upstreamBody)
    });

    const text = await upstream.text();

    // 尽量把上游 JSON 原样转发给前端；如果不是 JSON，就按字符串返回
    try {
      const json = JSON.parse(text);
      return res.status(upstream.status).json(json);
    } catch {
      return res.status(upstream.status).send(text);
    }
  } catch (err: any) {
    return res.status(500).json({
      error: "Proxy Error",
      message: err?.message ?? String(err)
    });
  }
}
