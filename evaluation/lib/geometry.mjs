const finite = value => typeof value === 'number' && Number.isFinite(value);
export function geometryFailures(scene, model) {
  const failures = [];
  if (!scene || !finite(scene.width) || scene.width <= 0 || !finite(scene.height) || scene.height <= 0 || !Array.isArray(scene.nodes) || !Array.isArray(scene.edges)) return ['invalid scene'];
  const byId = new Map();
  for (const node of scene.nodes) {
    if (!node || ![node.x,node.y,node.width,node.height].every(finite) || node.width <= 0 || node.height <= 0) { failures.push('invalid node bounds'); continue; }
    if (byId.has(node.id)) failures.push('duplicate scene node');
    byId.set(node.id,node);
    if (node.x < 0 || node.y < 0 || node.x + node.width > scene.width + 0.01 || node.y + node.height > scene.height + 0.01) failures.push('node outside canvas');
  }
  if (JSON.stringify([...byId.keys()].sort()) !== JSON.stringify(model.nodes.map(n=>n.id).sort())) failures.push('scene node coverage differs');
  const nodes = [...byId.values()];
  for (let i=0;i<nodes.length;i++) for (let j=i+1;j<nodes.length;j++) {
    const a=nodes[i],b=nodes[j];
    if (a.x < b.x+b.width-0.01 && a.x+a.width > b.x+0.01 && a.y < b.y+b.height-0.01 && a.y+a.height > b.y+0.01) failures.push('node overlap');
  }
  const edgeKey = e => JSON.stringify([e.source,e.target]);
  if (JSON.stringify(scene.edges.map(edgeKey).sort()) !== JSON.stringify(model.edges.map(edgeKey).sort())) failures.push('scene edge coverage differs');
  for (const edge of scene.edges) {
    if (!Array.isArray(edge.points) || edge.points.length < 2 || edge.points.some(p=>!p || !finite(p.x) || !finite(p.y))) { failures.push('invalid edge path'); continue; }
    if(edge.points.some(p=>p.x<0||p.y<0||p.x>scene.width||p.y>scene.height))failures.push('edge outside canvas');
    for (const [id,point] of [[edge.source,edge.points[0]],[edge.target,edge.points.at(-1)]]) {
      const node=byId.get(id);
      if (!node) { failures.push('unknown edge endpoint'); continue; }
      const inside = point.x >= node.x-2 && point.x <= node.x+node.width+2 && point.y >= node.y-2 && point.y <= node.y+node.height+2;
      const boundary = Math.min(Math.abs(point.x-node.x),Math.abs(point.x-node.x-node.width),Math.abs(point.y-node.y),Math.abs(point.y-node.y-node.height)) <= 2;
      if (!inside || !boundary) failures.push('edge endpoint detached from node boundary');
    }
  }
  return [...new Set(failures)];
}
// Advisory proxy; readability still needs independent human review.
export function qualityMetrics(scene) {
  return { canvasArea: scene.width*scene.height, nodeDensity: scene.nodes.reduce((s,n)=>s+n.width*n.height,0)/(scene.width*scene.height), bends: scene.edges.reduce((s,e)=>s+Math.max(0,e.points.length-2),0) };
}
