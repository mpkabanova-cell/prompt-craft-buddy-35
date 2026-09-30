import ReactMarkdown from 'react-markdown';
import { isValidElement, type ReactNode } from 'react';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { normalizeMarkdown, type Plan } from '@/lib/lesson-plan';

function RichText({ children, className = '', definitions = false }: { children: string; className?: string; definitions?: boolean }) {
  const normalized = normalizeMarkdown(children)
    .replace(/\\\(([\s\S]*?)\\\)/g, (_match, math: string) => `$${math.replace(/\\frac(?=\s*\{)/g, '\\dfrac')}$`)
    .replace(/\\\[([\s\S]*?)\\\]/g, (_match, math: string) => `$$\n${math}\n$$`);
  return <div className={`result-rich ${className}`}><ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]} skipHtml components={{
    table: ({ children: contents }) => <div className="result-table-scroll"><table>{contents}</table></div>,
    p: ({ children: contents }) => {
      const first = Array.isArray(contents) ? contents[0] : contents;
      const label = isValidElement<{ children?: ReactNode }>(first) && first.type === 'strong' ? first.props.children : null;
      const isDefinition = definitions && typeof label === 'string' && /^(?:Определение|Правило|Важно|Запомните)\s*:?$/i.test(label.trim());
      return <p className={isDefinition ? 'result-definition' : undefined}>{contents}</p>;
    },
  }}>{normalized}</ReactMarkdown></div>;
}

function withoutTitle(text: string, title: string) {
  return text.replace(new RegExp(`^\\s*#{1,4}\\s*${title}\\s*\\n?`, 'i'), '').trim();
}

function rowsFromTable(text: string) {
  return text.split('\n').filter(line => /^\s*\|/.test(line))
    .map(line => line.trim().replace(/^\||\|$/g, '').split(/(?<!\\)\|/).map(cell => cell.trim()))
    .filter(row => row.length >= 2 && !row.every(cell => /^:?-{2,}:?$/.test(cell)));
}

function ResultList({ text }: { text: string }) {
  const items: string[] = [];
  let part = '';
  let mathEnd = '';
  for (let i = 0; i < text.length; i++) {
    if (!mathEnd && text.startsWith('\\(', i)) mathEnd = '\\)';
    else if (!mathEnd && text.startsWith('\\[', i)) mathEnd = '\\]';
    else if (mathEnd && text.startsWith(mathEnd, i)) mathEnd = '';
    else if (!mathEnd && text[i] === ';') { if (part.trim()) items.push(part.trim()); part = ''; continue; }
    part += text[i];
  }
  if (part.trim()) items.push(part.trim());
  return items.length > 1 ? <ul className="result-list">{items.map((item, i) => <li key={i}><RichText>{item}</RichText></li>)}</ul> : <RichText>{text}</RichText>;
}

function ResultSection({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return <section className="result-section" id={id}><h2>{title}</h2>{children}</section>;
}

function StageView({ stage }: { stage: Plan['lessonStages'][number] }) {
  const parts = stage.content.split(/\*\*(Деятельность учителя|Деятельность учащихся|Результат этапа):?\*\*/i);
  const heading = parts[0]?.match(/^\s*###\s*(.+?)(?:\n|$)/)?.[1] ?? '';
  const extract = (label: string) => {
    const index = parts.findIndex(part => part.toLocaleLowerCase('ru') === label.toLocaleLowerCase('ru'));
    return index < 0 ? '' : (parts[index + 1] ?? '').trim();
  };
  return <div className="result-stage">
    <div className="result-stage-head"><h3>{heading}</h3><span className="result-duration">{stage.durationMinutes} мин</span></div>
    <div className="result-activities">
      <div><h4>Деятельность учителя</h4><RichText>{extract('Деятельность учителя')}</RichText></div>
      <div><h4>Деятельность учащихся</h4><RichText>{extract('Деятельность учащихся')}</RichText></div>
    </div>
    <div className="result-outcome"><h4>Результат этапа</h4><RichText>{extract('Результат этапа')}</RichText></div>
  </div>;
}

export function PlanResult({ plan }: { plan: Plan }) {
  const conceptRows = rowsFromTable(plan.keyConcepts.table);
  const resultRows = rowsFromTable(plan.plannedResults.table).slice(1);
  const resultGroups: { label: string; entries: { subheading?: string; text: string }[] }[] = [];
  for (const row of resultRows) {
    const heading = (row[0] ?? '').replace(/\*\*/g, '');
    const meta = heading.match(/^Метапредметные(?:\s*[—–-]\s*|\s+)(.+)$/i);
    const label = meta ? 'Метапредметные' : heading;
    const last = resultGroups[resultGroups.length - 1];
    const group = last?.label === label ? last : { label, entries: [] };
    if (group !== last) resultGroups.push(group);
    const subheading = meta?.[1];
    group.entries.push({ ...(subheading ? { subheading: subheading.charAt(0).toLocaleUpperCase('ru') + subheading.slice(1) } : {}), text: row.slice(1).join(' | ') });
  }
  const concepts = conceptRows.slice(1).map(row => row[0]).filter(Boolean).join('; ');
  const newConcepts = conceptRows.slice(1).map(row => row[1]).filter(Boolean).join('; ') || '—';
  return <article className="plan-result min-w-0 pt-2">
    <ResultSection id="section-1" title="Цель урока"><RichText>{withoutTitle(plan.goal.content, 'Цель урока')}</RichText></ResultSection>
    <ResultSection id="section-2" title="Задачи урока"><RichText>{withoutTitle(plan.objectives.content, 'Задачи урока')}</RichText></ResultSection>
    <ResultSection id="section-3" title="Планируемые результаты">
      {resultGroups.length ? <div className="result-rows">{resultGroups.map((group, i) =>
        <div className="result-row" key={i}><h3>{group.label}</h3><div>{group.entries.map((entry, j) => <div className="result-entry" key={j}>{entry.subheading && <h4 className="result-subgroup">{entry.subheading}</h4>}<ResultList text={entry.text} /></div>)}</div></div>
      )}</div> : <RichText>{plan.plannedResults.table}</RichText>}
    </ResultSection>
    <ResultSection id="section-4" title="Понятия урока"><div className="concept-grid"><div><h3>Основные понятия</h3><ResultList text={concepts || '—'} /></div><div><h3>Новые понятия</h3><ResultList text={newConcepts} /></div></div></ResultSection>
    <ResultSection id="section-5" title="Опорные знания и умения"><RichText>{withoutTitle(plan.prerequisites.content, 'Опорные знания и умения')}</RichText></ResultSection>
    <ResultSection id="section-6" title="Ход урока">{plan.lessonStages.map((stage, i) => <StageView key={stage.id || i} stage={stage} />)}</ResultSection>
    <ResultSection id="section-7" title="Содержание урока"><RichText className="result-content" definitions>{withoutTitle(plan.lessonContent.content, 'Содержание урока')}</RichText></ResultSection>
    <ResultSection id="section-8" title="Домашнее задание"><RichText>{withoutTitle(plan.homework.content, 'Домашнее задание')}</RichText></ResultSection>
  </article>;
}