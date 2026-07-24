import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rateLimit";

function escapeString(str: string): string {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export async function POST(req: Request) {
  try {
    // Extract client IP address for rate limiting
    const forwardedFor = req.headers.get("x-forwarded-for");
    const realIp = req.headers.get("x-real-ip");
    const clientIp = (forwardedFor ? forwardedFor.split(",")[0] : realIp) || "127.0.0.1";

    // Enforce 5 requests per minute rate limit per IP
    const rateLimit = checkRateLimit(clientIp, 5, 60000);
    if (!rateLimit.allowed) {
      const retrySeconds = Math.ceil(rateLimit.resetMs / 1000);
      return NextResponse.json(
        { error: `Rate limit exceeded. Please wait ${retrySeconds} seconds before generating another AI assessment.` },
        {
          status: 429,
          headers: {
            "Retry-After": String(retrySeconds),
          },
        }
      );
    }

    const groqApiKey = process.env.GROQ_API_KEY;

    if (!groqApiKey) {
      return NextResponse.json(
        { error: "GROQ_API_KEY environment variable is not configured on the server." },
        { status: 500 }
      );
    }

    const body = await req.json();
    const { violations, policy } = body || {};

    if (!Array.isArray(violations) || violations.length === 0) {
      return NextResponse.json(
        { error: "Invalid payload: violations array is required." },
        { status: 400 }
      );
    }

    // Limit violations payload size & sanitize inputs to prevent prompt injection and token overflow
    const sanitizedViolations = violations.slice(0, 20).map((v) => ({
      ruleName: escapeString(v.ruleName).slice(0, 50),
      title: escapeString(v.title).slice(0, 100),
      description: escapeString(v.description).slice(0, 250),
      severity: escapeString(v.severity || "medium").slice(0, 10),
    }));

    const systemPrompt = `You are a Chief Operations Officer (COO) providing an objective compliance assessment brief.
CRITICAL FORMATTING INSTRUCTION: Do NOT use markdown syntax (such as asterisks **, *, hashtags #, or em dashes —). Output strictly clean plain text with standard line breaks between sections. Do NOT use buzzwords like "executive".

Organize your output into 3 clear sections:

RISK OVERVIEW
[A direct 2-sentence summary of active risk level based strictly on the detected violations]

KEY POLICY BREACHES IDENTIFIED
[Clear plain text items listing exact rule breaches]

RECOMMENDED CORRECTIVE ACTIONS
[Practical, logically sound plain text steps to resolve breaches]`;

    const userMessage = `Active Policy Rules:
- Max Weekly Hours: ${Number(policy?.max_weekly_hours || 40)}h
- Min Rest Gap: ${Number(policy?.min_rest_hours || 10)}h
- Max Consecutive Days: ${Number(policy?.max_consecutive_days || 7)}d
- Max Shifts/Day: ${Number(policy?.max_shifts_per_day || 1)}

Detected Violations (${sanitizedViolations.length} total):
${JSON.stringify(sanitizedViolations, null, 2)}`;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${groqApiKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        temperature: 0.1,
        max_tokens: 600,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: errorData.error?.message || "Groq AI API request failed." },
        { status: response.status }
      );
    }

    const data = await response.json();
    let memoText = data.choices?.[0]?.message?.content || "No assessment generated.";

    // Strip any residual markdown asterisks or em dashes if outputted
    memoText = memoText.replace(/\*\*/g, "").replace(/\*/g, "").replace(/—/g, "-");

    return NextResponse.json(
      {
        memo: memoText,
        provider: "Groq Cloud",
        model: "llama-3.3-70b-versatile",
      },
      {
        headers: {
          "X-RateLimit-Remaining": String(rateLimit.remaining),
        },
      }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error during assessment generation." },
      { status: 500 }
    );
  }
}
