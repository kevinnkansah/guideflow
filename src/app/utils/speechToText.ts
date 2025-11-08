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
 * Transcribes audio blob to text using server-side API route
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

    // Create form data to send to API route
    const formData = new FormData();
    formData.append("audio", audioFile);

    // Send to server-side API route
    const response = await fetch("/api/transcribe", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Transcription failed");
    }

    const result = await response.json();
    return {
      text: result.text,
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
