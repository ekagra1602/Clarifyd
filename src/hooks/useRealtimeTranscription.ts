import { useState, useRef, useCallback } from "react";
import { useAction, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

// Universal Streaming v3 endpoint
const ASSEMBLYAI_WS_URL = "wss://streaming.assemblyai.com/v3/ws";
const SAMPLE_RATE = 16000;

// Turn detection configuration (more aggressive than defaults)
// Lower values = faster turn endings
const TURN_DETECTION_CONFIG = {
  // Confidence threshold for end-of-turn detection (default: 0.4, range: 0.0-1.0)
  // Lower = ends turns sooner with less confidence
  endOfTurnConfidenceThreshold: "0.25",
  // Minimum silence in ms when confident (default: 400ms)
  // Lower = shorter pauses trigger turn end
  minEndOfTurnSilenceWhenConfident: "250",
  // Maximum silence in ms before forcing turn end (default: 1280ms)
  // Lower = faster fallback turn ending
  maxTurnSilence: "800",
};

interface UseRealtimeTranscriptionOptions {
  sessionId: Id<"sessions">;
}

interface UseRealtimeTranscriptionResult {
  isRecording: boolean;
  isConnecting: boolean;
  partialTranscript: string;
  error: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
}

export function useRealtimeTranscription({
  sessionId,
}: UseRealtimeTranscriptionOptions): UseRealtimeTranscriptionResult {
  const [isRecording, setIsRecording] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [partialTranscript, setPartialTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const getStreamingToken = useAction(api.assemblyai.getStreamingToken);
  const saveTranscript = useMutation(api.transcripts.saveTranscriptFromBrowser);

  const stopRecording = useCallback(() => {
    // Close WebSocket
    if (wsRef.current) {
      // Send termination message (v3 format)
      if (wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "Terminate" }));
      }
      wsRef.current.close();
      wsRef.current = null;
    }

    // Stop audio worklet
    if (workletNodeRef.current) {
      workletNodeRef.current.disconnect();
      workletNodeRef.current = null;
    }

    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    // Stop media stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    setIsRecording(false);
    setPartialTranscript("");
  }, []);

  const startRecording = useCallback(async () => {
    try {
      setIsConnecting(true);
      setError(null);
      setPartialTranscript("");

      // Get AssemblyAI token from Convex
      const { token } = await getStreamingToken({ sessionId });

      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      streamRef.current = stream;

      // Create audio context with default sample rate (matches mic)
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      const nativeSampleRate = audioContext.sampleRate;

      // Load audio worklet for processing with resampling
      await audioContext.audioWorklet.addModule(
        URL.createObjectURL(
          new Blob(
            [
              `
              class PCMProcessor extends AudioWorkletProcessor {
                constructor(options) {
                  super();
                  this.targetRate = options.processorOptions.targetRate;
                  this.nativeRate = options.processorOptions.nativeRate;
                  this.ratio = this.nativeRate / this.targetRate;
                  this.buffer = new Int16Array(4096);
                  this.bufferIndex = 0;
                  this.accumulator = 0;
                }

                process(inputs) {
                  const input = inputs[0];
                  if (!input || !input[0]) return true;

                  const samples = input[0];

                  // Simple linear resampling from native rate to target rate
                  for (let i = 0; i < samples.length; i++) {
                    this.accumulator += 1;

                    // Only take samples at the target rate interval
                    if (this.accumulator >= this.ratio) {
                      this.accumulator -= this.ratio;

                      // Convert float32 to int16
                      const s = Math.max(-1, Math.min(1, samples[i]));
                      this.buffer[this.bufferIndex++] = s < 0 ? s * 0x8000 : s * 0x7FFF;

                      // Send buffer when full
                      if (this.bufferIndex >= this.buffer.length) {
                        this.port.postMessage(this.buffer.slice());
                        this.bufferIndex = 0;
                      }
                    }
                  }
                  return true;
                }
              }
              registerProcessor('pcm-processor', PCMProcessor);
            `,
            ],
            { type: "application/javascript" }
          )
        )
      );

      // Create and connect audio worklet node with resampling options
      const source = audioContext.createMediaStreamSource(stream);
      const workletNode = new AudioWorkletNode(audioContext, "pcm-processor", {
        processorOptions: {
          targetRate: SAMPLE_RATE,
          nativeRate: nativeSampleRate,
        },
      });
      workletNodeRef.current = workletNode;

      // Connect to AssemblyAI WebSocket (v3 Universal Streaming)
      // format_turns=true gives us formatted final transcripts
      const wsUrl = new URL(ASSEMBLYAI_WS_URL);
      wsUrl.searchParams.set("token", token);
      wsUrl.searchParams.set("sample_rate", String(SAMPLE_RATE));
      wsUrl.searchParams.set("encoding", "pcm_s16le");
      wsUrl.searchParams.set("format_turns", "true");
      // Aggressive turn detection settings
      wsUrl.searchParams.set(
        "end_of_turn_confidence_threshold",
        TURN_DETECTION_CONFIG.endOfTurnConfidenceThreshold
      );
      wsUrl.searchParams.set(
        "min_end_of_turn_silence_when_confident",
        TURN_DETECTION_CONFIG.minEndOfTurnSilenceWhenConfident
      );
      wsUrl.searchParams.set(
        "max_turn_silence",
        TURN_DETECTION_CONFIG.maxTurnSilence
      );

      const ws = new WebSocket(wsUrl.toString());
      wsRef.current = ws;

      // Wait for WebSocket to open
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(
          () => reject(new Error("WebSocket connection timeout")),
          10000
        );
        ws.onopen = () => {
          clearTimeout(timeout);
          resolve();
        };
        ws.onerror = () => {
          clearTimeout(timeout);
          reject(new Error("WebSocket connection failed"));
        };
      });

      // Handle incoming messages (v3 format)
      ws.onmessage = async (event) => {
        const message = JSON.parse(event.data);

        // v3 uses "type" instead of "message_type"
        if (message.type === "Begin") {
          console.log("[AssemblyAI] Session started:", message.id);
        } else if (message.type === "Turn") {
          // v3 uses "transcript" instead of "text"
          // turn_is_formatted distinguishes partial vs final
          const transcript = message.transcript || "";

          if (message.turn_is_formatted) {
            // Final transcript - save to Convex
            const text = transcript.trim();
            if (text) {
              await saveTranscript({ sessionId, text });
            }
            setPartialTranscript("");
          } else {
            // Partial transcript - show in UI
            setPartialTranscript(transcript);
          }
        } else if (message.type === "Termination") {
          console.log("[AssemblyAI] Session terminated");
        } else if (message.type === "Error" || message.error) {
          const errorMsg = message.error || message.message || "Unknown error";
          console.error("[AssemblyAI] Error:", errorMsg);
          setError(errorMsg);
          stopRecording();
        }
      };

      ws.onerror = (event) => {
        console.error("[AssemblyAI] WebSocket error:", event);
        setError("Connection error");
        stopRecording();
      };

      ws.onclose = (event) => {
        console.log("[AssemblyAI] WebSocket closed:", event.code, event.reason);
        if (event.code === 1008) {
          // Rate limited - implement retry with backoff
          setError("Rate limited. Please try again in a moment.");
        }
        setIsRecording(false);
      };

      // Send audio data to WebSocket (v3 format: raw binary, not JSON)
      workletNode.port.onmessage = (event) => {
        if (ws.readyState === WebSocket.OPEN) {
          const pcmData = event.data as Int16Array;
          // v3 expects raw binary audio data, not JSON-encoded base64
          ws.send(pcmData.buffer);
        }
      };

      // Connect audio pipeline
      source.connect(workletNode);
      workletNode.connect(audioContext.destination);

      setIsRecording(true);
    } catch (err) {
      console.error("[Transcription] Error:", err);
      setError(err instanceof Error ? err.message : "Failed to start recording");
      stopRecording();
    } finally {
      setIsConnecting(false);
    }
  }, [sessionId, getStreamingToken, saveTranscript, stopRecording]);

  return {
    isRecording,
    isConnecting,
    partialTranscript,
    error,
    startRecording,
    stopRecording,
  };
}
