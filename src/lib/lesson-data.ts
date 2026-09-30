import reference from '@/data/math_6_reference.json';

export type Lesson = (typeof reference)[number];
export const lessons: Lesson[] = reference;
export const subjects = [
  'Алгебра','Алгебра и начала математического анализа','Астрономия','Английский язык','Биология','Вероятность и статистика','География','Геометрия','Духовно-нравственная культура России (ДНК России)','Изобразительное искусство','Искусственный интеллект и информационная безопасность','Информатика','Испанский язык','История','Китайский язык','Литература','Литературное чтение','Литературное чтение на родном языке','Математика','Музыка','Немецкий язык','Основы безопасности и защиты Родины (ОБЗР)','Основы религиозных культур и светской этики (ОРКСЭ)','Обществознание','Окружающий мир','Право','Русский язык','Труд (технология)','Физика','Физическая культура','Французский язык','Экология','Экономика'
];
export const grades = Array.from({length: 11}, (_, i) => `${i + 1} класс`);
export const referenceAvailability: Record<string, Record<string, boolean>> = { 'Математика': { '6 класс': true } };
export const schoolCalendar = {
  schoolYear: '2026/2027', startDate: '2026-09-01',
  vacations: [
    {start: '2026-10-26', end: '2026-11-02'},
    {start: '2026-12-30', end: '2027-01-10'},
    {start: '2027-03-22', end: '2027-03-28'},
  ],
};
const day = 86400000;
const utc = (s: string) => { const [y=2026,m=1,d=1] = s.split('-').map(Number); return Date.UTC(y,m-1,d); };
const monday = (timestamp: number) => {
  const date = new Date(timestamp);
  return timestamp - ((date.getUTCDay() + 6) % 7) * day;
};
export function academicPosition(date: Date) {
  const today = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  const start = utc(schoolCalendar.startDate);
  const startMonday = monday(start);
  let currentWeek = 1;
  if (today > start) {
    for (let cursor = startMonday + 7*day; cursor <= monday(today); cursor += 7*day) {
      const paused = schoolCalendar.vacations.some(v => cursor >= monday(utc(v.start)) && cursor <= monday(utc(v.end)));
      if (!paused) currentWeek++;
    }
  }
  currentWeek = Math.max(1, Math.min(34, currentWeek));
  const weekday = (new Date(today).getUTCDay() + 6) % 7;
  return { week: currentWeek, expectedLesson: Math.min(170, (currentWeek-1)*5 + Math.min(5, weekday+1)) };
}
export function rankLessonsByCurrentDate(date: Date) {
  const {week, expectedLesson} = academicPosition(date);
  const sort = (a: Lesson,b: Lesson) => Math.abs(a.week-week)-Math.abs(b.week-week) || Math.abs(a.lessonNumber-expectedLesson)-Math.abs(b.lessonNumber-expectedLesson) || a.lessonNumber-b.lessonNumber;
  return {
    current: lessons.filter(l => l.week === week).sort(sort),
    nearby: lessons.filter(l => l.week !== week && Math.abs(l.week-week) <= 1).sort(sort),
    all: lessons.filter(l => Math.abs(l.week-week) > 1).sort((a,b) => a.lessonNumber-b.lessonNumber),
    week, expectedLesson,
  };
}
