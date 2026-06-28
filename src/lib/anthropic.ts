import Anthropic from "@anthropic-ai/sdk";

if (!process.env.ANTHROPIC_API_KEY) {
  // Don't throw at import time in dev — surface a clear error when the agent is actually called.
  console.warn("ANTHROPIC_API_KEY is not set. The AI agent endpoints will fail until it is configured.");
}

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Anthropic's most capable model. See claude-api skill for the current model table.
export const MODEL = "claude-opus-4-8";
