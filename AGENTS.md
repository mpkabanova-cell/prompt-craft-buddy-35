<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting published git history.
<!-- LOVABLE:END -->

- Keep the sixth-grade mathematics reference as generated JSON from the uploaded spreadsheet; this prevents rereading Excel for each request.
- Keep the full approved methodology prompt and AI request in server-only modules; this protects the prompt/key and lets server-side validation reject malformed plans.
- Use TanStack Start server functions for one-shot lesson generation; this is the app's internal request boundary.
- Rank lessons from the configurable academic calendar without filtering any lesson out; teachers retain access to the complete syllabus.
- Count actual Monday–Friday teaching dates outside inclusive vacation ranges, with the first-grade break scoped to grade 1; this keeps partial holiday weeks and subject lesson load accurate.
- Use the server-held PENROUTER_API_KEY with OpenRouter Claude Sonnet 4.5 for streamed one-shot lesson generation and reject any plan whose stage durations do not total exactly 45 minutes; this protects the key and prevents invalid plans from reaching teachers.
- Derive control-work display titles from the reference section without changing lessonTopic; this preserves exact source matching while making titles meaningful in the UI and downloads.
- Pass the full passed-lesson list, forbidden future concepts, series position and digests of earlier series plans (stored server-only in lesson_plan_digests) to generation, and reject plans failing the context checks; this prevents repeated tasks and knowledge from later lessons.
