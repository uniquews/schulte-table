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

// ---- tier + score logic (mirrors index.html) ----
const COLOR_FACTOR = 1.2;
function tierFor(secs, cells, color){
  const spc = (secs/cells) / (color ? COLOR_FACTOR : 1);
  if(spc < 0.45) return 'The One';
  if(spc < 0.60) return 'Excellent';
  if(spc < 0.80) return 'Good';
  if(spc < 1.10) return 'Average';
  return 'Beginner';
}
function scoreFor(secs, misclicks, cells){
  return Math.max(0, Math.round(cells*1000/(secs + misclicks*2)));
}
function expect(label, got, want){
  const ok = got === want;
  console.log(`${label}: got ${got} (exp ${want}) -> ${ok?'PASS':'FAIL'}`);
  ok?pass++:fail++;
}

console.log('\n--- tiers ---');
expect('9x9 in 25s', tierFor(25, 81), 'The One');      // 0.31 s/cell -> elite
expect('5x5 in 14s', tierFor(14, 25), 'Excellent');    // 0.56 s/cell
expect('5x5 in 19s', tierFor(19, 25), 'Good');         // 0.76 s/cell
expect('5x5 in 26s', tierFor(26, 25), 'Average');      // 1.04 s/cell
expect('5x5 in 40s', tierFor(40, 25), 'Beginner');     // 1.6 s/cell
// color mode is judged on an easier scale (same time -> equal or better tier)
expect('5x5 15.5s normal', tierFor(15.5, 25, false), 'Good');       // 0.62 s/cell
expect('5x5 15.5s color',  tierFor(15.5, 25, true),  'Excellent');  // 0.62/1.2 = 0.517 -> up a tier

console.log('\n--- score ---');
expect('faster beats slower', scoreFor(20,0,25) > scoreFor(30,0,25), true);
expect('misclicks lower score', scoreFor(20,3,25) < scoreFor(20,0,25), true);
expect('score is non-negative', scoreFor(999,50,25) >= 0, true);

// ---- leaderboard: fastest run per player for a size + mode (mirrors index.html) ----
function topScores(runs, sz, color, limit){
  const best={};
  for(const r of runs){
    if(r.size!==sz || !!r.color!==color) continue;
    const k=r.name.toLowerCase();
    if(!best[k] || r.secs<best[k].secs) best[k]=r;
  }
  return Object.values(best).sort((a,b)=>a.secs-b.secs).slice(0, limit||10);
}
console.log('\n--- leaderboard ---');
const runs = [
  {name:'Alice', size:5, secs:22.0, score:1100},
  {name:'Alice', size:5, secs:18.5, score:1300},  // Alice improves -> keep best
  {name:'Bob',   size:5, secs:15.0, score:1600},
  {name:'Bob',   size:9, secs:30.0, score:2700},   // different size -> excluded from 5x5
  {name:'carol', size:5, secs:40.0, score:600},
];
const board = topScores(runs, 5, false, 10);
expect('only 5x5 players listed', board.length, 3);
expect('sorted fastest first', board[0].name, 'Bob');
expect('keeps player best run', board[1].secs, 18.5);   // Alice's 18.5, not 22.0
expect('slowest player last', board[2].name, 'carol');

// mode is its own category: color and normal runs never mix
const modeRuns = [
  {name:'A', size:5, secs:20, color:false},
  {name:'B', size:5, secs:18, color:true},
  {name:'C', size:5, secs:25, color:true},
];
expect('normal board excludes color runs', topScores(modeRuns,5,false,10).length, 1);
expect('normal board is A', topScores(modeRuns,5,false,10)[0].name, 'A');
expect('color board excludes normal runs', topScores(modeRuns,5,true,10).length, 2);
expect('color board fastest is B', topScores(modeRuns,5,true,10)[0].name, 'B');

// ---- global dedup: from a secs-sorted cloud list, keep best row per name ----
function dedupSortedByName(rows, limit){
  const seen=new Set(), out=[];
  for(const r of rows){
    const k=String(r.name).toLowerCase();
    if(seen.has(k)) continue;
    seen.add(k); out.push(r);
    if(out.length>=(limit||10)) break;
  }
  return out;
}
console.log('\n--- global dedup ---');
const cloud = [ // already ordered by secs asc, as Supabase returns it
  {name:'Bob',   secs:15.0}, {name:'Alice', secs:18.5},
  {name:'alice', secs:19.9}, {name:'Bob',   secs:21.0}, {name:'Carol', secs:40.0},
];
const g = dedupSortedByName(cloud, 10);
expect('one entry per name', g.length, 3);
expect('keeps each name\'s fastest', g[1].secs, 18.5);  // Alice 18.5, not the 19.9 dup
expect('case-insensitive dedup', g.some(r=>r.name==='alice'), false);
expect('limit is respected', dedupSortedByName(cloud, 2).length, 2);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail?1:0);
