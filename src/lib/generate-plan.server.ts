import { lessons } from './lesson-data';
import { stagesByType, validateLessonPlan, type Plan } from './lesson-plan';
import { LESSON_PLAN_SYSTEM_PROMPT } from './lesson-prompt.server';
import { createLessonGateway } from './lesson-gateway.server';

export async function generatePlan(lessonNumber: number): Promise<Plan> {
  const lesson = lessons.find(l => l.lessonNumber === lessonNumber);
  if (!lesson) throw new Error('Урок не найден');
  const index = lessons.indexOf(lesson);
  const context = {currentDate: new Date().toISOString().slice(0,10), subject:'Математика', grade:'6 класс', lesson, previousLesson:lessons[index-1] ?? null, previousLesson2:lessons[index-2] ?? null, nextLesson:lessons[index+1] ?? null, nextLesson2:lessons[index+2] ?? null};
  const apiKey = process.env['PENROUTER_API_KEY'];
  if (!apiKey) throw new Error('Сервис генерации временно недоступен');
  const stageSpec = stagesByType[lesson.lessonType];
  if (!stageSpec || stageSpec.minutes.reduce((sum, minutes) => sum + minutes, 0) !== 45) throw new Error('Ошибка настройки времени урока');
  const gateway = createLessonGateway(apiKey);
  let correction = '';
  for (let attempt=0; attempt<2; attempt++) {
    const system = LESSON_PLAN_SYSTEM_PROMPT + '\n\nДля одного выбранного урока верни только один JSON-объект плана из массива plans раздела 31, без оболочки format/source/plans и без markdown-ограждений. Все обязательные содержательные строки заполни. Названия этапов и минуты точно соответствуют указанному ниже списку. Цель воспроизведи дословно. Не используй HTML. Не придумывай новые понятия. Если тип урока не входит в четыре перечисленных в промпте, следуй дополнительной схеме из входных данных. Каждый урок длится ровно 45 минут: перед ответом сложи durationMinutes всех этапов, сумма обязана быть 45; сумма также должна совпадать с lesson.durationMinutes. Верни полноценные конкретные задания, решения и ответы в содержании. Излагай компактно, чтобы закончить JSON без обрыва.';
    const raw = await gateway.stream(system, JSON.stringify({...context, requiredStages:stageSpec, correction}));
    if (!raw) throw new Error('Пустой ответ генератора');
    let plan: Plan;
    let cleaned = '';
    try {
      cleaned = raw.replace(/^```(?:json)?\s*|\s*```$/g,'').replace(/\\+(?=(?:frac|dfrac|tfrac|cdot|times|div|left|right|text|operatorname|neq|leq|geq|sqrt|overline|begin|end|\(|\)|\[|\]))/g, '\\\\').replace(/(?<!\\)\\(?!["\\/bfnrtu])/g, '\\\\');
      const parsed = JSON.parse(cleaned) as Plan & {plans?: Plan[]};
      plan = parsed.plans?.[0] ?? parsed;
    }
    catch (error) { const pos = Number(String(error).match(/position (\d+)/)?.[1]); console.warn('Invalid response', attempt, raw.length, String(error), Number.isFinite(pos) ? cleaned.slice(Math.max(0,pos-50),pos+50) : ''); correction = 'Ответ не был корректным JSON или оборвался. Все обратные слэши в LaTeX должны быть удвоены для корректного JSON. Верни один законченный объект.'; continue; }
    const errors = validateLessonPlan(plan,lesson);
    if (errors.length === 0) return plan;
    console.warn('Validation', attempt, errors);
    correction = `Исправь ошибки предыдущей генерации: ${errors.join('; ')}. Повтори генерацию целиком.`;
  }
  throw new Error('Не удалось проверить готовый план');
}
