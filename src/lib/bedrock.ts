import {
  BedrockRuntimeClient,
  ConverseCommand,
  ConverseStreamCommand,
} from "@aws-sdk/client-bedrock-runtime";

/**
 * Bedrock Model ID Mapping
 */
export const BEDROCK_MODELS = {
  "claude-3-5-sonnet": "anthropic.claude-3-5-sonnet-20241022-v2:0",
  "claude-3-5-haiku": "anthropic.claude-3-5-haiku-20241022-v1:0",
  "llama-3-3-70b": "meta.llama3-3-70b-instruct-v1:0",
  "nova-pro": "amazon.nova-pro-v1:0",
  "nova-lite": "amazon.nova-lite-v1:0",
} as const;

export type BedrockModelKey = keyof typeof BEDROCK_MODELS;

let _bedrockClient: BedrockRuntimeClient | null = null;

function getBedrockClient(): BedrockRuntimeClient {
  if (!_bedrockClient) {
    _bedrockClient = new BedrockRuntimeClient({
      region: process.env.AWS_REGION || "us-east-1",
      credentials: process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
        ? {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
          }
        : undefined, // Defaults to EC2 IAM Role automatically if env keys are not provided!
    });
  }
  return _bedrockClient;
}

/**
 * Single-turn or multi-turn Bedrock completion via Converse API
 */
export async function generateBedrockCompletion(options: {
  modelId?: string;
  systemPrompt?: string;
  userMessage?: string;
  messages?: { role: "user" | "assistant"; content: string }[];
  maxTokens?: number;
  temperature?: number;
}): Promise<string> {
  const client = getBedrockClient();
  const targetModel = options.modelId || BEDROCK_MODELS["claude-3-5-sonnet"];

  const converseMessages = options.messages?.length
    ? options.messages.map((m) => ({
        role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
        content: [{ text: m.content }],
      }))
    : [
        {
          role: "user" as const,
          content: [{ text: options.userMessage || "" }],
        },
      ];

  const command = new ConverseCommand({
    modelId: targetModel,
    system: options.systemPrompt ? [{ text: options.systemPrompt }] : undefined,
    messages: converseMessages,
    inferenceConfig: {
      temperature: options.temperature ?? 0.7,
      maxTokens: options.maxTokens ?? 1024,
    },
  });

  const response = await client.send(command);
  const text = response.output?.message?.content?.[0]?.text;
  if (!text) {
    throw new Error(`[Bedrock] No text returned from model ${targetModel}`);
  }
  return text;
}

/**
 * Live streaming completion via Bedrock ConverseStream API
 */
export async function streamBedrockCompletion(
  options: {
    modelId?: string;
    systemPrompt?: string;
    userMessage?: string;
    messages?: { role: "user" | "assistant"; content: string }[];
    maxTokens?: number;
    temperature?: number;
  },
  onChunk: (delta: string) => void
): Promise<void> {
  const client = getBedrockClient();
  const targetModel = options.modelId || BEDROCK_MODELS["claude-3-5-sonnet"];

  const converseMessages = options.messages?.length
    ? options.messages.map((m) => ({
        role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
        content: [{ text: m.content }],
      }))
    : [
        {
          role: "user" as const,
          content: [{ text: options.userMessage || "" }],
        },
      ];

  const command = new ConverseStreamCommand({
    modelId: targetModel,
    system: options.systemPrompt ? [{ text: options.systemPrompt }] : undefined,
    messages: converseMessages,
    inferenceConfig: {
      temperature: options.temperature ?? 0.7,
      maxTokens: options.maxTokens ?? 2048,
    },
  });

  const response = await client.send(command);

  if (response.stream) {
    for await (const chunk of response.stream) {
      if (chunk.contentBlockDelta?.delta?.text) {
        onChunk(chunk.contentBlockDelta.delta.text);
      }
    }
  }
}

/**
 * Creates a ReadableStream for streaming Bedrock completions in Next.js Route Handlers
 */
export async function streamBedrockToReadableStream(options: {
  modelId?: string;
  systemPrompt?: string;
  userMessage?: string;
  messages?: { role: "user" | "assistant"; content: string }[];
  maxTokens?: number;
  temperature?: number;
}): Promise<ReadableStream<Uint8Array>> {
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        await streamBedrockCompletion(options, (delta) => {
          controller.enqueue(new TextEncoder().encode(delta));
        });
      } finally {
        controller.close();
      }
    },
  });
}

