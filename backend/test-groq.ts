import { OpenAI } from "openai";
import dotenv from "dotenv";
dotenv.config();

async function test() {
  const groqClient = new OpenAI({
    baseURL: 'https://api.groq.com/openai/v1',
    apiKey: process.env.GROQ_API_KEY,
    timeout: 30_000,
  });

  const prompt = `You are a content moderation expert for an enterprise social media governance platform.

Generate a comprehensive keyword list for automated content filtering.

Topic to generate keywords for: "test"
Action type: BLOCK — focus on clearly harmful, offensive, or strictly policy-violating terms.


Requirements:
- Up to 30 unique, lowercase keywords or short phrases
- Include: direct terms, common misspellings, slang, abbreviations, leet-speak variants, 2-3 word phrases
- Cover regional/cultural variants where relevant
- Be smart and comprehensive — think how real people write this content online
- Exclude any already-existing keywords listed above

Return ONLY a valid JSON array with no explanation:
["keyword1", "keyword2", ...]`;

  try {
    const completion = await groqClient.chat.completions.create({
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.4,
      max_tokens: 600,
    });
    console.log(completion.choices[0]?.message?.content);
  } catch (error) {
    console.error("ERROR:", error.message);
  }
}

test();
