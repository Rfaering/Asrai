import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
const directory = fileURLToPath(new URL('.', import.meta.url));
async function bounded(operation) {
  let timer;
  try{return await Promise.race([operation,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('reference browser evaluation timeout')),10000);})]);}
  finally{clearTimeout(timer);}
}
export async function createBrowser() {
  const dist = resolve(directory, 'node_modules/mermaid/dist');
  const server = createServer(async (req,res) => {
    try {
      if (req.url === '/') { res.setHeader('Content-Type','text/html'); res.end('<!doctype html><html><body></body></html>'); return; }
      const target=resolve(dist, '.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
      if (!target.startsWith(dist+sep)) { res.writeHead(403).end(); return; }
      res.setHeader('Content-Type', target.endsWith('.mjs') || target.endsWith('.js') ? 'text/javascript' : 'application/octet-stream');
      res.end(await readFile(target));
    } catch { res.writeHead(404).end(); }
  });
  await new Promise((yes,no)=>{server.once('error',no);server.listen(0,'127.0.0.1',yes);});
  const origin=`http://127.0.0.1:${server.address().port}`;
  let browser;
  try { browser=await chromium.launch({headless:true}); } catch(error) { server.close(); throw error; }
  const context=await browser.newContext({viewport:{width:1280,height:960},deviceScaleFactor:1,locale:'en-US',timezoneId:'UTC',colorScheme:'light',serviceWorkers:'block'});
  await context.route('**/*',route=> new URL(route.request().url()).origin===origin ? route.continue() : route.abort());
  return {
    version: browser.version(),
    async page() { const page=await context.newPage(); page.setDefaultTimeout(10000); await page.goto(origin); return page; },
    async close() { await browser.close(); await new Promise(yes=>server.close(yes)); },
  };
}
export async function observe(browser, source, config, { render=false, screenshot }={}) {
  const page=await browser.page();
  try {
    const result=await bounded(page.evaluate(async ({source,config,render})=>{
      const {default:mermaid}=await import('/mermaid.esm.min.mjs');
      mermaid.initialize(config);
      let parsed;
      try { parsed=await mermaid.parse(source,{suppressErrors:true}); }
      catch(error) { return {accepted:false,error:String(error.message)}; }
      if (!parsed) return {accepted:false};
      // Reference-only observation adapter. DB methods are version-specific, never product APIs.
      const diagram=await mermaid.mermaidAPI.getDiagramFromText(source);
      const db=diagram.db;
      const raw=db.getVertices();
      const vertices=raw instanceof Map ? [...raw.values()] : Object.values(raw);
      const shape={square:'rect',rect:'rect',round:'rounded',rounded:'rounded',diamond:'diamond'};
      const model={type:'flowchart',direction:db.getDirection()==='TD'?'TB':db.getDirection(),
        nodes:vertices.map(v=>({id:v.id,label:v.text??v.id,shape:shape[v.type]??v.type??'rect'})),
        edges:db.getEdges().map(e=>({source:e.start,target:e.end,label:e.text??'',directed:e.type!=='arrow_open'}))};
      const result={accepted:true,diagramType:parsed.diagramType,model};
      if (render) {
        const {svg}=await mermaid.render('asraiOracle',source);
        document.body.innerHTML=svg;
        await document.fonts.ready;
        result.svg=svg;
        const element=document.querySelector('svg');
        result.visual={viewBox:element.getAttribute('viewBox'),nodeCount:element.querySelectorAll('g.node').length,edgeCount:element.querySelectorAll('path.flowchart-link').length};
      }
      return result;
    },{source,config,render}));
    if (screenshot && result.svg) await page.locator('svg').screenshot({path:screenshot});
    if (result.svg) result.svgSha256=createHash('sha256').update(result.svg).digest('hex');
    return result;
  } finally { await page.close(); }
}
export async function inspectSvg(browser, svg, {screenshot}={}) {
  const page=await browser.page();
  try {
    // Inspect as inert XML before attaching to a DOM. No candidate script is executed.
    const inspected=await bounded(page.evaluate(svg=>{
      const doc=new DOMParser().parseFromString(svg,'image/svg+xml');
      const failures=[];
      if (doc.querySelector('parsererror') || doc.documentElement.localName!=='svg' || doc.documentElement.namespaceURI!=='http://www.w3.org/2000/svg') return {failures:['invalid SVG XML']};
      const allowed=new Set(['svg','g','rect','circle','ellipse','polygon','polyline','line','path','text','tspan','defs','marker','title','desc']);
      const attributes=new Set(['xmlns','id','role','aria-labelledby','aria-label','data-node-id','data-node-shape','data-edge-source','data-edge-target','viewBox','width','height','x','y','x1','y1','x2','y2','cx','cy','r','rx','ry','d','points','transform','fill','stroke','stroke-width','stroke-linecap','stroke-linejoin','stroke-dasharray','opacity','fill-opacity','stroke-opacity','font-family','font-size','font-weight','text-anchor','dominant-baseline','dx','dy','marker-start','marker-mid','marker-end','markerWidth','markerHeight','refX','refY','orient','markerUnits','preserveAspectRatio']);
      for (const el of doc.querySelectorAll('*')) {
        if (!allowed.has(el.localName)) failures.push('unsafe or unsupported SVG element');
        for (const attr of el.attributes) {
          if(!attributes.has(attr.name) || /[\\\u0000-\u001f]/.test(attr.value)) failures.push('unsafe or unsupported SVG attribute');
          if (/^on/i.test(attr.name) || /href$/i.test(attr.name) || /(?:javascript:|data:|https?:|@import|expression\s*\()/i.test(attr.value) && attr.name!=='xmlns' || /url\s*\(/i.test(attr.value) && !/^url\(#[A-Za-z_][\w.-]*\)$/.test(attr.value)) failures.push('unsafe SVG attribute');
        }
      }
      if (failures.length) return {failures:[...new Set(failures)]};
      document.body.append(document.importNode(doc.documentElement,true));
      const svgElement=document.querySelector('svg');
      const visible=el=>{
        for(let current=el;current&&current!==document.body;current=current.parentElement){const style=getComputedStyle(current);if(style.display==='none'||style.visibility==='hidden'||Number(style.opacity)===0)return false;}
        return true;
      };
      const matrixFor=el=>svgElement.getCTM().inverse().multiply(el.getCTM());
      const bounds=el=>{
        const b=el.getBBox(),matrix=matrixFor(el);
        const points=[[b.x,b.y],[b.x+b.width,b.y],[b.x,b.y+b.height],[b.x+b.width,b.y+b.height]].map(([x,y])=>new DOMPoint(x,y).matrixTransform(matrix));
        const x=Math.min(...points.map(p=>p.x)),y=Math.min(...points.map(p=>p.y));
        return {x,y,width:Math.max(...points.map(p=>p.x))-x,height:Math.max(...points.map(p=>p.y))-y};
      };
      const nodes=[...svgElement.querySelectorAll('g[data-node-id]')].map(group=>{
        const shape=group.querySelector('[data-node-shape]');
        if(!shape){failures.push('SVG node is missing its shape');return {id:group.getAttribute('data-node-id')};}
        const b=bounds(shape);
        if(!visible(shape))failures.push('SVG node is invisible');
        const texts=[...group.querySelectorAll('text')];
        for(const text of texts){const t=bounds(text);if(!visible(text)||getComputedStyle(text).fill==='none')failures.push('SVG label is invisible');if(t.x<b.x-2||t.y<b.y-2||t.x+t.width>b.x+b.width+2||t.y+t.height>b.y+b.height+2)failures.push('SVG label outside node bounds');}
        return {id:group.getAttribute('data-node-id'),...b,label:texts.map(t=>t.textContent).join('')};
      });
      const edges=[...svgElement.querySelectorAll('path[data-edge-source][data-edge-target]')].map(path=>{
        const matrix=matrixFor(path),length=path.getTotalLength();
        const start=path.getPointAtLength(0).matrixTransform(matrix),end=path.getPointAtLength(length).matrixTransform(matrix);
        if(!visible(path)||getComputedStyle(path).stroke==='none'||Number.parseFloat(getComputedStyle(path).strokeWidth)<=0)failures.push('SVG edge is invisible');
        const marker=/^url\(#([A-Za-z_][\w.-]*)\)$/.exec(path.getAttribute('marker-end')??'');
        const markerElement=marker?svgElement.querySelector(`[id="${marker[1]}"]`):null;
        return {source:path.getAttribute('data-edge-source'),target:path.getAttribute('data-edge-target'),directed:markerElement?.localName==='marker',points:[{x:start.x,y:start.y},{x:end.x,y:end.y}]};
      });
      const edgeLabels=[...svgElement.querySelectorAll('text[data-edge-source][data-edge-target]')].map(text=>({source:text.getAttribute('data-edge-source'),target:text.getAttribute('data-edge-target'),label:text.textContent}));
      const viewBox=svgElement.viewBox.baseVal;
      if(viewBox.x!==0||viewBox.y!==0||viewBox.width<=0||viewBox.height<=0)failures.push('SVG viewBox must start at zero with positive dimensions');
      for(const text of svgElement.querySelectorAll('text')) {
        const b=bounds(text);
        if(!visible(text)||getComputedStyle(text).fill==='none')failures.push('SVG text is invisible');
        if(b.x<0||b.y<0||b.x+b.width>viewBox.width||b.y+b.height>viewBox.height)failures.push('SVG text outside canvas');
      }
      return {failures:[...new Set(failures)],text:[...svgElement.querySelectorAll('text')].map(t=>t.textContent).join('\n'),edgeLabels,scene:{width:viewBox.width,height:viewBox.height,nodes,edges}};
    },svg));
    if (screenshot && !inspected.failures.length) await page.locator('svg').screenshot({path:screenshot});
    return inspected;
  } finally { await page.close(); }
}
