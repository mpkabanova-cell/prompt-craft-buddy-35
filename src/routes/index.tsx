import { createFileRoute } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { ArrowLeft, Check, CheckCircle2, ChevronDown, Circle, Clipboard, Download, FileJson, LoaderCircle, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command';
import { Skeleton } from '@/components/ui/skeleton';
import { lessons, subjects, grades, referenceAvailability, rankLessonsByCurrentDate, lessonDisplayTitle, type Lesson } from '@/lib/lesson-data';
import { planToMarkdown, type Plan } from '@/lib/lesson-plan';
import { generateLessonPlan } from '@/lib/generate-plan.functions';
import logoMark from '@/assets/logo-book-steps.png';

export const Route = createFileRoute('/')({
  head: () => ({meta: [
    {title:'Создать план урока — Урок по плану'},
    {name:'description',content:'Готовый план урока математики для 6 класса по тематическому справочнику: содержание, задания, ход урока и домашняя работа.'},
    {property:'og:title',content:'Создать план урока — Урок по плану'},
    {property:'og:description',content:'Выберите тему из тематического планирования и получите содержательный план урока.'},
    {property:'og:type',content:'website'},
    {name:'twitter:card',content:'summary_large_image'},
  ]}),
  component: Index,
});

const sections = ['Цель урока','Задачи урока','Планируемые результаты','Понятия урока','Опорные знания и умения','Ход урока','Содержание урока','Домашнее задание'];
const idFor = (label: string) => sections.indexOf(label) >= 0 ? `section-${sections.indexOf(label)+1}` : undefined;
function Markdown({content}: {content:string}) {
  const normalized = content.replace(/\\\((.*?)\\\)/gs, (_match, math: string) => `$${math}$`).replace(/\\\[([\s\S]*?)\\\]/g, (_match, math: string) => `$$\n${math}\n$$`);
  return <ReactMarkdown remarkPlugins={[remarkGfm,remarkMath]} rehypePlugins={[rehypeKatex]} skipHtml components={{h2:({children}) => <h2 id={idFor(String(children))}>{children}</h2>}}>{normalized}</ReactMarkdown>;
}
function TopicPicker({value, onChange, ranked}: {value:Lesson|undefined;onChange:(lesson:Lesson)=>void;ranked:ReturnType<typeof rankLessonsByCurrentDate>}) {
  const [open,setOpen] = useState(false);
  return <Popover open={open} onOpenChange={setOpen}>
    <PopoverTrigger asChild><Button variant="outline" role="combobox" aria-expanded={open} className="h-12 w-full justify-between text-left font-normal shadow-none min-w-0">
       <span className="truncate">{value ? `Урок ${value.lessonNumber} · ${lessonDisplayTitle(value)}` : 'Выберите тему'}</span><ChevronDown className="ml-2 shrink-0 opacity-50" />
    </Button></PopoverTrigger>
    <PopoverContent align="start" className="w-(--radix-popover-trigger-width) p-0 min-w-[min(90vw,470px)]">
      <Command filter={(item, search) => item.toLocaleLowerCase('ru').includes(search.toLocaleLowerCase('ru')) ? 1 : 0}>
        <CommandInput placeholder="Номер или название урока..." aria-label="Поиск урока" />
        <CommandList className="max-h-[340px]"><CommandEmpty>Уроки не найдены</CommandEmpty>
          {([['Актуально сейчас',ranked.current],['Темы уроков',ranked.all]] as const).map(([heading,items]) => items.length > 0 && <CommandGroup key={heading} heading={heading}>
             {items.map(l => <CommandItem key={l.lessonNumber} value={`${l.lessonNumber} ${l.lessonTopic} ${l.unitTopic}`} onSelect={() => {onChange(l);setOpen(false);}} className="flex items-start gap-3 py-3 cursor-pointer">
              <span className="flex h-7 w-8 shrink-0 items-center justify-center rounded bg-secondary text-xs font-semibold text-secondary-foreground">{l.lessonNumber}</span>
                <span className="min-w-0 flex-1"><span className="block text-sm leading-snug">{lessonDisplayTitle(l)}</span><span className="mt-1 block text-xs text-muted-foreground">{l.unitTopic} · {l.lessonType}</span></span>
              {value?.lessonNumber===l.lessonNumber && <Check className="shrink-0 text-primary" />}
            </CommandItem>)}
          </CommandGroup>)}
        </CommandList>
      </Command>
    </PopoverContent>
  </Popover>;
}
function download(name:string, content:string, type:string) {
  const url=URL.createObjectURL(new Blob([content],{type}));
  const anchor=document.createElement('a');anchor.href=url;anchor.download=name;anchor.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function Index() {
  const [subject,setSubject]=useState('Математика');
  const [grade,setGrade]=useState('6 класс');
  const [selected,setSelected]=useState<Lesson>();
  const [plan,setPlan]=useState<Plan>();
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState(false);
  const [copied,setCopied]=useState(false);
  const ranked=useMemo(()=>rankLessonsByCurrentDate(new Date(),grade),[grade]);
  const available=Boolean(referenceAvailability[subject]?.[grade]);
  const markdown=plan ? planToMarkdown(plan) : '';
  async function createPlan() {
    if (!selected || !available || loading) return;
    setLoading(true);setError(false);setPlan(undefined);
    try { const result=await generateLessonPlan({data:{lessonNumber:selected.lessonNumber}});setPlan(result); }
    catch (e) { console.error(e);setError(true); }
    finally {setLoading(false); }
  }
  return <div className="app-frame min-h-screen bg-page-surround">
    <div className="app-shell">
    <header className="shell-steps" aria-label="Этапы работы"><span className="step-complete"><span className="step-dot">✓</span>Выбор урока</span><span className="step-line" aria-hidden="true"></span><span className={plan || loading ? 'step-active' : 'step-future'}><span className="step-dot">2</span>План урока</span><span className="step-line" aria-hidden="true"></span><span className="step-future"><span className="step-dot">3</span>Материалы для урока</span></header>
    {!plan && !loading && <main className="work-surface px-5 pb-16 pt-9 md:px-9 md:pt-11">
      <div className="max-w-3xl"><div className="flex items-center gap-4"><img src={logoMark} alt="" width={52} height={52} className="h-[52px] w-[52px] shrink-0" /><h1 className="font-display text-3xl font-bold leading-tight md:text-4xl">Создать план урока</h1></div><p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">Выберите урок из тематического планирования — структура и содержание плана будут подготовлены автоматически.</p></div>
      <section className="mt-9 border-y border-border py-7" aria-label="Выбор урока">
        <div className="grid gap-5 md:grid-cols-[1fr_0.7fr_1.65fr]">
          <div><label className="mb-2 block text-sm font-semibold">Предмет</label><Select value={subject} onValueChange={v=>{setSubject(v);setSelected(undefined);setError(false);}}><SelectTrigger className="h-12 bg-card"><SelectValue /></SelectTrigger><SelectContent className="max-h-80">{subjects.map(s=><SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
          <div><label className="mb-2 block text-sm font-semibold">Класс</label><Select value={grade} onValueChange={v=>{setGrade(v);setSelected(undefined);setError(false);}}><SelectTrigger className="h-12 bg-card"><SelectValue /></SelectTrigger><SelectContent>{grades.map(g=><SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent></Select></div>
          <div><label className="mb-2 block text-sm font-semibold">Тема урока</label>{available ? <TopicPicker value={selected} onChange={l=>{setSelected(l);setError(false);}} ranked={ranked}/> : <div className="flex h-12 items-center rounded-md border bg-muted px-4 text-sm text-muted-foreground">Справочник пока не подключён</div>}</div>
        </div>
        {!available && <p className="mt-5 text-sm text-muted-foreground">{subject !== 'Математика' ? 'Для выбранного предмета справочник пока не подключён.' : 'Для этой комбинации предмета и класса тематический справочник пока не подключён.'}</p>}
        {available && selected && <div className="mt-6 flex flex-wrap items-center gap-2 text-sm text-muted-foreground"><span className="rounded bg-secondary px-2 py-1 font-semibold text-secondary-foreground">Урок {selected.lessonNumber}</span><span>{selected.lessonType}</span><span aria-hidden="true">·</span><span>{selected.quarter} четверть, {selected.week} неделя</span></div>}
        <div className="mt-8 flex flex-wrap items-center gap-5"><Button size="lg" disabled={!available || !selected} onClick={createPlan} className="h-12 px-6"><Sparkles size={17}/>Сформировать план урока</Button><span className="text-sm text-muted-foreground">{selected ? `${selected.hours*45} минут · Математика · 6 класс` : 'Выберите предмет, класс и тему урока.'}</span></div>
        {error && <div role="alert" className="mt-5 flex flex-wrap items-center gap-3 text-sm text-destructive">Не удалось сформировать план. Попробуйте ещё раз.<Button variant="outline" size="sm" onClick={createPlan}>Повторить</Button></div>}
      </section>
       {available && !ranked.isVacation && <section className="mt-10"><div className="mb-5 flex items-center justify-between gap-4"><div><h2 className="font-display text-xl font-bold">Актуально по плану</h2><p className="mt-1 text-sm text-muted-foreground">Темы текущей учебной недели</p></div><span className="text-xs text-muted-foreground">{ranked.current.length} уроков</span></div><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{ranked.current.map(l=><Button key={l.lessonNumber} variant="outline" onClick={()=>setSelected(l)} className={`h-auto min-h-28 w-full items-start justify-start whitespace-normal border bg-card p-5 text-left shadow-none transition-colors hover:border-primary/40 ${selected?.lessonNumber===l.lessonNumber ? 'border-primary bg-secondary' : ''}`}><div className="flex w-full flex-col items-start gap-2"><span className="text-xs font-semibold text-primary">УРОК {l.lessonNumber} <span className="text-muted-foreground">· {l.week} НЕДЕЛЯ</span></span><span className="line-clamp-2 text-sm font-semibold leading-relaxed text-foreground">{lessonDisplayTitle(l)}</span></div></Button>)}</div></section>}
    </main>}
     {loading && <main className="work-surface px-5 py-12 md:px-9">
       <div className="mb-8"><div className="flex items-center gap-3 text-primary"><Sparkles className="shrink-0 motion-safe:animate-pulse"/><h1 className="font-display text-xl font-bold">Формируем план урока…</h1></div><p className="mt-2 text-sm text-muted-foreground">Урок {selected?.lessonNumber} · {selected ? lessonDisplayTitle(selected) : ''}</p></div>
       <div className="mb-10 max-w-xl border-y border-border py-5" aria-label="Состояние формирования плана">
         <div className="flex items-center gap-3 py-2 text-sm text-foreground"><CheckCircle2 className="size-5 shrink-0 text-primary" aria-hidden="true"/><span>Тема урока выбрана</span></div>
         <div className="flex items-center gap-3 py-2 text-sm font-medium text-foreground" role="status" aria-live="polite"><LoaderCircle className="size-5 shrink-0 text-primary motion-safe:animate-spin" aria-hidden="true"/><span>Составляем план и задания</span></div>
         <div className="flex items-center gap-3 py-2 text-sm text-muted-foreground"><Circle className="size-5 shrink-0" aria-hidden="true"/><span>Далее — проверка структуры и 45 минут</span></div>
       </div>
       <Skeleton className="mb-4 h-10 w-3/4"/><Skeleton className="mb-10 h-5 w-1/2"/>{Array.from({length:5},(_,i)=><div key={i} className="mb-10"><Skeleton className="mb-5 h-7 w-1/3"/><Skeleton className="mb-3 h-4 w-full"/><Skeleton className="mb-3 h-4 w-5/6"/><Skeleton className="h-4 w-2/3"/></div>)}
     </main>}
      {plan && <main className="work-surface px-5 pb-20 pt-7 md:px-9"><Button variant="ghost" className="-ml-3 text-muted-foreground" onClick={()=>{setPlan(undefined);setCopied(false);}}><ArrowLeft/>Изменить урок</Button>
        <div className="mt-5 border-b pb-6"><h1 className="max-w-4xl font-display text-3xl font-bold leading-tight md:text-4xl">{selected ? lessonDisplayTitle(selected) : plan.lesson.title}</h1><p className="mt-2 text-sm text-muted-foreground">Математика · 6 класс · {plan.lesson.lessonType} · {plan.lesson.section} · Урок {plan.lesson.number} · {plan.lesson.durationMinutes} мин</p>
        <div className="mt-7 flex flex-wrap gap-2"><Button variant="outline" onClick={async()=>{await navigator.clipboard.writeText(markdown);setCopied(true);setTimeout(()=>setCopied(false),2000);}}>{copied?<Check/>:<Clipboard/>}{copied?'Скопировано':'Скопировать'}</Button><Button variant="outline" onClick={()=>download(`urok-${plan.lesson.number}.md`,markdown,'text/markdown;charset=utf-8')}><Download/>Скачать Markdown</Button><Button variant="outline" onClick={()=>download(`urok-${plan.lesson.number}.json`,JSON.stringify(plan,null,2),'application/json;charset=utf-8')}><FileJson/>Скачать JSON</Button></div>
       </div><div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_190px]"><article className="plan-prose min-w-0 pt-2"><Markdown content={markdown}/></article><aside className="hidden lg:block"><nav aria-label="Содержание плана" className="sticky top-8 mt-10"><p className="mb-3 text-xs font-bold uppercase text-muted-foreground">Содержание</p>{sections.map((s,i)=><a key={s} href={`#section-${i+1}`} className="mb-2 block text-sm text-foreground transition-colors hover:text-primary">{s}</a>)}</nav></aside></div>
    </main>}
    </div>
  </div>;
}
