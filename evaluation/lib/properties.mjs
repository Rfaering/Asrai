// Seeded, reproducible generated cases; expectations are constructed independently of the product.
export function generatedChecks(capabilities, seed=1729) {
  let state=seed>>>0;
  const next=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state;};
  const cases=[];
  const add=(id,source,model,capability)=>cases.push({id,source,oracle:{accepted:true,model},checks:[{capability,operation:'parse',expected:{model}}]});
  for(let i=0;i<12;i++) {
    const names=[`N${next()%10000}`,`M${next()%10000}`,`P${next()%10000}`];
    const model={type:'flowchart',direction:'LR',nodes:names.map(id=>({id,label:id,shape:'rect'})),edges:[{source:names[0],target:names[1],label:'',directed:true},{source:names[1],target:names[2],label:'',directed:true}]};
    if(capabilities.has('FC007')) add(`generated-permutation-${i}`,`flowchart LR\n${names[1]} --> ${names[2]}\n${names[0]} --> ${names[1]}`,model,'FC007');
    if(capabilities.has('FC012')) {
      add(`generated-renaming-${i}`,`flowchart LR\n${names[0]} --> ${names[1]} --> ${names[2]}`,model,'FC012');
      add(`generated-whitespace-${i}`,`graph LR;\n%% seeded case ${i}\n  ${names[0]}  -->  ${names[1]} ;\n ${names[1]} --> ${names[2]};`,model,'FC012');
    }
  }
  return cases;
}
