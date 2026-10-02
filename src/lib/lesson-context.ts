import { lessons, type Lesson } from './lesson-data';
import type { Plan } from './lesson-plan';

export type PlanDigest = { lessonNumber: number; tasks: string[]; signatures: string[] };

const brief = (l: Lesson) => ({ n: l.lessonNumber, topic: l.lessonTopic, type: l.lessonType, unit: l.unitTopic, concepts: [...l.keyConcepts, ...l.newConcepts] });

/** Concepts that must not appear before the lesson where the reference introduces them. */
const conceptGates: { pattern: RegExp; from: number; label: string }[] = [
  { pattern: /\\sqrt|квадратн\S* кор|извлеч\S* кор/i, from: 9999, label: 'квадратный корень' },
  { pattern: /пропорци/i, from: 79, label: 'пропорция' },
  { pattern: /отрицательн\S* чис/i, from: 97, label: 'отрицательные числа' },
  { pattern: /координатн\S* (?:прям|плоскост)/i, from: 97, label: 'координаты' },
  { pattern: /модул\S* числа/i, from: 101, label: 'модуль числа' },
];

export function buildLessonContext(lesson: Lesson, digests: PlanDigest[]) {
  const idx = lessons.indexOf(lesson);
  const series = lessons.filter(l => l.unitTopic === lesson.unitTopic && l.lessonType !== 'урок контроля');
  const seriesIndex = series.findIndex(l => l.lessonNumber === lesson.lessonNumber);
  const isControl = lesson.lessonType === 'урок контроля';
  const passed = lessons.slice(0, idx);
  const sectionLessons = isControl ? series.filter(l => l.lessonNumber < lesson.lessonNumber).map(brief) : undefined;
  return {
    passedLessons: passed.map(l => `${l.lessonNumber}. ${l.lessonTopic} (${l.lessonType})`),
    futureLessonsForbidden: lessons.slice(idx + 1, idx + 16).map(l => `${l.lessonNumber}. ${l.lessonTopic}`),
    forbiddenConcepts: conceptGates.filter(g => lesson.lessonNumber < g.from).map(g => g.label),
    seriesPosition: seriesIndex >= 0 ? `урок ${seriesIndex + 1} из ${series.length} по теме «${lesson.unitTopic}»` : null,
    seriesLessons: series.map(brief),
    sectionLessons,
    previousSeriesTasks: digests.filter(d => d.lessonNumber < lesson.lessonNumber).map(d => ({ lesson: d.lessonNumber, tasks: d.tasks })),
  };
}

const numbersOf = (s: string) => (s.match(/\d+/g) ?? []).filter(n => n.length > 0);

function extractTasks(plan: Plan): string[] {
  const text = [plan.lessonContent?.content ?? '', ...(plan.lessonStages ?? []).map(s => s.content)].join('\n');
  const quoted = [...text.matchAll(/«([^»]{25,400})»/g)].map(m => m[1]!);
  const labelled = [...text.matchAll(/\*\*(?:Задача|Задание)[^*]*\*\*\s*([^\n]{20,400})/g)].map(m => m[1]!);
  return [...new Set([...quoted, ...labelled].map(t => t.replace(/\s+/g, ' ').trim()))].slice(0, 30);
}

const signature = (task: string) => { const n = numbersOf(task); return n.length >= 3 ? [...n].sort().join(',') : ''; };

export function makeDigest(plan: Plan, lessonNumber: number): PlanDigest {
  const tasks = extractTasks(plan);
  return { lessonNumber, tasks: tasks.map(t => t.slice(0, 160)), signatures: tasks.map(signature).filter(Boolean) };
}

/** Extra methodical checks; each message is sent back to the model as a correction. */
export function checkAgainstContext(plan: Plan, lesson: Lesson, digests: PlanDigest[]): string[] {
  const errors: string[] = [];
  const all = JSON.stringify(plan);
  for (const g of conceptGates) if (lesson.lessonNumber < g.from && g.pattern.test(all)) errors.push(`Используется ещё не изученное понятие: ${g.label}`);
  const body = [plan.lessonContent?.content ?? '', ...(plan.lessonStages ?? []).map(s => s.content)].join('\n');
  if (/^ {2,}(?:\d+\.\s|\*\*)/m.test(body)) errors.push('Нумерованные списки и подзаголовки вариантов не должны иметь отступа (вложенные списки ломаются)');
  const tableRows = (plan.plannedResults?.table ?? '').split('\n').filter(l => /^\s*\|/.test(l));
  if (tableRows.some(l => l.trim().replace(/^\||\|$/g, '').split('|').length > 2)) errors.push('В таблице результатов каждая строка должна содержать ровно две ячейки');
  const prev = new Set(digests.filter(d => d.lessonNumber < lesson.lessonNumber).flatMap(d => d.signatures));
  const repeats = makeDigest(plan, lesson.lessonNumber).signatures.filter(s => prev.has(s));
  if (repeats.length) errors.push('Задачи повторяют числа и сюжеты предыдущих уроков этой темы — придумай новые задачи');
  const stagesText = (plan.lessonStages ?? []).map(s => s.content).join('\n');
  const contentTasks = [...(plan.lessonContent?.content ?? '').matchAll(/\*\*(?:Задача|Задание)[^*]*\*\*[^\n]*?\\\((.+?)\\\)/g)].map(m => m[1]!.replace(/\s+/g, ''));
  const stagesCompact = stagesText.replace(/\s+/g, '');
  if (contentTasks.some(f => f.length > 6 && !stagesCompact.includes(f))) errors.push('В «Содержании урока» есть задания, которых нет в ходе урока');
  return errors;
}
