# Prompt Evaluator

**A/B test your prompts — compare variants side-by-side across test cases with auto-scored quality dimensions.**

Built for prompt engineers and product teams who want to make evidence-based decisions when tuning LLM prompts. Paste two prompt variants, define test cases, run them against Claude, and see scored results side-by-side.

---

## Features

1. **Side-by-side prompt editors** — Write Prompt A and Prompt B with character counts, optional system context, and `{{variable}}` syntax highlighting
2. **Flexible test cases** — Define 1-10 test cases with names and input messages; reorder with up/down arrows
3. **Streaming evaluation** — Runs both prompts against all test cases with real-time progress (`Running 3/10...`) and cancellation support
4. **Results grid** — Compare outputs with latency, token counts, and expandable full-text view for each response
5. **Auto-scoring** — A judge LLM automatically scores each output on Relevance, Conciseness, and Accuracy (1-5 each)
6. **Evaluation history** — All runs saved to localStorage; view, export, or delete past evaluations

---

## Quick Start

```bash
# 1. Clone the repo
git clone https://github.com/cla1redonald/prompt-evaluator.git
cd prompt-evaluator

# 2. Install dependencies
npm install

# 3. Add your API key
cp .env.example .env.local
# Edit .env.local and set ANTHROPIC_API_KEY=sk-ant-your-key-here

# 4. Run the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## How It Works

```
Write prompts  ->  Define test cases  ->  Run evaluation  ->  Compare results
```

1. **Write prompts** — Enter Prompt A and Prompt B in the side-by-side editors. Optionally add a shared system context that applies to both. Use `{{variable}}` notation to document dynamic slots.

2. **Define test cases** — Add up to 10 test cases. Each test case has a name and an input message (what the user would send). Reorder them with the arrow buttons.

3. **Run evaluation** — Click "Run Evaluation". The app sends each prompt x test case combination to Claude and streams results back as they complete. You can cancel at any time.

4. **Compare results** — Review outputs side-by-side with latency and token counts. Rate each output manually (thumbs up/down) or let auto-scoring do it.

---

## Auto-Scoring

After evaluation completes, a second LLM call scores each output on three dimensions:

| Dimension | What it measures | Scale |
|-----------|-----------------|-------|
| **Relevance** | How well the output addresses the input | 1-5 |
| **Conciseness** | Whether the length is appropriate (not too verbose, not too brief) | 1-5 |
| **Accuracy** | How accurate and well-grounded the information appears | 1-5 |

Scores are combined to determine a winner per test case. You can also override with manual thumbs up/down ratings.

The judge uses `claude-sonnet-4-5-20250929` with a structured scoring prompt that returns JSON. Scores are clamped to 1-5 and displayed inline in the results grid.

---

## Why I Built This

Prompt engineering is one of the most underrated product skills in the AI era. Small wording changes — being more directive, adding examples, adjusting tone — can dramatically change output quality. But without a structured way to compare variants, most teams make these decisions based on vibes and a handful of manual tests.

I wanted a tool that brings the rigor of A/B testing to prompt development: define your test cases, run both variants, see the data. The auto-scoring feature means you don't have to manually review every output — you get a signal immediately, even if it's imperfect.

This is the kind of tool I wished existed when working on AI product features and spending hours in a notebook trying to decide which system prompt was better.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| LLM | Anthropic Claude (`claude-sonnet-4-5-20250929`) |
| Testing | Vitest |
| Storage | localStorage (client-side) |
| Deployment | Vercel |

---

## Project Structure

```
src/
  app/
    page.tsx              Main evaluation page
    layout.tsx            Root layout
    api/
      evaluate/route.ts   Evaluation endpoint (SSE streaming)
      judge/route.ts      Auto-scoring endpoint
  components/
    PromptEditor.tsx       Side-by-side prompt editors
    TestCaseList.tsx        Test case management
    ResultsGrid.tsx         Results comparison table
    ResultCell.tsx          Individual result with scores
    HistoryPanel.tsx        Evaluation history
    ExportButton.tsx        CSV/JSON export
  lib/
    types.ts               TypeScript interfaces + type guards + validation
    storage.ts             localStorage wrapper
    export.ts              CSV/JSON export utilities
  hooks/
    useEvaluation.ts       Evaluation state + SSE handling
    useHistory.ts          History CRUD
tests/
  types.test.ts            Type validation (27 tests)
  storage.test.ts          localStorage operations (13 tests)
  export.test.ts           CSV/JSON generation (11 tests)
  evaluate-api.test.ts     API input validation (18 tests)
  judge-api.test.ts        Judge scoring validation (15 tests)
```

---

## Development

```bash
npm run dev      # Start dev server
npm test         # Run tests (84 tests via Vitest)
npm run build    # Production build
npm run lint     # Lint check
```

---

## License

MIT
