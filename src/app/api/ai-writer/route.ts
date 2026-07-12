import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Pastikan inisialisasi API Key aman di sisi server
const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: Request) {
  try {
    const { topic, tone, length, lang } = await req.json();

    if (!topic) {
      return NextResponse.json({ error: "Topic is required" }, { status: 400 });
    }

    // Gunakan model Gemini 1.5 Flash yang gratis, ringan, dan cepat
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // Menyusun prompt instruksi agar AI menulis deskripsi produk Modesy yang pas
    const prompt = `
      You are an expert copywriter for an online e-commerce marketplace named Modesy.
      Write a professional product description based on the following details:
      - Topic/Product Name: ${topic}
      - Tone/Style: ${tone}
      - Content Length: ${length}
      - Language: ${lang === "id" ? "Indonesian" : "English"}

      Requirements:
      1. Return the output STRICTLY as clean HTML blocks (e.g., use <p>, <strong>, <ul>, <li>) without wrapping it in markdown code blocks (\`\`\`html).
      2. Make it attractive, informative, and SEO-friendly for buyers.
    `;

    const result = await model.generateContent(prompt);
    const textOutput = result.response.text();

    return NextResponse.json({ text: textOutput });
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    return NextResponse.json({ error: error.message || "AI Generation failed" }, { status: 500 });
  }
}