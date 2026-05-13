export function getAIConfig() {
  const baseUrl = process.env.AI_BASE_URL;
  const apiKey = process.env.AI_API_KEY;
  const modelName = process.env.AI_MODEL_NAME;

  if (!baseUrl || !apiKey || !modelName) {
    throw new Error(
      "AI 配置缺失。请在 .env.local 中设置 AI_BASE_URL、AI_API_KEY、AI_MODEL_NAME"
    );
  }

  return { baseUrl, apiKey, modelName };
}
