import asyncio
import logging
import json
import requests  # For API calls
from dotenv import load_dotenv
import openai as official_openai  # Official OpenAI package

from livekit.agents import (
    AutoSubscribe,
    JobContext,
    JobProcess,
    WorkerOptions,
    cli,
    llm,
    metrics,
)
from livekit.agents.pipeline import VoicePipelineAgent
from livekit.plugins import cartesia, openai as livekit_openai, silero, turn_detector

# Before running, please run the migration command:
# openai migrate
# This updates your codebase to use the new asynchronous ChatCompletion interface.

# Load environment variables from .env.local
load_dotenv(dotenv_path=".env.local")
logger = logging.getLogger("voice-agent")

# Global conversation log to store conversation history
conversation_log = []

def prewarm(proc: JobProcess):
    # Preload the Voice Activity Detection (VAD) model
    proc.userdata["vad"] = silero.VAD.load()

async def attach_user_final_handler(agent: VoicePipelineAgent, async_handler):
    """
    Attaches an asynchronous handler to process final user transcripts.
    Waits until the human input is available, then attaches a synchronous wrapper callback.
    """
    while getattr(agent, "_human_input", None) is None:
        await asyncio.sleep(0.5)
    def handler_wrapper(data):
        asyncio.create_task(async_handler(data))
    agent._human_input.on("final_transcript", handler_wrapper)
    logger.info("Attached user final_transcript handler to human_input")

# --- Language Mapping ---
# Map UI-friendly language names to ISO 639-1 codes for OpenAI STT.
LANGUAGE_MAPPING = {
    "Afrikaans": "af",
    "Albanian": "sq",
    "Amharic": "am",
    "Arabic": "ar",
    "Armenian": "hy",
    "Assamese": "as",
    "Azerbaijani": "az",
    "Bashkir": "ba",
    "Basque": "eu",
    "Belarusian": "be",
    "Bengali": "bn",
    "Bosnian": "bs",
    "Bulgarian": "bg",
    "Catalan": "ca",
    "Cebuano": "ceb",
    "Chinese": "zh",
    "Croatian": "hr",
    "Czech": "cs",
    "Danish": "da",
    "Dutch": "nl",
    "English": "en",
    "Estonian": "et",
    "Finnish": "fi",
    "French": "fr",
    "Galician": "gl",
    "Georgian": "ka",
    "German": "de",
    "Greek": "el",
    "Gujarati": "gu",
    "Haitian Creole": "ht",
    "Hebrew": "he",
    "Hindi": "hi",
    "Hungarian": "hu",
    "Icelandic": "is",
    "Indonesian": "id",
    "Irish": "ga",
    "Italian": "it",
    "Japanese": "ja",
    "Javanese": "jv",
    "Kannada": "kn",
    "Kazakh": "kk",
    "Khmer": "km",
    "Korean": "ko",
    "Kurdish": "ku",
    "Kyrgyz": "ky",
    "Lao": "lo",
    "Latin": "la",
    "Latvian": "lv",
    "Lithuanian": "lt",
    "Luxembourgish": "lb",
    "Macedonian": "mk",
    "Malagasy": "mg",
    "Malay": "ms",
    "Malayalam": "ml",
    "Maltese": "mt",
    "Maori": "mi",
    "Marathi": "mr",
    "Mongolian": "mn",
    "Nepali": "ne",
    "Norwegian": "no",
    "Odia (Oriya)": "or",
    "Pashto": "ps",
    "Persian": "fa",
    "Polish": "pl",
    "Portuguese": "pt",
    "Punjabi": "pa",
    "Romanian": "ro",
    "Russian": "ru",
    "Scottish Gaelic": "gd",
    "Serbian": "sr",
    "Sinhala": "si",
    "Slovak": "sk",
    "Slovenian": "sl",
    "Somali": "so",
    "Spanish": "es",
    "Sundanese": "su",
    "Swahili": "sw",
    "Swedish": "sv",
    "Tajik": "tg",
    "Tamil": "ta",
    "Tatar": "tt",
    "Telugu": "te",
    "Thai": "th",
    "Turkish": "tr",
    "Ukrainian": "uk",
    "Urdu": "ur",
    "Uzbek": "uz",
    "Vietnamese": "vi",
    "Welsh": "cy",
    "Xhosa": "xh",
    "Yiddish": "yi",
    "Yoruba": "yo",
    "Zulu": "zu",
}

