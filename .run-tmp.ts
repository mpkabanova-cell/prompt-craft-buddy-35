import { generatePlan } from './src/lib/generate-plan.server';
import { planToMarkdown } from './src/lib/lesson-plan';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
const out='/tmp/run/plans-44-85'; mkdirSync(out,{recursive:true});
const nums=Array.from({length:42},(_,i)=>44+i).filter(n=>!existsSync(`${out}/urok-${n}.md`));
let q=[...nums];
async function worker(){ while(q.length){ const n=q.shift()!; for(let t=0;t<2;t++){ try{ const p=await generatePlan(n); writeFileSync(`${out}/urok-${n}.md`, planToMarkdown(p)+'\n'); console.log('OK',n); break;} catch(e){ console.log('FAIL',n,t,String(e)); } } } }
await Promise.all(Array.from({length:8},worker)); console.log('DONE');
