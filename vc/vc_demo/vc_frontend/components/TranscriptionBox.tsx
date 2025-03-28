"use client";

import { useEffect, useState } from "react";

interface TranscriptEntry {
  role: string;
  timestamp: string;
  text: string;
}

export default function TranscriptionBox() {
  const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([]);

  const fetchTranscriptions = async () => {
    try {
      const res = await fetch("/api/connection-details/transcription");
      if (res.ok) {
        const data = await res.json();
        setTranscripts(data);
      } else {
        console.error("Failed to fetch transcriptions:", res.status);
      }
    } catch (error) {
      console.error("Error fetching transcriptions:", error);
    }
  };

  // Fetch initially and then every 5 seconds
  useEffect(() => {
    fetchTranscriptions();
    const interval = setInterval(fetchTranscriptions, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    // STYLING CHANGES: Updated background to dark (bg-gray-800) and text to white.
    <div className="p-4 border rounded bg-gray-800 text-white overflow-auto h-64 mt-4">
      <h2 className="text-lg font-semibold mb-2">Transcriptions</h2>
      {transcripts.length === 0 ? (
        <p>No transcriptions available.</p>
      ) : (
        transcripts.map((entry, index) => (
          <div key={index} className="mb-2">
            <strong>{entry.role}:</strong> {entry.text}
          </div>
        ))
      )}
    </div>
  );
}
