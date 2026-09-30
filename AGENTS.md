<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting published git history.
<!-- LOVABLE:END -->

- Keep the sixth-grade mathematics reference as generated JSON from the uploaded spreadsheet; this prevents rereading Excel for each request.
- Keep the full approved methodology prompt and AI request in server-only modules; this protects the prompt/key and lets server-side validation reject malformed plans.
- Use TanStack Start server functions for one-shot lesson generation; this is the app's internal request boundary.
- Rank lessons from the configurable academic calendar without filtering any lesson out; teachers retain access to the complete syllabus.
