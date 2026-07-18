import { Router, type IRouter } from "express";
import OpenAI from "openai";
import { RefineNoteBody, RefineNoteResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.post("/refine-note", async (req, res): Promise<void> => {
  const parsed = RefineNoteBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    res.status(503).json({ error: "AI note refinement is not configured. Please add an OPENAI_API_KEY secret." });
    return;
  }

  const openai = new OpenAI({ apiKey });

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    max_tokens: 1024,
    messages: [
      {
        role: "system",
        content: `You are a helpful assistant that refines messy, informal, or broken-English notes into clean, professional, well-structured English. 
Rules:
- Preserve all the facts, numbers, dates, and meaning from the original note
- Fix grammar, spelling, and sentence structure
- Convert regional expressions or informal language into clear English
- Keep it concise — do not add fluff or assumptions
- Output ONLY the refined note text, nothing else. No preamble, no explanation.`,
      },
      {
        role: "user",
        content: parsed.data.rawText,
      },
    ],
  });

  const refinedText = completion.choices[0]?.message?.content?.trim() ?? parsed.data.rawText;

  res.json(RefineNoteResponse.parse({ refinedText }));
});

export default router;
