import { NextResponse } from "next/server";

export const runtime = "nodejs";

type InputCard = {
  id: string;
  title: string;
  body: string;
  status: string;
  dueDate: string | null;
  tags: string[];
};

type ExtractedTask = {
  sourceCardId: string;
  title: string;
  body: string;
  status: "未着手" | "実施中";
  dueDate: string | null;
};

const normalizeDueDate = (value: string | null) => {
  if (!value) return null;
  const currentYear = new Date().getFullYear();
  const trimmed = value.trim();
  const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    const [, rawYear, month, day] = isoMatch;
    const numericYear = Number(rawYear);
    const year = numericYear < currentYear - 1 || numericYear > currentYear + 1 ? currentYear : numericYear;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }
  const slashMatch = trimmed.match(/^(?:(\d{4})[/-])?(\d{1,2})[/-](\d{1,2})$/);
  if (slashMatch) {
    const [, rawYear, month, day] = slashMatch;
    const numericYear = rawYear ? Number(rawYear) : currentYear;
    const year = numericYear < currentYear - 1 || numericYear > currentYear + 1 ? currentYear : numericYear;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }
  const japaneseMatch = trimmed.match(/^(?:(\d{4})年)?\s*(\d{1,2})月\s*(\d{1,2})日?$/);
  if (japaneseMatch) {
    const [, rawYear, month, day] = japaneseMatch;
    const numericYear = rawYear ? Number(rawYear) : currentYear;
    const year = numericYear < currentYear - 1 || numericYear > currentYear + 1 ? currentYear : numericYear;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }
  return null;
};

const readResponseText = (data: {
  output_text?: string;
  output?: Array<{ content?: Array<{ text?: string }> }>;
}) => {
  if (data.output_text) return data.output_text;
  return data.output?.flatMap((item) => item.content ?? []).map((content) => content.text ?? "").join("").trim() ?? "";
};

export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "OPENAI_API_KEY is not set." }, { status: 500 });
  }

  const body = (await request.json()) as {
    cards?: InputCard[];
    existingTitles?: string[];
  };
  const cards = body.cards ?? [];
  const existingTitles = body.existingTitles ?? [];

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      input: [
        {
          role: "system",
          content:
            "You extract small actionable tasks from Japanese project-card notes. Return only valid JSON. Do not duplicate existing task titles. Do not invent facts. Use Japanese. Task titles must be short plain-form Japanese, never polite endings like します/です. Prefer forms like 確認する, 調査する, 整理する, 方針を決める."
        },
        {
          role: "user",
          content: JSON.stringify({
            rules: [
              `Current date is ${new Date().toISOString().slice(0, 10)}.`,
              "Extract only small actionable tasks, not whole project strategies.",
              "Each title should be concise and action-oriented.",
              "Do not end titles with します, です, ください, or お願いします.",
              "Prefer title endings like する, 決める, 確認, 調査, 整理, 作成.",
              "Use status 実施中 only when the source card status is 実行中; otherwise use 未着手.",
              "Carry over dueDate only when the task clearly has a date; otherwise null.",
              `When dueDate exists, it must be ISO format YYYY-MM-DD. Never return formats like 7/1 or 7月1日. If a date has no year, use ${new Date().getFullYear()}.`,
              "Do not include tasks whose normalized title is already in existingTitles."
            ],
            existingTitles,
            cards
          })
        }
      ],
      text: {
        format: {
          type: "json_schema",
          name: "task_extraction",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              tasks: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    sourceCardId: { type: "string" },
                    title: { type: "string" },
                    body: { type: "string" },
                    status: { type: "string", enum: ["未着手", "実施中"] },
                    dueDate: { type: ["string", "null"] }
                  },
                  required: ["sourceCardId", "title", "body", "status", "dueDate"]
                }
              }
            },
            required: ["tasks"]
          }
        }
      }
    })
  });

  if (!response.ok) {
    return NextResponse.json({ error: await response.text() }, { status: response.status });
  }

  const text = readResponseText(await response.json());
  const parsed = JSON.parse(text || "{\"tasks\":[]}") as { tasks: ExtractedTask[] };

  return NextResponse.json({
    tasks: parsed.tasks.map((task) => ({
      ...task,
      dueDate: normalizeDueDate(task.dueDate)
    }))
  });
}
