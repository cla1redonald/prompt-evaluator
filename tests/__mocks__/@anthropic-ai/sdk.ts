export default class Anthropic {
  messages = {
    create: async () => ({
      content: [{ type: 'text', text: '{"relevance":4,"conciseness":4,"accuracy":4,"reasoning":"Mock"}' }],
      usage: { input_tokens: 10, output_tokens: 20 },
    }),
  }
}

export type TextBlock = { type: 'text'; text: string }
export type MessageParam = { role: string; content: string }
