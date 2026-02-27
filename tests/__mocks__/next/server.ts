export class NextRequest {
  constructor(public url: string, public init?: RequestInit) {}
  async json() {
    return {}
  }
}

export class NextResponse {
  static json(data: unknown, init?: ResponseInit) {
    return new Response(JSON.stringify(data), {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
    })
  }
}
