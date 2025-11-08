import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.NEXT_PUBLIC_GROQ_API_KEY,
  dangerouslyAllowBrowser: true,
});

export interface TranscriptionOptions {
  language?: string;
  prompt?: string;
  temperature?: number;
  responseFormat?: "json" | "text" | "verbose_json";
}

export interface TranscriptionResult {
  text: string;
  duration?: number;
  language?: string;
}

/**
 * Transcribes audio blob to text using Groq's Whisper model
 */
export const transcribeAudio = async (
  audioBlob: Blob,
  options: TranscriptionOptions = {}
): Promise<TranscriptionResult> => {
  try {
    // Create a File object from the blob
    const audioFile = new File([audioBlob], "audio.webm", {
      type: audioBlob.type,
    });

    const transcription = await groq.audio.transcriptions.create({
      model: "whisper-large-v3-turbo",
      file: audioFile,
      language: options.language || "en",
      prompt: options.prompt,
      temperature: options.temperature || 0,
      response_format: options.responseFormat || "json",
    });

    return {
      text: transcription.text,
    };
  } catch (error) {
    console.error("Error transcribing audio:", error);
    throw new Error(
      error instanceof Error
        ? `Transcription failed: ${error.message}`
        : "Unknown transcription error"
    );
  }
};

/**
 * Checks if browser supports audio recording
 */
export const isAudioRecordingSupported = (): boolean =>
  !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);

/**
 * Requests microphone permissions
 */
export const requestMicrophonePermission = async (): Promise<boolean> => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    // Stop the stream immediately after getting permission
    stream.getTracks().forEach((track) => track.stop());
    return true;
  } catch (error) {
    console.error("Microphone permission denied:", error);
    return false;
  }
};
