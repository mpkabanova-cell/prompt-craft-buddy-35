CREATE TABLE public.lesson_plan_digests (lesson_number INT PRIMARY KEY, digest JSONB NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT now());
GRANT ALL ON public.lesson_plan_digests TO service_role;
ALTER TABLE public.lesson_plan_digests ENABLE ROW LEVEL SECURITY;