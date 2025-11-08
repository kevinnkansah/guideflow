import Groq from "groq-sdk";
import type { NextRequest } from "next/server";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audioFile = formData.get("audio") as File;

    if (!audioFile) {
      return Response.json(
        { error: "No audio file provided" },
        { status: 400 }
      );
    }

    // Convert File to buffer for Groq SDK
    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Create a file-like object for Groq using toFile helper
    const audioFileForGroq = new File(
      [buffer],
      audioFile.name || "audio.webm",
      {
        type: audioFile.type || "audio/webm",
      }
    );

    const transcription = await groq.audio.transcriptions.create({
      model: "whisper-large-v3-turbo",
      file: audioFileForGroq,
      language: "en",
      temperature: 0,
      response_format: "json",
    });

    return Response.json({
      text: transcription.text,
    });
  } catch (error) {
    console.error("Transcription error:", error);
    return Response.json(
      {
        error:
          error instanceof Error
            ? `Transcription failed: ${error.message}`
            : "Unknown transcription error",
      },
      { status: 500 }
    );
  }
}
