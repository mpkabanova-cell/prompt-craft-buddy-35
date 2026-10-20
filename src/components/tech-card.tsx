import { RichText, ResultList, rowsFromTable, withoutTitle } from '@/components/plan-result';
import { lessons, lessonDisplayTitle } from '@/lib/lesson-data';
import type { Plan } from '@/lib/lesson-plan';

/** Technological lesson card (form 1 of the «Положение о ТКУ»), built only from the already validated plan. */
function stageParts(content: string) {
  const parts = content.split(/\*\*(Деятельность учителя|Деятельность учащихся|Результат этапа):?\*\*/i);
  const get = (label: string) => {
    const i = parts.findIndex(p => p.toLocaleLowerCase('ru') === label.toLocaleLowerCase('ru'));
    return i < 0 ? '' : (parts[i + 1] ?? '').trim();
  };
  return { title: parts[0]?.match(/^\s*###\s*(.+?)(?:\n|$)/)?.[1] ?? '', teacher: get('Деятельность учителя'), students: get('Деятельность учащихся'), result: get('Результат этапа') };
}

const Blank = () => <span className="tc-blank">заполняет учитель</span>;

export function TechCard({ plan, forExport = false }: { plan: Plan; forExport?: boolean }) {
  const ref = lessons.find(l => l.lessonNumber === plan.lesson.number);
  const title = ref ? lessonDisplayTitle(ref) : plan.lesson.title;
  const results = rowsFromTable(plan.plannedResults.table).slice(1);
  const concepts = rowsFromTable(plan.keyConcepts.table).slice(1).flatMap(r => [r[0], r[1]]).filter(c => c && c !== '—').join('; ');
  const T = ({ children }: { children: string }) => forExport ? <RichText mathml>{children}</RichText> : <RichText>{children}</RichText>;
  const Row = ({ label, children }: { label: string; children: React.ReactNode }) => <tr><th scope="row">{label}</th><td>{children}</td></tr>;
  return <article className="tech-card">
    {forExport && <h1>Технологическая карта урока</h1>}
    <table className="tc-meta"><tbody>
      <Row label="Образовательная организация"><Blank /></Row>
      <Row label="Учитель"><Blank /></Row>
      <Row label="Дата проведения"><Blank /></Row>
      <Row label="Предмет, класс">{plan.lesson.subject}, {plan.lesson.grade}</Row>
    </tbody></table>
    <h2>Целевой блок</h2>
    <table className="tc-meta"><tbody>
      <Row label="Модуль">{plan.lesson.section || ref?.unitTopic}</Row>
      <Row label="Тема урока">Урок {plan.lesson.number}. {title}</Row>
      <Row label="Цель урока"><T>{withoutTitle(plan.goal.content, 'Цель урока')}</T></Row>
      <Row label="Планируемые результаты">{results.length ? results.map((r, i) => <div key={i} className="tc-result"><strong>{(r[0] ?? '').replace(/\*\*/g, '')}:</strong> <ResultList text={r.slice(1).join(' | ')} /></div>) : <T>{plan.plannedResults.table}</T>}</Row>
    </tbody></table>
    <h2>Инструментальный блок</h2>
    <table className="tc-meta"><tbody>
      <Row label="Задачи урока"><T>{withoutTitle(plan.objectives.content, 'Задачи урока')}</T></Row>
      <Row label="Тип урока">{plan.lesson.lessonType}</Row>
      <Row label="Учебно-методическое и материально-техническое обеспечение"><Blank /></Row>
    </tbody></table>
    <h2>Организационно-деятельностный блок</h2>
    <table className="tc-meta"><tbody>
      <Row label="Основные понятия">{concepts ? <ResultList text={concepts} /> : '—'}</Row>
      <Row label="Опорные знания и умения"><T>{withoutTitle(plan.prerequisites.content, 'Опорные знания и умения')}</T></Row>
      <Row label="Межпредметные связи"><Blank /></Row>
      <Row label="Длительность">{plan.lesson.durationMinutes} мин</Row>
    </tbody></table>
    <div className="tc-scroll"><table className="tc-stages">
      <thead><tr><th>Этап урока, время</th><th>Деятельность учителя</th><th>Деятельность обучающихся</th><th>Планируемый результат этапа</th></tr></thead>
      <tbody>{plan.lessonStages.map((s, i) => { const p = stageParts(s.content); return <tr key={s.id || i}>
        <td><strong>{p.title || `Этап ${i + 1}`}</strong><div className="tc-min">{s.durationMinutes} мин</div></td>
        <td><T>{p.teacher}</T></td><td><T>{p.students}</T></td><td><T>{p.result}</T></td>
      </tr>; })}</tbody>
    </table></div>
    <h2>Приложение. Содержание учебного материала</h2>
    <T>{withoutTitle(plan.lessonContent.content, 'Содержание урока')}</T>
    <h2>Домашнее задание</h2>
    <T>{withoutTitle(plan.homework.content, 'Домашнее задание')}</T>
  </article>;
}

const WORD_CSS = `body{font-family:"Times New Roman",serif;font-size:12pt}h1{font-size:16pt;text-align:center}h2{font-size:13pt;text-transform:uppercase;margin-top:14pt}table{border-collapse:collapse;width:100%;margin:4pt 0}th,td{border:1px solid #000;padding:4pt;vertical-align:top;text-align:left}th{background:#eee}.tc-blank{color:#888}@page{size:landscape;margin:1.5cm}`;

export async function techCardWordFile(plan: Plan) {
  const { renderToStaticMarkup } = await import('react-dom/server');
  const body = renderToStaticMarkup(<TechCard plan={plan} forExport />).replace(/заполняет учитель/g, '&nbsp;');
  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><title>Технологическая карта урока ${plan.lesson.number}</title><style>${WORD_CSS}</style></head><body>${body}</body></html>`;
  return new Blob(['\ufeff', html], { type: 'application/msword' });
}
