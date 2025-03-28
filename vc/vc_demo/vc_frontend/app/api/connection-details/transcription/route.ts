import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export const revalidate = 0;

export async function GET() {
  try {
    // Log the working directory for debugging
    console.log("API route process.cwd():", process.cwd());
    
    // Adjust this path based on your file's actual location.
    // For example, if your conversation_log.json is located in vc_demo folder,
    // update the path accordingly.
    const filePath = path.join(process.cwd(), "..", "conversation_log.json");
    // console.log("Resolved file path:", filePath);

    // Check if conversation_log.json exists
    try {
      await fs.access(filePath);
    } catch (err) {
      return NextResponse.json(
        { message: "No conversation log available." },
        { status: 404 }
      );
    }

    const fileContents = await fs.readFile(filePath, "utf8");
    const data = JSON.parse(fileContents);
    return NextResponse.json(data, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Error reading conversation_log.json:", error);
    return NextResponse.error();
  }
}
