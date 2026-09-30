import type { Lesson } from './lesson-data';

export type Stage = { id: string; durationMinutes: number; content: string };
export type Plan = {
  lesson: { number: number; title: string; subject: string; grade: string; section: string; lessonType: string; durationMinutes: number; quarter: number; week: number };
  goal: {content: string}; objectives: {content: string}; plannedResults: {title: string; table: string}; keyConcepts: {title: string; table: string}; prerequisites: {title: string; content: string}; lessonStages: Stage[]; lessonContent: {title: string; content: string}; homework: {content: string};
};
export const stagesByType: Record<string, {names: string[]; minutes: number[]}> = {
  'урок открытия нового знания': {names: ['Мотивация к учебной деятельности','Актуализация знаний','Создание проблемной ситуации','Постановка учебной задачи','Открытие нового знания','Первичное закрепление','Самостоятельная работа с самопроверкой','Рефлексия учебной деятельности'], minutes:[3,5,4,2,12,7,7,5]},
  'урок закрепления знаний': {names: ['Мотивация и постановка цели','Актуализация изученного','Выявление затруднений','Тренировка и коррекция','Самостоятельная работа','Применение знаний в усложнённой ситуации','Самопроверка и оценка результата','Подведение итогов и рефлексия'],minutes:[3,5,5,8,10,7,4,3]},
  'урок применения знаний': {names: ['Мотивация и постановка цели','Актуализация необходимых знаний и способов действий','Планирование деятельности','Применение знаний в знакомой ситуации','Применение знаний в изменённой ситуации','Самостоятельная работа','Проверка и обобщение способов действий','Подведение итогов и рефлексия'],minutes:[3,5,5,7,8,9,5,3]},
  'урок контроля': {names: ['Мотивация и постановка цели','Инструктаж и организация деятельности','Самостоятельное выполнение контрольной работы','Самопроверка полноты выполнения','Подведение итогов и рефлексия'],minutes:[3,5,30,4,3]},
  'урок систематизации и обобщения': {names: ['Мотивация и постановка цели','Актуализация изученного','Систематизация знаний','Применение знаний в новой ситуации','Самостоятельная работа','Обобщение и самопроверка','Подведение итогов и рефлексия'],minutes:[3,5,8,10,10,6,3]},
  'урок коррекции знаний': {names: ['Мотивация и постановка цели','Анализ результатов','Выявление затруднений','Коррекция ошибок','Самостоятельная работа','Самопроверка и оценка результата','Подведение итогов и рефлексия'],minutes:[3,5,5,12,10,7,3]},
};
export function validateLessonPlan(p: Plan, lesson: Lesson): string[] {
  const errors: string[] = [];
  if (!p || !p.lesson) return ['Нет структуры плана'];
  if (p.lesson.number !== lesson.lessonNumber || p.lesson.title !== lesson.lessonTopic) errors.push('Номер или тема не совпадает со справочником');
  if (p.lesson.lessonType !== lesson.lessonType) errors.push('Тип урока не совпадает со справочником');
  if (p.lesson.durationMinutes !== lesson.hours*45) errors.push('Неверная длительность урока');
  const schema = stagesByType[lesson.lessonType];
  if (!schema || !Array.isArray(p.lessonStages) || p.lessonStages.length !== schema.names.length) errors.push('Неверное число этапов');
  else {
    p.lessonStages.forEach((stage,i) => {
      if (!stage.content?.includes(`### ${i+1}. ${schema.names[i]}`)) errors.push(`Неверное название этапа ${i+1}`);
      if (stage.durationMinutes !== schema.minutes[i]) errors.push(`Неверная длительность этапа ${i+1}`);
      if (!stage.content?.includes('**Деятельность учителя**') || !stage.content?.includes('**Деятельность учащихся**') || !stage.content?.includes('**Результат этапа:**')) errors.push(`Неполный этап ${i+1}`);
    });
    if (p.lessonStages.reduce((sum,stage) => sum+stage.durationMinutes,0) !== lesson.hours*45) errors.push('Сумма времени не совпадает');
  }
  if (!p.goal?.content?.includes(lesson.goal)) errors.push('Цель не совпадает со справочником');
  if (p.lesson.subject !== 'Математика' || p.lesson.grade !== '6 класс' || Number(p.lesson.quarter) !== lesson.quarter || Number(p.lesson.week) !== lesson.week) errors.push('Метаданные урока не совпадают со справочником');
  if (!p.lessonContent?.content || !p.homework?.content) errors.push('Нет содержания или домашнего задания');
  if (!p.objectives?.content || !p.plannedResults?.table || !p.keyConcepts?.table || !p.prerequisites?.content) errors.push('Не хватает обязательных разделов');
  if (p.keyConcepts?.table && (!p.keyConcepts.table.includes('Основные понятия') || !p.keyConcepts.table.includes('Новые понятия') || lesson.keyConcepts.some(c => !p.keyConcepts.table.toLocaleLowerCase('ru').includes(c.toLocaleLowerCase('ru'))) || lesson.newConcepts.some(c => !p.keyConcepts.table.toLocaleLowerCase('ru').includes(c.toLocaleLowerCase('ru'))))) errors.push('Понятия не соответствуют справочнику');
  if (p.plannedResults?.table && !p.plannedResults.table.includes('Предметные')) errors.push('Нет предметных результатов');
  const all = JSON.stringify(p);
  if (/<\/?[a-z][^>]*>/i.test(all)) errors.push('HTML запрещён');
  if (/\b\d+\/\d+\b/.test(all)) errors.push('Дроби нужно записывать через LaTeX');
  if ('reflection' in p) errors.push('Отдельная рефлексия запрещена');
  if (lesson.newConcepts.length === 0 && p.keyConcepts?.table && !p.keyConcepts.table.includes('—')) errors.push('Новые понятия должны быть пустыми');
  return errors;
}
export function planToMarkdown(p: Plan) {
  return [`# Урок ${p.lesson.number}. ${p.lesson.title}`,`**${p.lesson.subject} · ${p.lesson.grade} · ${p.lesson.lessonType} · ${p.lesson.durationMinutes} мин · ${p.lesson.quarter} четверть · ${p.lesson.week} неделя**`,p.goal.content,p.objectives.content,p.plannedResults.title,p.plannedResults.table,p.keyConcepts.title,p.keyConcepts.table,p.prerequisites.title,p.prerequisites.content,'## Ход урока',...p.lessonStages.map(s => `${s.content}\n\n*${s.durationMinutes} мин*`),p.lessonContent.title,p.lessonContent.content,p.homework.content].join('\n\n');
}
