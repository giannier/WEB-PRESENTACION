'use client';

import { useEffect, useRef, useState } from 'react';

import { parseVoiceCommand, type VoiceCommand } from '@/lib/voiceIntent';

/**
 * The Web Speech API's `SpeechRecognition` has never made it into TypeScript's DOM
 * lib — Chrome still only ships the vendor-prefixed `webkitSpeechRecognition` — so the
 * shape used here is declared locally, covering only what this hook actually touches.
 */
interface SpeechRecognitionResultLike {
  readonly [index: number]: { readonly transcript: string };
  readonly isFinal: boolean;
}
interface SpeechRecognitionEventLike extends Event {
  readonly resultIndex: number;
  readonly results: { readonly length: number; [index: number]: SpeechRecognitionResultLike };
}
interface SpeechRecognitionErrorEventLike extends Event {
  readonly error: string;
}
interface SpeechRecognitionLike extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}
type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

function getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null;
  const withVendorPrefixes = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return withVendorPrefixes.SpeechRecognition ?? withVendorPrefixes.webkitSpeechRecognition ?? null;
}

/** How long to wait before restarting after the browser ends a session on its own —
 *  Chrome does this periodically even mid-silence on a continuous recognizer. */
const RESTART_DELAY_MS = 300;

export type VoiceControlState = {
  /** False on a browser without SpeechRecognition (Safari/iOS) — callers should hide
   *  any "listening" UI entirely rather than show a control that will never fire. */
  readonly supported: boolean;
  readonly listening: boolean;
  readonly permissionDenied: boolean;
};

/**
 * Always-on voice navigation: while `enabled`, continuously listens and turns every
 * recognised phrase into a `VoiceCommand` via `parseVoiceCommand`, calling `onCommand`
 * for anything that is not `{ type: 'none' }`.
 *
 * `enabled` toggling to `false` fully stops the recognizer rather than just ignoring its
 * output — the contact form's own recorder needs the microphone to itself while it is
 * capturing a long free-form introduction, and running two consumers of the same input
 * device at once is asking for cross-talk.
 */
export function useVoiceControl(enabled: boolean, onCommand: (command: VoiceCommand) => void): VoiceControlState {
  const [state, setState] = useState<VoiceControlState>({
    supported: getSpeechRecognitionConstructor() !== null,
    listening: false,
    permissionDenied: false,
  });

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const enabledRef = useRef(enabled);
  const onCommandRef = useRef(onCommand);
  enabledRef.current = enabled;
  onCommandRef.current = onCommand;

  useEffect(() => {
    const Recognition = getSpeechRecognitionConstructor();
    if (Recognition === null || !enabled) {
      setState((previous) => ({ ...previous, listening: false }));
      return;
    }

    let restartTimer: ReturnType<typeof setTimeout> | null = null;
    let stopped = false;

    const recognition = new Recognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'es-PE';

    recognition.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        if (result === undefined || !result.isFinal) continue;
        const alternative = result[0];
        if (alternative === undefined) continue;
        const command = parseVoiceCommand(alternative.transcript);
        if (command.type !== 'none') onCommandRef.current(command);
      }
    };

    recognition.onerror = (event) => {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        stopped = true;
        setState((previous) => ({ ...previous, listening: false, permissionDenied: true }));
      }
      // Anything else ('no-speech', 'network', 'aborted'…) is left to `onend`, which
      // restarts — a continuous recognizer errors out of ordinary silence often enough
      // that treating every error as fatal would mean it stops listening within seconds.
    };

    recognition.onend = () => {
      setState((previous) => ({ ...previous, listening: false }));
      if (stopped || !enabledRef.current) return;
      restartTimer = setTimeout(() => {
        try {
          recognition.start();
          setState((previous) => ({ ...previous, listening: true }));
        } catch {
          // start() throws if a session is somehow already active; the next onend
          // (or the effect cleanup below) is what recovers from that state.
        }
      }, RESTART_DELAY_MS);
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
      setState((previous) => ({ ...previous, listening: true }));
    } catch {
      setState((previous) => ({ ...previous, listening: false }));
    }

    return () => {
      stopped = true;
      if (restartTimer !== null) clearTimeout(restartTimer);
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      recognition.stop();
      recognitionRef.current = null;
    };
  }, [enabled]);

  return state;
}
