"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  LiveKitRoom,
  useVoiceAssistant,
  BarVisualizer,
  RoomAudioRenderer,
  VoiceAssistantControlBar,
  AgentState,
  DisconnectButton,
} from "@livekit/components-react";
import { useCallback, useEffect, useState } from "react";
import type { ConnectionDetails } from "./api/connection-details/route";
import { NoAgentNotification } from "@/components/NoAgentNotification";
import { CloseIcon } from "@/components/CloseIcon";
import { useKrispNoiseFilter } from "@livekit/components-react/krisp";

// Import TranscriptionBox component for displaying transcripts
import TranscriptionBox from "@/components/TranscriptionBox";

export default function Page() {
  const [connectionDetails, updateConnectionDetails] = useState<ConnectionDetails | undefined>(undefined);
  const [agentState, setAgentState] = useState<AgentState>("disconnected");

  // States to hold selected accent and language with defaults.
  const [selectedAccent, setSelectedAccent] = useState("Indian");
  const [selectedLanguage, setSelectedLanguage] = useState("English");

  // Define updated options for accents.
  const accentOptions = [
    "American",
    "Australian",
    "British",
    "German",
    "Portuguese",
    "Chinese",
    "Japanese",
    "French",
    "Spanish",
    "Hindi",
    "Italian",
    "Korean",
    "Dutch",
    "Polish",
    "Russian",
    "Swedish",
    "Turkish",
  ];

  // Define language options with all available languages (as supported by Whisper).
  const languageOptions = [
    "Afrikaans",
    "Albanian",
    "Amharic",
    "Arabic",
    "Armenian",
    "Assamese",
    "Azerbaijani",
    "Bashkir",
    "Basque",
    "Belarusian",
    "Bengali",
    "Bosnian",
    "Bulgarian",
    "Catalan",
    "Cebuano",
    "Chinese",
    "Croatian",
    "Czech",
    "Danish",
    "Dutch",
    "English",
    "Estonian",
    "Finnish",
    "French",
    "Galician",
    "Georgian",
    "German",
    "Greek",
    "Gujarati",
    "Haitian Creole",
    "Hebrew",
    "Hindi",
    "Hungarian",
    "Icelandic",
    "Indonesian",
    "Irish",
    "Italian",
    "Japanese",
    "Javanese",
    "Kannada",
    "Kazakh",
    "Khmer",
    "Korean",
    "Kurdish",
    "Kyrgyz",
    "Lao",
    "Latin",
    "Latvian",
    "Lithuanian",
    "Luxembourgish",
    "Macedonian",
    "Malagasy",
    "Malay",
    "Malayalam",
    "Maltese",
    "Maori",
    "Marathi",
    "Mongolian",
    "Nepali",
    "Norwegian",
    "Odia (Oriya)",
    "Pashto",
    "Persian",
    "Polish",
    "Portuguese",
    "Punjabi",
    "Romanian",
    "Russian",
    "Scottish Gaelic",
    "Serbian",
    "Sinhala",
    "Slovak",
    "Slovenian",
    "Somali",
    "Spanish",
    "Sundanese",
    "Swahili",
    "Swedish",
    "Tajik",
    "Tamil",
    "Tatar",
    "Telugu",
    "Thai",
    "Turkish",
    "Ukrainian",
    "Urdu",
    "Uzbek",
    "Vietnamese",
    "Welsh",
    "Xhosa",
    "Yiddish",
    "Yoruba",
    "Zulu",
  ];

  // Function to update settings by sending a POST request.
  const updateSettings = async (newAccent: string, newLanguage: string) => {
    try {
      const response = await fetch("/api/connection-details/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ accent: newAccent, language: newLanguage }),
      });
      if (response.ok) {
        console.log("Settings updated successfully");
      } else {
        console.error("Failed to update settings:", response.status);
      }
    } catch (error) {
      console.error("Error updating settings:", error);
    }
  };

  // Render dropdowns for accent and language selection.
  const renderDropdowns = () => (
    <div
      className="flex flex-col items-center gap-4 mb-4 p-4"
      style={{ backgroundColor: "#333", borderRadius: "8px" }}
    >
      <div className="flex gap-4">
        <div>
          <label className="text-white mr-2">Accent:</label>
          <select
            value={selectedAccent}
            onChange={(e) => {
              const newAccent = e.target.value;
              setSelectedAccent(newAccent);
              updateSettings(newAccent, selectedLanguage);
            }}
            className="p-2 rounded bg-white text-black"
          >
            {accentOptions.map((accent) => (
              <option key={accent} value={accent}>
                {accent}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-white mr-2">Communication Language:</label>
          <select
            value={selectedLanguage}
            onChange={(e) => {
              const newLanguage = e.target.value;
              setSelectedLanguage(newLanguage);
              updateSettings(selectedAccent, newLanguage);
            }}
            className="p-2 rounded bg-white text-black"
          >
            {languageOptions.map((lang) => (
              <option key={lang} value={lang}>
                {lang}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );

  // State to hold transcripts for real-time display.
  const [transcripts, setTranscripts] = useState<any[]>([]);

  // Poll the transcript endpoint every 250 ms, bypassing cache with a timestamp.
  useEffect(() => {
    const intervalId = setInterval(async () => {
      try {
        // Append a query parameter to bypass caching
        const response = await fetch("/api/connection-details/transcription?ts=" + Date.now());
        if (response.ok) {
          const data = await response.json();
          setTranscripts(data);
        }
      } catch (err) {
        console.error("Error fetching transcripts", err);
      }
    }, 250); // Poll every 250 ms
    return () => clearInterval(intervalId);
  }, []);

  // onConnectButtonClicked: fetches connection details from the API.
  const onConnectButtonClicked = useCallback(async () => {
    console.log("Start button clicked.");
    try {
      const url = new URL(
        process.env.NEXT_PUBLIC_CONN_DETAILS_ENDPOINT ??
          (window.location.pathname.startsWith("/yash/vc")
            ? "/yash/vc/api/connection-details"
            : "/api/connection-details"),
        window.location.origin
      );
      console.log("Fetching connection details from:", url.toString());
      const response = await fetch(url.toString());
      if (!response.ok) {
        console.error("Failed to fetch connection details:", response.status);
        return;
      }
      const connectionDetailsData = await response.json();
      console.log("Received connection details:", connectionDetailsData);
      updateConnectionDetails(connectionDetailsData);
    } catch (error) {
      console.error("Error in onConnectButtonClicked:", error);
    }
  }, []);

  // onDisconnectClicked: resets connectionDetails to disconnect the agent.
  const onDisconnectClicked = () => {
    console.log("Disconnect button clicked. Clearing connection details.");
    updateConnectionDetails(undefined);
  };

  return (
    <main data-lk-theme="default" className="h-full grid content-center bg-[var(--lk-bg)]">
      {renderDropdowns()}
      <LiveKitRoom
        token={connectionDetails?.participantToken}
        serverUrl={connectionDetails?.serverUrl}
        connect={connectionDetails !== undefined}
        audio={true}
        video={false}
        onMediaDeviceFailure={(error) => {
          console.error(error);
          alert(
            "Error acquiring camera or microphone permissions. Please make sure you grant the necessary permissions in your browser and reload the tab"
          );
        }}
        onDisconnected={() => {
          console.log("LiveKitRoom disconnected.");
          updateConnectionDetails(undefined);
        }}
        className="grid grid-rows-[2fr_1fr] items-center"
      >
        <SimpleVoiceAssistant onStateChange={setAgentState} />
        <ControlBar
          onConnectButtonClicked={onConnectButtonClicked}
          onDisconnectClicked={onDisconnectClicked}
          agentState={agentState}
        />
        <RoomAudioRenderer />
      </LiveKitRoom>
      <div className="text-center text-white mt-2">
        {connectionDetails
          ? `Agent Connected (${connectionDetails.roomName})`
          : "Agent Disconnected"}
      </div>
      {/* Clear Transcription Button */}
      <div className="flex justify-center my-4">
        {/* <button
          onClick={async () => {
            try {
              const response = await fetch("/api/connection-details/clear-transcription", { method: "POST" });
              if (response.ok) {
                console.log("Transcripts cleared on server");
                setTranscripts([]);
              } else {
                console.error("Failed to clear transcripts:", response.status);
              }
            } catch (err) {
              console.error("Error clearing transcripts:", err);
            }
          }}
          className="px-4 py-2 bg-red-500 text-white rounded"
        >
          Clear Transcription
        </button> */}
      </div>
      <TranscriptionBox transcripts={transcripts} />
    </main>
  );
}

function SimpleVoiceAssistant(props: { onStateChange: (state: AgentState) => void }) {
  const { state, audioTrack } = useVoiceAssistant();
  useEffect(() => {
    props.onStateChange(state);
  }, [props, state]);
  return (
    <div className="h-[300px] max-w-[90vw] mx-auto">
      <BarVisualizer
        state={state}
        barCount={5}
        trackRef={audioTrack}
        className="agent-visualizer"
        options={{ minHeight: 24 }}
      />
    </div>
  );
}

function ControlBar(props: { onConnectButtonClicked: () => void; onDisconnectClicked: () => void; agentState: AgentState }) {
  const krisp = useKrispNoiseFilter();
  useEffect(() => {
    krisp.setNoiseFilterEnabled(true);
  }, []);
  return (
    <div className="relative h-[100px]">
      <AnimatePresence>
        {props.agentState === "disconnected" && (
          <motion.button
            initial={{ opacity: 0, top: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, top: "-10px" }}
            transition={{ duration: 1, ease: [0.09, 1.04, 0.245, 1.055] }}
            className="uppercase absolute left-1/2 -translate-x-1/2 px-4 py-2 bg-white text-black rounded-md"
            onClick={props.onConnectButtonClicked}
          >
            Start a conversation
          </motion.button>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {props.agentState !== "disconnected" && props.agentState !== "connecting" && (
          <motion.div
            initial={{ opacity: 0, top: "10px" }}
            animate={{ opacity: 1, top: 0 }}
            exit={{ opacity: 0, top: "-10px" }}
            transition={{ duration: 0.4, ease: [0.09, 1.04, 0.245, 1.055] }}
            className="flex h-8 absolute left-1/2 -translate-x-1/2 justify-center"
          >
            <VoiceAssistantControlBar controls={{ leave: false }} />
            <DisconnectButton onClick={props.onDisconnectClicked}>
              <CloseIcon />
            </DisconnectButton>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
