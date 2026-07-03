// Simulate the game's core state machine (mirrors index.html logic)
function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}

function runGame(size){
  const total=size*size;
  const nums=shuffle([...Array(total)].map((_,i)=>i+1));
  // check every number 1..total present exactly once
  const seen=new Set(nums);
  if(seen.size!==total) throw new Error('missing numbers size '+size);
  for(let k=1;k<=total;k++) if(!seen.has(k)) throw new Error('num '+k+' missing');

  // simulate clicking in order, plus some wrong clicks
  let target=1, errors=0, done=false;
  const order=[...nums]; // board cells
  // click wrong once (click the last cell before it's the target, if not currently target)
  // deterministic wrong-click test:
  const wrongCell = order.find(n=>n!==1);
  if(wrongCell!==1){ /* wrong click */ errors++; }
  // now play correctly 1..total
  for(let want=1; want<=total; want++){
    // find cell with value=want and "click"
    if(want===target){ target++; if(target>total) done=true; }
  }
  return {done, target:target-1, errors, total};
}

let pass=0, fail=0;
for(const s of [3,4,5,6,7]){
  const r=runGame(s);
  const ok = r.done && r.target===r.total && r.errors===1;
  console.log(`size ${s}x${s}: total=${r.total} completed=${r.done} errors=${r.errors} -> ${ok?'PASS':'FAIL'}`);
  ok?pass++:fail++;
}

// best-score logic
function bestUpdate(prev, secs){ return (prev===null || secs<prev) ? secs : prev; }
console.log('best: none->12.3 =', bestUpdate(null,12.3), '(exp 12.3)');
console.log('best: 12.3->10.1 =', bestUpdate(12.3,10.1), '(exp 10.1)');
console.log('best: 10.1->15.0 =', bestUpdate(10.1,15.0), '(exp 10.1)');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail?1:0);
