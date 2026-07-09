import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const openAiHeaders = () => ({
  Authorization: `Bearer ${process.env.OPENAI_API_KEY ?? ""}`
});

const readResponseText = (data: {
  output_text?: string;
  output?: Array<{ content?: Array<{ text?: string }> }>;
}) => {
  if (data.output_text) return data.output_text;
  return data.output?.flatMap((item) => item.content ?? []).map((content) => content.text ?? "").join("").trim() ?? "";
};

export async function POST(request: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "OPENAI_API_KEY is not set." }, { status: 500 });
    }

    const formData = await request.formData();
    const audio = formData.get("audio");

    if (!(audio instanceof File)) {
      return NextResponse.json({ error: "Audio file is required." }, { status: 400 });
    }

    const transcriptionForm = new FormData();
    transcriptionForm.append("file", audio, audio.name || "voice.webm");
    transcriptionForm.append("model", "gpt-4o-mini-transcribe");
    transcriptionForm.append("response_format", "text");

    const transcriptionResponse = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: openAiHeaders(),
      body: transcriptionForm
    });

    if (!transcriptionResponse.ok) {
      return NextResponse.json(
        { error: await transcriptionResponse.text() },
        { status: transcriptionResponse.status }
      );
    }

    const transcript = (await transcriptionResponse.text()).trim();

    const polishResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        ...openAiHeaders(),
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        input: [
          {
            role: "system",
            content:
              "You convert voice transcripts into concise natural Japanese business notes. If the transcript is Chinese, translate it to Japanese. If it is Japanese, correct typos and wording. Do not add facts. Avoid unnecessary polite endings such as です/ます/します. Prefer short plain-form memo style. For task-like content, use action-oriented wording such as 確認する, 調査する, 整理する, 方針を決める."
          },
          {
            role: "user",
            content: transcript
          }
        ]
      })
    });

    if (!polishResponse.ok) {
      return NextResponse.json(
        { error: await polishResponse.text(), transcript },
        { status: polishResponse.status }
      );
    }

    const polished = readResponseText(await polishResponse.json());
    return NextResponse.json({ text: polished || transcript, transcript });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected transcription error." },
      { status: 500 }
    );
  }
}
