import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

/**
 * Generate an AI auto-reply based on conversation history
 */
export async function generateAutoReply(conversationHistory, senderName, customContext = "") {
  try {
    const context = customContext
      ? `The user has set this auto-reply context: "${customContext}". `
      : "";

    const prompt = `You are an AI auto-reply assistant for a chat app. ${context}The user is currently unavailable. Generate a brief, friendly, and contextual auto-reply to the last message. Keep it under 2 sentences. Be natural and conversational, not robotic.

Recent conversation:
${conversationHistory}

Last message was from: ${senderName}
Generate a reply:`;

    const result = await model.generateContent(prompt);
    const response = result.response.text();
    return response.trim();
  } catch (error) {
    console.error("Error generating auto-reply:", error.message);
    return "Thanks for your message! I'm currently unavailable but will get back to you soon. 🤖";
  }
}

/**
 * Summarize a chat conversation
 */
export async function summarizeChat(messages) {
  try {
    const chatText = messages
      .map((m) => `${m.senderName}: ${m.text || "[image]"}`)
      .join("\n");

    const prompt = `Summarize this chat conversation in 3-5 concise bullet points. Focus on key topics discussed, decisions made, and action items. Be brief and clear.

Conversation:
${chatText}

Summary:`;

    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch (error) {
    console.error("Error summarizing chat:", error.message);
    return "Unable to generate summary at this time.";
  }
}

/**
 * Detect if a message is spam
 */
export async function detectSpam(text) {
  try {
    // Quick regex checks first (fast path)
    const spamPatterns = [
      /(.)\1{9,}/i, // 10+ repeated characters
      /(https?:\/\/[^\s]+\s*){3,}/i, // 3+ URLs in one message
      /\b(buy now|free money|click here|won a prize|lottery|nigerian prince)\b/i,
    ];

    for (const pattern of spamPatterns) {
      if (pattern.test(text)) return true;
    }

    // For borderline cases, use AI
    if (text.length > 200 || /https?:\/\//i.test(text)) {
      const prompt = `Is this message spam? Reply with only "yes" or "no".
Message: "${text.substring(0, 500)}"`;

      const result = await model.generateContent(prompt);
      const answer = result.response.text().trim().toLowerCase();
      return answer.includes("yes");
    }

    return false;
  } catch (error) {
    console.error("Error detecting spam:", error.message);
    return false; // Don't block messages on AI failure
  }
}

/**
 * Translate text to a target language
 */
export async function translateText(text, targetLanguage) {
  try {
    const prompt = `Translate the following text to ${targetLanguage}. Return ONLY the translated text, nothing else.

Text: "${text}"`;

    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch (error) {
    console.error("Error translating text:", error.message);
    return "Translation failed.";
  }
}