def get_settings():
    """
    Retrieves the current language and accent settings from the API endpoint.
    Returns a tuple (language, accent). Defaults to "en" and "Indian" if any error occurs.
    The language is mapped using the LANGUAGE_MAPPING dictionary.
    """
    try:
        response = requests.get("http://localhost:3000/api/connection-details/settings")
        if response.status_code == 200:
            data = response.json()
            ui_language = data.get("language", "English")
            accent = data.get("accent", "Indian")
            language = LANGUAGE_MAPPING.get(ui_language, "en")
            logger.info(f"Retrieved settings: language={language} (from UI '{ui_language}'), accent={accent}")
            return language, accent
        else:
            logger.error(f"Failed to get settings, status code: {response.status_code}")
    except Exception as e:
        logger.error(f"Error fetching settings: {e}")
    return "en", "Indian"

async def enhance_transcript(text, output_language="en"):
    """
    Enhances transcripts by translating and adjusting accent using GPT-4.
    For user transcriptions, output_language is "en" (English) by default.
    For greetings, output_language can be set to the communication language.
    """
    # Retrieve settings to get the accent (we ignore the language here since output_language is provided)
    _, accent = get_settings()
    prompt = (
        f"Translate and enhance the following text into language code '{output_language}' with a friendly tone and a {accent} accent tone:\n\n{text}"
    )
    try:
        response = await official_openai.ChatCompletion.acreate(
            model="gpt-4",
            messages=[{"role": "system", "content": prompt}],
        )
        return response["choices"][0]["message"]["content"]
    except Exception as e:
        logger.error(f"Error enhancing transcript: {e}")
        return text

def save_transcript():
    """
    Saves the conversation history to a JSON file.
    """
    try:
        with open("conversation_log.json", "w") as f:
            json.dump(conversation_log, f, indent=4)
        logger.info("Conversation saved to conversation_log.json")
    except Exception as e:
        logger.error(f"Failed to save transcript: {e}")

# --- Accent Mapping ---
# Map the friendly accent names (from UI dropdown) to the corresponding Cartesia voice IDs.
ACCENT_MAPPING = {
    "American": "39b376fc-488e-4d0c-8b37-e00b72059fdd",
    "Australian": "c1cfee3d-532d-47f8-8dd2-8e5b2b66bf1d",
    "British": "7cf0e2b1-8daf-4fe4-89ad-f6039398f359",
    "German": "b7187e84-fe22-4344-ba4a-bc013fcb533e",
    "Portuguese": "6a360542-a117-4ed5-9e09-e8bf9b05eabb",
    "Chinese": "c59c247b-6aa9-4ab6-91f9-9eabea7dc69e",
    "Japanese": "e8a863c6-22c7-4671-86ca-91cacffc038d",
    "French": "0418348a-0ca2-4e90-9986-800fb8b3bbc0",
    "Spanish": "79743797-2087-422f-8dc7-86f9efca85f1",
    "Hindi": "9b953e7b-86a8-42f0-b625-1434fb15392b",
    "Italian": "79693aee-1207-4771-a01e-20c393c89e6f",
    "Korean": "af6beeea-d732-40b6-8292-73af0035b740",
    "Dutch": "9e8db62d-056f-47f3-b3b6-1b05767f9176",
    "Polish": "3d335974-4c4a-400a-84dc-ebf4b73aada6",
    "Russian": "f07163ac-559f-43b1-97cc-c6c6504bbb48",
    "Swedish": "0caedb75-417f-4e36-9b64-c21354cb94c8",
    "Turkish": "c1cfee3d-532d-47f8-8dd2-8e5b2b66bf1d",
}

