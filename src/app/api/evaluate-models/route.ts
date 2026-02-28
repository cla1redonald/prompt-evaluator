import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { isEvaluateModelsRequest, ModelId, SUPPORTED_MODELS } from '@/lib/types'

export const runtime = 'nodejs'
export const maxDuration = 120

interface ModelResult {
  modelId: ModelId
  output: string
  tokens: { input: number; output: number }
  latencyMs: number
  error?: string
}

async function callAnthropic(
  modelId: ModelId,
  apiModel: string,
  system: string,
  input: string,
  apiKey: string
): Promise<ModelResult> {
  const client = new Anthropic({ apiKey })
  const start = Date.now()
  const response = await client.messages.create({
    model: apiModel,
    max_tokens: 1024,
    system,
    messages: [{ role: 'user', content: input }],
  })
  const latencyMs = Date.now() - start
  const output =
    response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((b) => b.text)
      .join('') || ''
  return {
    modelId,
    output,
    tokens: { input: response.usage.input_tokens, output: response.usage.output_tokens },
    latencyMs,
  }
}

async function callOpenAI(
  modelId: ModelId,
  apiModel: string,
  system: string,
  input: string,
  apiKey: string
): Promise<ModelResult> {
  const openai = new OpenAI({ apiKey })
  const start = Date.now()
  const response = await openai.chat.completions.create({
    model: apiModel,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: input },
    ],
    max_tokens: 1024,
  })
  const latencyMs = Date.now() - start
  const output = response.choices[0]?.message?.content || ''
  return {
    modelId,
    output,
    tokens: {
      input: response.usage?.prompt_tokens ?? 0,
      output: response.usage?.completion_tokens ?? 0,
    },
    latencyMs,
  }
}

async function callGemini(
  modelId: ModelId,
  apiModel: string,
  system: string,
  input: string,
  apiKey: string
): Promise<ModelResult> {
  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({ model: apiModel, systemInstruction: system })
  const start = Date.now()
  const result = await model.generateContent(input)
  const latencyMs = Date.now() - start
  const output = result.response.text() || ''
  const usage = result.response.usageMetadata
  return {
    modelId,
    output,
    tokens: {
      input: usage?.promptTokenCount ?? 0,
      output: usage?.candidatesTokenCount ?? 0,
    },
    latencyMs,
  }
}

async function callModel(
  modelId: ModelId,
  system: string,
  input: string,
  anthropicKey: string,
  openaiKey: string,
  googleKey: string
): Promise<ModelResult & { modelId: ModelId }> {
  const modelInfo = SUPPORTED_MODELS.find((m) => m.id === modelId)
  if (!modelInfo) throw new Error(`Unknown model: ${modelId}`)

  if (modelInfo.provider === 'Anthropic') {
    return callAnthropic(modelId, modelInfo.apiModel, system, input, anthropicKey)
  } else if (modelInfo.provider === 'OpenAI') {
    return callOpenAI(modelId, modelInfo.apiModel, system, input, openaiKey)
  } else {
    return callGemini(modelId, modelInfo.apiModel, system, input, googleKey)
  }
}

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (!isEvaluateModelsRequest(body)) {
    return new Response(
      JSON.stringify({
        error:
          'Invalid request. Required: prompt (string), models (array of 2-3 valid model IDs), testCases (array of 1-10 items)',
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const { prompt, systemContext, models, testCases } = body

  const anthropicKey = process.env.ANTHROPIC_API_KEY
  if (!anthropicKey) {
    return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const openaiKey = process.env.OPENAI_API_KEY ?? ''
  const googleKey = process.env.GOOGLE_AI_API_KEY ?? ''

  // Validate API keys for selected models
  const missingKeys: string[] = []
  for (const modelId of models) {
    const modelInfo = SUPPORTED_MODELS.find((m) => m.id === modelId)
    if (!modelInfo) continue
    if (modelInfo.provider === 'OpenAI' && !openaiKey) missingKeys.push('OPENAI_API_KEY')
    if (modelInfo.provider === 'Google' && !googleKey) missingKeys.push('GOOGLE_AI_API_KEY')
  }
  if (missingKeys.length > 0) {
    return new Response(
      JSON.stringify({ error: `Missing API keys: ${[...new Set(missingKeys)].join(', ')}` }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()

      function send(data: object) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      const total = testCases.length * models.length
      let completed = 0

      send({ type: 'progress', completed, total })

      for (const testCase of testCases) {
        const systemParts: string[] = []
        if (systemContext) systemParts.push(systemContext)
        systemParts.push(prompt)
        const system = systemParts.join('\n\n')

        const modelPromises = models.map((modelId) =>
          callModel(modelId, system, testCase.input, anthropicKey, openaiKey, googleKey)
            .then((result) => ({ ...result, testCase, error: undefined }))
            .catch((err) => ({
              modelId,
              output: '',
              tokens: { input: 0, output: 0 },
              latencyMs: 0,
              testCase,
              error: err instanceof Error ? err.message : 'Unknown error',
            }))
        )

        const settledResults = await Promise.allSettled(modelPromises)

        for (const settled of settledResults) {
          if (settled.status === 'fulfilled') {
            const r = settled.value
            if (r.error) {
              send({
                type: 'error',
                testCaseId: testCase.id,
                modelId: r.modelId,
                message: r.error,
              })
            } else {
              send({
                type: 'result',
                testCaseId: testCase.id,
                modelId: r.modelId,
                output: r.output,
                tokens: r.tokens,
                latencyMs: r.latencyMs,
              })
            }
          } else {
            send({
              type: 'error',
              testCaseId: testCase.id,
              message: settled.reason?.message ?? 'Unknown error',
            })
          }
          completed++
          send({ type: 'progress', completed, total })
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
