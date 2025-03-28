// app/api/connection-details/settings/route.ts
import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

// Define the file path for storing settings. Adjust this if needed.
const settingsFilePath = path.join(process.cwd(), "settings.json");
console.log("Settings file path:", settingsFilePath); // For debugging

// GET: Return current accent and language settings.
export async function GET() {
  try {
    const data = await fs.readFile(settingsFilePath, "utf8");
    const settings = JSON.parse(data);
    return NextResponse.json(settings, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Error reading settings:", error);
    // If the file doesn't exist or an error occurs, return default settings.
    return NextResponse.json({ accent: "Indian", language: "English" });
  }
}

// POST: Update the current accent and language settings.
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { accent, language } = body;
    if (typeof accent !== "string" || typeof language !== "string") {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    const newSettings = { accent, language };
    await fs.writeFile(settingsFilePath, JSON.stringify(newSettings, null, 2), "utf8");
    console.log("Updated settings:", newSettings);
    return NextResponse.json(newSettings, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Error updating settings:", error);
    return NextResponse.error();
  }
}