async def entrypoint(ctx: JobContext):
    # Set up the initial system prompt for the assistant
    initial_ctx = llm.ChatContext().append(
        role="system",
        text=(
            "You are a multilingual voice assistant created by LiveKit. Your interface with users will be voice. "
            "Provide short, clear, and concise responses in a friendly manner. You are capable of understanding and conversing "
            "in various languages and accents based on the user's preference. Adapt your tone and phrasing to match the selected "
            "language and accent, ensuring clarity and cultural sensitivity."
        ),
    )

    logger.info(f"Connecting to room {ctx.room.name}")
    # Connect to the room with audio-only subscription
    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)

    participant = await ctx.wait_for_participant()
    logger.info(f"Starting voice assistant for participant {participant.identity}")

    # Retrieve language and accent settings from your API endpoint
    language, ui_accent = get_settings()
    # Map the UI accent to a Cartesia voice ID using the ACCENT_MAPPING dictionary.
    voice_id = ACCENT_MAPPING.get(ui_accent, "default_voice_id")  # Replace with a valid fallback if needed

    # Configure the voice assistant:
    # - STT: Uses the selected language (ISO 639-1 code) for speech recognition.
    # - TTS: Uses the Cartesia plugin with the mapped voice ID.
    agent = VoicePipelineAgent(
        vad=ctx.proc.userdata["vad"],
        stt=livekit_openai.stt.STT(language=language, model="whisper-1"),
        llm=livekit_openai.LLM(model="gpt-4"),
        tts=cartesia.TTS(language=language, voice=voice_id),
        turn_detector=turn_detector.EOUModel(),
        min_endpointing_delay=0.5,
        max_endpointing_delay=5.0,
        chat_ctx=initial_ctx,
    )

    usage_collector = metrics.UsageCollector()

    @agent.on("agent_speech_committed")
    def handle_agent_transcript(data):
        """
        Handles finalized assistant speech by appending the transcript to the conversation log.
        """
        content = data.content
        transcript = (
            content.strip()
            if isinstance(content, str)
            else (content[0].strip() if isinstance(content, list) and content else "")
        )
        timestamp = ""
        if transcript:
            log_entry = {"role": "assistant", "timestamp": timestamp, "text": transcript}
            conversation_log.append(log_entry)
            logger.info(f"Assistant said: {transcript}")
            save_transcript()  # Write immediately

    @agent.on("agent_speech_interrupted")
    def handle_agent_interrupted(data):
        """
        Handles interrupted assistant speech by marking the transcript accordingly and logging it.
        """
        content = data.content
        transcript = (
            content.strip()
            if isinstance(content, str)
            else (content[0].strip() if isinstance(content, list) and content else "")
        )
        timestamp = ""
        if transcript:
            log_entry = {"role": "assistant", "timestamp": timestamp, "text": transcript + " [interrupted]"}
            conversation_log.append(log_entry)
            logger.info(f"Assistant interrupted: {transcript}")
            save_transcript()  # Write immediately

    async def handle_final_transcript(data):
        """
        Processes the final user transcript by first appending the raw transcript for immediate UI feedback,
        then asynchronously enhancing it (translation and accent adjustment) and updating the log entry.
        The output is forced to English.
        """
        transcript = ""
        if hasattr(data, "alternatives") and data.alternatives:
            alt = data.alternatives[0]
            transcript = alt.text.strip() if hasattr(alt, "text") and alt.text else ""
        timestamp = ""
        if transcript:
            # Immediately add the raw transcript so the UI updates quickly.
            log_entry = {"role": "user", "timestamp": timestamp, "text": transcript}
            conversation_log.append(log_entry)
            logger.info(f"User said (raw): {transcript}")
            save_transcript()  # Save after appending raw text

            # Asynchronously enhance the transcript (this may take a few seconds).
            enhanced_text = await enhance_transcript(transcript, output_language="en")
            # Update the log entry with the enhanced transcript.
            log_entry["text"] = enhanced_text
            logger.info(f"User said (enhanced): {enhanced_text}")
            save_transcript()  # Save updated transcript

    # Attach the async final transcript handler via a synchronous wrapper.
    asyncio.create_task(attach_user_final_handler(agent, handle_final_transcript))

    @agent.on("metrics_collected")
    def on_metrics_collected(agent_metrics: metrics.AgentMetrics):
        """
        Handles metrics collection and logging.
        """
        metrics.log_metrics(agent_metrics)
        usage_collector.collect(agent_metrics)

    # Start the voice assistant in the room with the participant.
    agent.start(ctx.room, participant)

    # For greeting, use the communication language selected by the user.
    greeting_text = "Hey, how can I help you today?"
    # Process greeting using the communication language.
    enhanced_greeting = await enhance_transcript(greeting_text, output_language=language)
    await agent.say(enhanced_greeting, allow_interruptions=True)

    try:
        # Keep the process running indefinitely
        while True:
            await asyncio.sleep(1)
    except asyncio.CancelledError:
        pass
    finally:
        # Save the conversation log on exit
        save_transcript()

if __name__ == "__main__":
    cli.run_app(
        WorkerOptions(
            entrypoint_fnc=entrypoint,
            prewarm_fnc=prewarm,
        ),
    )
