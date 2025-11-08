import { useCallback, useEffect, useRef, useState } from "react";
import { IconButton, ThemeProvider } from "@crayonai/react-ui";
import { Loader2, Mic, MicOff } from "lucide-react";
import {
  isAudioRecordingSupported,
  transcribeAudio,
} from "@/app/utils/speechToText";

type MicrophoneButtonProps = {
  onTranscriptionComplete: (text: string) => void;
  isDarkMode: boolean;
  disabled?: boolean;
};

export const MicrophoneButton = ({
  onTranscriptionComplete,
  isDarkMode,
  disabled = false,
}: MicrophoneButtonProps) => {
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(true);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const isRecordingRef = useRef(false);

  // Check browser support on mount
  useEffect(() => {
    setIsSupported(isAudioRecordingSupported());
  }, []);

  // Recording timer
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setRecordingTime(0);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRecording]);

  const handleTranscription = useCallback(
    async (audioBlob: Blob) => {
      setIsTranscribing(true);
      setError(null);

      try {
        const result = await transcribeAudio(audioBlob, {
          language: "en",
          temperature: 0,
        });

        if (result.text.trim()) {
          // Only populate the input field, DO NOT auto-submit
          onTranscriptionComplete(result.text);
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Transcription failed";
        setError(errorMessage);
        console.error("Transcription error:", err);
      } finally {
        setIsTranscribing(false);
      }
    },
    [onTranscriptionComplete]
  );

  const startRecording = useCallback(async () => {
    if (isRecordingRef.current) {
      return; // Prevent multiple recordings
    }

    try {
      setIsRecording(true);
      isRecordingRef.current = true;
      setError(null);
      audioChunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        console.log("Data available, size:", event.data.size);
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        // Prevent multiple onstop calls
        if (!isRecordingRef.current) return;

        console.log(
          "MediaRecorder stopped, chunks collected:",
          audioChunksRef.current.length
        );

        // Always create a blob, even if no chunks (some browsers need this)
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm;codecs=opus",
        });

        // Stop all tracks
        if (streamRef.current) {
          for (const track of streamRef.current.getTracks()) {
            track.stop();
          }
          streamRef.current = null;
        }

        // Process transcription after a short delay to ensure cleanup
        setTimeout(() => {
          setIsRecording(false);
          isRecordingRef.current = false;

          // Only transcribe if we have actual audio data
          if (audioChunksRef.current.length > 0) {
            handleTranscription(audioBlob);
          } else {
            console.log("No audio data to transcribe");
          }
        }, 100);
      };

      // Start recording
      mediaRecorder.start(100); // Collect data more frequently for better responsiveness
    } catch (err) {
      setIsRecording(false);
      isRecordingRef.current = false;
      const errorMessage =
        err instanceof Error ? err.message : "Failed to start recording";
      setError(errorMessage);
      console.error("Recording error:", err);

      // Clean up any partial stream
      if (streamRef.current) {
        for (const track of streamRef.current.getTracks()) {
          track.stop();
        }
        streamRef.current = null;
      }
    }
  }, [handleTranscription]);

  const stopRecording = useCallback(() => {
    console.log("stopRecording called", {
      hasMediaRecorder: !!mediaRecorderRef.current,
      isRecording: isRecordingRef.current,
      mediaRecorderState: mediaRecorderRef.current?.state,
    });

    if (
      mediaRecorderRef.current &&
      isRecordingRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      console.log("Calling mediaRecorder.stop()");
      mediaRecorderRef.current.stop();
      // Don't set isRecording false here - let onstop handle it
    } else {
      console.log("Cannot stop recording - conditions not met");
    }
  }, []);

  const handleClick = useCallback(async () => {
    console.log("Microphone button clicked", {
      disabled,
      isSupported,
      isTranscribing,
      isRecording: isRecordingRef.current,
      mediaRecorderState: mediaRecorderRef.current?.state,
    });

    if (disabled || !isSupported || isTranscribing) {
      return;
    }

    if (isRecordingRef.current) {
      console.log("Stopping recording...");
      stopRecording();
    } else {
      console.log("Starting recording...");
      await startRecording();
    }
  }, [startRecording, stopRecording, disabled, isSupported, isTranscribing]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (!isSupported) {
    return (
      <ThemeProvider mode={isDarkMode ? "dark" : "light"}>
        <IconButton
          disabled
          icon={<MicOff size={20} />}
          size="medium"
          title="Microphone not supported in this browser"
          variant="secondary"
        />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider mode={isDarkMode ? "dark" : "light"}>
      <div className="relative flex items-center gap-2">
        <IconButton
          type="button"
          disabled={disabled || isTranscribing}
          icon={
            isTranscribing ? (
              <Loader2 className="animate-spin" size={20} />
            ) : isRecording ? (
              <MicOff size={20} />
            ) : (
              <Mic size={20} />
            )
          }
          onClick={handleClick}
          size="medium"
          title={
            isRecording
              ? `Recording... ${formatTime(recordingTime)}`
              : isTranscribing
                ? "Transcribing..."
                : "Click to record"
          }
          variant="secondary"
        />

        {isRecording && (
          <div className="-top-8 -translate-x-1/2 absolute left-1/2 transform animate-pulse whitespace-nowrap rounded bg-red-500 px-2 py-1 text-white text-xs">
            {formatTime(recordingTime)}
          </div>
        )}

        {error && (
          <div className="-top-16 -translate-x-1/2 absolute left-1/2 max-w-48 transform rounded bg-red-500 px-3 py-2 text-center text-white text-xs">
            {error}
          </div>
        )}
      </div>
    </ThemeProvider>
  );
};
