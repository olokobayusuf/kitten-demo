"use client";

import { useRef, useState } from "react";
import { Muna } from "muna";

const PCM_SAMPLE_RATE = 24_000;

const bufferFromUint8 = (data: Uint8Array) =>
  data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);

const responseToArrayBuffer = async (payload: any): Promise<ArrayBufferLike> => {
  if (!payload) {
    throw new Error("Missing audio payload");
  }

  if (payload instanceof ArrayBuffer) {
    return payload;
  }

  if (ArrayBuffer.isView(payload)) {
    return bufferFromUint8(
      new Uint8Array(payload.buffer, payload.byteOffset, payload.byteLength)
    );
  }

  if (typeof payload.arrayBuffer === "function") {
    return payload.arrayBuffer();
  }

  if (payload.data) {
    return responseToArrayBuffer(payload.data);
  }

  if (payload.body) {
    return responseToArrayBuffer(payload.body);
  }

  throw new Error("Unsupported audio response format");
};

export default function Home() {
  const [transcript, setTranscript] = useState("Hello from AI Engineer");
  const audioContextRef = useRef<AudioContext | null>(null);
  const muna = new Muna({ accessKey: "muna_kCSKMBv04D1Z6VDaldcg7" });
  const openai = muna.beta.openai;

  const handleDictate = async () => {
    try {
      const response = await openai.audio.speech.create({
        model: "@kitten-ml/kitten-tts",
        input: transcript,
        voice: "expr-voice-2-m",
        response_format: "pcm"
      });

      const audioData = await responseToArrayBuffer(response);
      const audioContext = audioContextRef.current ?? new AudioContext();

      if (!audioContextRef.current) {
        audioContextRef.current = audioContext;
      }

      if (audioContext.state === "suspended") {
        await audioContext.resume();
      }

      const floatChannelData = new Float32Array(audioData);
      const audioBuffer = audioContext.createBuffer(
        1,
        floatChannelData.length,
        PCM_SAMPLE_RATE
      );

      audioBuffer.getChannelData(0).set(floatChannelData);

      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      source.start();

      console.log("Dictation response:", response);
    } catch (error) {
      console.error("Dictation failed:", error);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-6 font-sans dark:bg-black">
      <main className="flex w-full max-w-xl flex-col gap-6 rounded-2xl border border-zinc-200 bg-white p-10 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Dictation Console
        </h1>
        <textarea
          className="h-40 w-full rounded-xl border border-zinc-200 bg-white p-4 text-lg text-zinc-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:ring-blue-400/50"
          aria-label="Dictation text box"
          value={transcript}
          onChange={(event) => setTranscript(event.target.value)}
        />
        <button
          type="button"
          onClick={handleDictate}
          className="h-12 rounded-xl bg-blue-600 text-base font-semibold text-white transition hover:bg-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 dark:bg-blue-500 dark:hover:bg-blue-400 dark:focus-visible:ring-blue-300/60"
        >
          Dictate Speech
        </button>
      </main>
    </div>
  );
}
