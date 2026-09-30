import reference from '@/data/math_6_reference.json';

export type Lesson = (typeof reference)[number];
export const lessons: Lesson[] = reference;
export const subjects = [
  'Алгебра','Алгебра и начала математического анализа','Астрономия','Английский язык','Биология','Вероятность и статистика','География','Геометрия','Духовно-нравственная культура России (ДНК России)','Изобразительное искусство','Искусственный интеллект и информационная безопасность','Информатика','Испанский язык','История','Китайский язык','Литература','Литературное чтение','Литературное чтение на родном языке','Математика','Музыка','Немецкий язык','Основы безопасности и защиты Родины (ОБЗР)','Основы религиозных культур и светской этики (ОРКСЭ)','Обществознание','Окружающий мир','Право','Русский язык','Труд (технология)','Физика','Физическая культура','Французский язык','Экология','Экономика'
];
export const grades = Array.from({length: 11}, (_, i) => `${i + 1} класс`);
export const referenceAvailability: Record<string, Record<string, boolean>> = { 'Математика': { '6 класс': true } };
export const schoolCalendar = {
  schoolYear: '2026/2027', startDate: '2026-09-01', endDate: '2027-05-26', lessonsPerWeek: 5, maximumLessons: 170,
  vacations: [
    {start: '2026-10-26', end: '2026-11-03', grade: 'all'},
    {start: '2026-12-31', end: '2027-01-10', grade: 'all'},
    {start: '2027-02-15', end: '2027-02-21', grade: '1 класс'},
    {start: '2027-03-27', end: '2027-04-04', grade: 'all'},
    {start: '2027-05-27', end: '2027-08-31', grade: 'all'},
  ],
};
const day = 86400000;
const utc = (s: string) => { const [y=2026,m=1,d=1] = s.split('-').map(Number); return Date.UTC(y,m-1,d); };
export function academicPosition(date: Date, grade = '6 класс') {
  const today = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  const start = utc(schoolCalendar.startDate);
  const end = utc(schoolCalendar.endDate);
  const onVacation = (timestamp: number) => schoolCalendar.vacations.some(v =>
    (v.grade === 'all' || v.grade === grade) && timestamp >= utc(v.start) && timestamp <= utc(v.end));
  const isSchoolDay = (timestamp: number) => {
    const weekday = new Date(timestamp).getUTCDay();
    return weekday >= 1 && weekday <= 5 && !onVacation(timestamp);
  };
  let taught = 0;
  for (let cursor = start; cursor <= Math.min(today, end); cursor += day) {
    if (isSchoolDay(cursor)) taught++;
  }
  const expectedLesson = Math.max(1, Math.min(schoolCalendar.maximumLessons, taught));
  const week = Math.min(34, Math.ceil(expectedLesson / schoolCalendar.lessonsPerWeek));
  return { week, expectedLesson, isVacation: onVacation(today), isSchoolDay: today >= start && today <= end && isSchoolDay(today) && taught <= schoolCalendar.maximumLessons };
}
export function rankLessonsByCurrentDate(date: Date, grade = '6 класс') {
  const {week, expectedLesson, isVacation, isSchoolDay} = academicPosition(date, grade);
  const sort = (a: Lesson,b: Lesson) => Math.abs(a.week-week)-Math.abs(b.week-week) || Math.abs(a.lessonNumber-expectedLesson)-Math.abs(b.lessonNumber-expectedLesson) || a.lessonNumber-b.lessonNumber;
  return {
    current: lessons.filter(l => l.week === week).sort(sort),
    nearby: lessons.filter(l => l.week !== week && Math.abs(l.week-week) <= 1).sort(sort),
    all: lessons.filter(l => Math.abs(l.week-week) > 1).sort((a,b) => a.lessonNumber-b.lessonNumber),
    week, expectedLesson, isVacation, isSchoolDay,
  };
}
