# AI_VoiceChatBot


## Overview
This project is a state-of-the-art voice chatbot. It leverages cutting-edge technologies to provide a seamless and interactive voice-enabled experience. The system integrates:
- **Cartesia** for text-to-speech (TTS),
- **OpenAI** for both the large language model (LLM) and speech-to-text (STT), and
- **LiveKit** for real-time audio and video integration.

## Features
- **Real-Time Transcription:** Supports 15 accents and 99 languages.
- **Interactive Chat:** Engages users through voice inputs and outputs.
- **Robust Architecture:** Front-end built with React; back-end developed using Next.js.


## Technologies Used
- **Backend:** Python, Next.js
- **Frontend:** React, pnpm
- **Voice Processing:** Cartesia, OpenAI, LiveKit


## Setup & Testing Instructions

### Prerequisites
- A virtual environment set up for Python.
- pnpm installed for managing frontend dependencies.
- Access to the `vc_demo` directory.

### Steps to Test the Voice Chatbot

1. **Open Three Terminal Windows:**

2. **Terminal 1: Start the Agent**
   - Navigate to the `vc_demo` directory.
   - Activate your Python virtual environment:
     - **On macOS/Linux:**  
       ```bash
       source venv/bin/activate
       ```
     - **On Windows (Command Prompt):**  
       ```bash
       venv\Scripts\activate
       ```
     - **On Windows (PowerShell):**  
       ```powershell
       .\venv\Scripts\Activate.ps1
       ```
   - Run the agent in development mode:
     ```bash
     python agent.py dev
     ```

3. **Terminal 2: Start the Frontend**
   - Navigate to the `vc_demo` directory, then change to the `vc_frontend` folder:
     ```bash
     cd vc_frontend
     ```
   - Activate the same virtual environment if needed.
   - Start the development server:
     ```bash
     pnpm dev
     ```

4. **Test the Chatbot**
   - Open your web browser and go to [http://localhost:3000/](http://localhost:3000/) to interact with the voice chatbot.

5. **Stop the Agent**
   - Once testing is complete, return to Terminal 1 and press `Ctrl+C` to stop the agent.


