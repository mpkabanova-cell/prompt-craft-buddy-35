import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';

export const generateLessonPlan = createServerFn({method:'POST'})
  .validator((data: unknown) => z.object({lessonNumber:z.number().int().min(1).max(170)}).parse(data))
  .handler(async ({data}) => {
    const {generatePlan} = await import('./generate-plan.server');
    return generatePlan(data.lessonNumber);
  });
