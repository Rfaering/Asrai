export function validateBacklog(document,fixtures) {
  const errors=[];
  if(document.schemaVersion!==1 || !Array.isArray(document.capabilities))return ['invalid capability document'];
  const caps=document.capabilities,byId=new Map(caps.map(c=>[c.id,c]));
  if(byId.size!==caps.length)errors.push('duplicate capability id');
  const statuses=['pending','ready','implementing','implemented','accepted','deferred'];
  for(const c of caps) {
    const allowed=['id','priority','milestone','description','referenceBehaviour','dependencies','acceptanceCriteria','evaluationStrategy','status','evidence','completion'];
    if(Object.keys(c).some(key=>!allowed.includes(key)))errors.push(`${c.id} unknown field`);
    if(!/^FC\d{3}$/.test(c.id) || typeof c.description!=='string' || !c.description || !Number.isInteger(c.priority) || c.priority<1 || typeof c.milestone!=='string' || !statuses.includes(c.status))errors.push(`invalid capability ${c.id}`);
    for(const key of ['dependencies','acceptanceCriteria','evaluationStrategy','evidence'])if(!Array.isArray(c[key]))errors.push(`${c.id} missing ${key}`);
    for(const key of ['dependencies','acceptanceCriteria','evaluationStrategy'])if(Array.isArray(c[key])&&(c[key].some(v=>typeof v!=='string')||new Set(c[key]).size!==c[key].length))errors.push(`${c.id} invalid ${key}`);
    if(!c.evaluationStrategy?.length)errors.push(`${c.id} has no evaluation strategy`);
    for(const evidence of c.evidence??[])if(typeof evidence.report!=='string'||!evidence.report||!['candidateSha256','acceptanceSha256'].every(key=>/^[a-f0-9]{64}$/.test(evidence[key])))errors.push(`${c.id} invalid evidence`);
    if(!c.referenceBehaviour?.version || !c.referenceBehaviour?.source || !Array.isArray(c.referenceBehaviour?.fixtures) || typeof c.completion!=='string')errors.push(`${c.id} missing reference/completion contract`);
    if(c.status!=='deferred' && !c.acceptanceCriteria?.length)errors.push(`${c.id} has no executable acceptance`);
    for(const dep of c.dependencies??[])if(!byId.has(dep)||dep===c.id)errors.push(`${c.id} invalid dependency ${dep}`);
    for(const id of c.referenceBehaviour?.fixtures??[])if(!fixtures.some(f=>f.id===id))errors.push(`${c.id} unknown fixture ${id}`);
    const expected=fixtures.flatMap(f=>f.checks.filter(k=>k.capability===c.id).map(k=>`${f.id}:${k.operation}`));
    for(const criterion of expected)if(!c.acceptanceCriteria?.includes(criterion))errors.push(`${c.id} missing criterion ${criterion}`);
    for(const criterion of c.acceptanceCriteria??[])if(!expected.includes(criterion) && !['generated:statement-permutations','generated:alpha-renaming','generated:whitespace-invariance'].includes(criterion))errors.push(`${c.id} unknown criterion ${criterion}`);
    if(c.status==='accepted' && (!c.evidence?.length || c.dependencies?.some(d=>byId.get(d)?.status!=='accepted')))errors.push(`${c.id} accepted without evidence/accepted dependencies`);
    if(c.status==='ready' && c.dependencies?.some(d=>byId.get(d)?.status!=='accepted'))errors.push(`${c.id} ready with unmet dependencies`);
  }
  const visiting=new Set(),done=new Set();
  function visit(id) {if(visiting.has(id)){errors.push('capability dependency cycle');return;}if(done.has(id)||!byId.has(id))return;visiting.add(id);for(const dep of byId.get(id).dependencies??[])visit(dep);visiting.delete(id);done.add(id);}
  caps.forEach(c=>visit(c.id));
  const ids=new Set();
  for(const f of fixtures) {
    if(ids.has(f.id))errors.push('duplicate fixture id');ids.add(f.id);
    if(typeof f.source!=='string'||typeof f.oracle?.accepted!=='boolean'||!f.checks?.length)errors.push(`invalid fixture ${f.id}`);
    for(const check of f.checks??[])if(!byId.has(check.capability)||!['validate','parse','layout','render','security','determinism','benchmark'].includes(check.operation)||!check.expected)errors.push(`invalid fixture check ${f.id}`);
  }
  return errors;
}
