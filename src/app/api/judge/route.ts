import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { isJudgeRequest, JudgeResponse } from '@/lib/types'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

export const runtime = 'nodejs'
export const maxDuration = 30

const MODEL = 'claude-sonnet-4-5-20250929'

const JUDGE_SYSTEM = `You are an expert evaluator of LLM prompt quality.
Score the given output on three dimensions, each from 1-5:

- relevance: How relevant is the output to the input question/request?
  1=completely off-topic, 5=perfectly addresses the request
- conciseness: How appropriately concise is the response?
  1=extremely verbose/padded or too brief, 5=ideal length with no waste
- accuracy: How accurate and reliable does the information appear?
  1=contains clear errors or hallucinations, 5=appears accurate and well-grounded

Return ONLY valid JSON in exactly this format:
{
  "relevance": <1-5>,
  "conciseness": <1-5>,
  "accuracy": <1-5>,
  "reasoning": "<one sentence explaining the scores>"
}`

export async function POST(request: NextRequest) {
  const ip = getClientIp(request)
  const { allowed, retryAfterSeconds } = checkRateLimit(ip)
  if (!allowed) {
    return Response.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } }
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!isJudgeRequest(body)) {
    return Response.json(
      { error: 'Invalid request. Required: prompt (string), input (string), output (string)' },
      { status: 400 }
    )
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return Response.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 })
  }

  const client = new Anthropic({ apiKey })

  const userMessage = `Prompt used: "${body.prompt}"

User input: "${body.input}"

Model output to evaluate: "${body.output}"`

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 256,
      system: JUDGE_SYSTEM,
      messages: [{ role: 'user', content: userMessage }],
    })

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((b) => b.text)
      .join('')

    const parsed = JSON.parse(text) as JudgeResponse

    // Clamp scores to 1-5
    const result: JudgeResponse = {
      relevance: Math.max(1, Math.min(5, Math.round(parsed.relevance))),
      conciseness: Math.max(1, Math.min(5, Math.round(parsed.conciseness))),
      accuracy: Math.max(1, Math.min(5, Math.round(parsed.accuracy))),
      reasoning: parsed.reasoning || '',
    }

    return Response.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Judge scoring failed'
    return Response.json({ error: message }, { status: 500 })
  }
}

