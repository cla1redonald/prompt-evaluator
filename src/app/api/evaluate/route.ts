import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { isEvaluateRequest } from '@/lib/types'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

export const runtime = 'nodejs'
export const maxDuration = 120

const MODEL = 'claude-sonnet-4-5-20250929'

export async function POST(request: NextRequest) {
  const ip = getClientIp(request)
  const { allowed, retryAfterSeconds } = checkRateLimit(ip)
  if (!allowed) {
    return new Response(
      JSON.stringify({ error: 'Too many requests. Please try again later.' }),
      { status: 429, headers: { 'Content-Type': 'application/json', 'Retry-After': String(retryAfterSeconds) } }
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (!isEvaluateRequest(body)) {
    return new Response(
      JSON.stringify({
        error:
          'Invalid request. Required: promptA (string), promptB (string), testCases (array of 1-10 items with id, name, input)',
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const { promptA, promptB, systemContext, testCases } = body

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const client = new Anthropic({ apiKey })

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()

      function send(data: object) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      const total = testCases.length * 2
      let completed = 0

      send({ type: 'progress', completed, total })

      for (const testCase of testCases) {
        for (const variant of ['A', 'B'] as const) {
          const prompt = variant === 'A' ? promptA : promptB

          const startTime = Date.now()
          try {
            const messages: Anthropic.MessageParam[] = [
              { role: 'user', content: testCase.input },
            ]

            const systemParts: string[] = []
            if (systemContext) systemParts.push(systemContext)
            systemParts.push(prompt)
            const system = systemParts.join('\n\n')

            const response = await client.messages.create({
              model: MODEL,
              max_tokens: 1024,
              system,
              messages,
            })

            const latencyMs = Date.now() - startTime
            const output =
              response.content
                .filter((block): block is Anthropic.TextBlock => block.type === 'text')
                .map((block) => block.text)
                .join('') || ''

            const tokens = {
              input: response.usage.input_tokens,
              output: response.usage.output_tokens,
            }

            completed++
            send({
              type: 'result',
              testCaseId: testCase.id,
              prompt: variant,
              output,
              tokens,
              latencyMs,
            })
            send({ type: 'progress', completed, total })
          } catch (err) {
            const message = err instanceof Error ? err.message : 'Unknown error'
            send({
              type: 'error',
              testCaseId: testCase.id,
              prompt: variant,
              message,
            })
            completed++
            send({ type: 'progress', completed, total })
          }
        }
      }

      send({ type: 'done' })
      controller.enqueue(encoder.encode('data: [DONE]\n\n'))
      controller.close()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}

