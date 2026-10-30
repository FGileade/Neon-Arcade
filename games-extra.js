/* Jogos adicionais do Neon Arcade. Carregado antes do motor principal. */
const CheckersGame = {
  board:[], selected:null, turn:'player', cell:0, tick:0,
  init(){
    this.cell=Math.floor(Math.min((canvas.width-24)/8,(canvas.height-130)/8));
    this.board=Array.from({length:8},()=>Array(8).fill(null));
    for(let r=0;r<3;r++)for(let c=0;c<8;c++)if((r+c)%2)this.board[r][c]='ai';
    for(let r=5;r<8;r++)for(let c=0;c<8;c++)if((r+c)%2)this.board[r][c]='player';
    this.selected=null;this.turn='player';this.tick=0;livesContainer.classList.add('hidden');
  },
  update(){
    const s=this.cell,ox=(canvas.width-s*8)/2,oy=(canvas.height-s*8)/2;
    if(Input.tap&&this.turn==='player'){
      const c=Math.floor((Input.x-ox)/s),r=Math.floor((Input.y-oy)/s);Input.tap=false;
      if(r>=0&&r<8&&c>=0&&c<8){
        if(this.selected){
          const [sr,sc]=this.selected,dr=r-sr,dc=c-sc;
          if(!this.board[r][c]&&Math.abs(dc)===1&&dr===-1){this.board[r][c]='player';this.board[sr][sc]=null;this.selected=null;this.turn='ai';addScore(10);}
          else if(!this.board[r][c]&&Math.abs(dc)===2&&dr===-2&&this.board[sr-1]?.[sc+dc/2]==='ai'){
            this.board[r][c]='player';this.board[sr][sc]=null;this.board[sr-1][sc+dc/2]=null;this.selected=null;this.turn='ai';addScore(30);
          }else this.selected=this.board[r][c]==='player'?[r,c]:null;
        }else if(this.board[r][c]==='player')this.selected=[r,c];
      }
    }
    if(this.turn==='ai'&&++this.tick>20){
      this.tick=0;const moves=[];
      for(let r=0;r<3;r++)for(let c=0;c<8;c++)if(this.board[r][c]==='ai')for(const dc of [-1,1]){
        const nr=r+1,nc=c+dc;if(nr<8&&nc>=0&&nc<8&&!this.board[nr][nc])moves.push([r,c,nr,nc]);
      }
      if(moves.length){const m=moves[Math.floor(Math.random()*moves.length)];this.board[m[2]][m[3]]='ai';this.board[m[0]][m[1]]=null;}
      this.turn='player';
    }
    for(let r=0;r<8;r++)for(let c=0;c<8;c++){
      ctx.fillStyle=(r+c)%2?'#80502e':'#e5c99e';ctx.fillRect(ox+c*s,oy+r*s,s,s);
      const p=this.board[r][c];if(p){ctx.beginPath();ctx.arc(ox+(c+.5)*s,oy+(r+.5)*s,s*.34,0,Math.PI*2);ctx.fillStyle=p==='player'?'#111':'#eee';ctx.fill();ctx.strokeStyle=p==='player'?'#0ff':'#f0f';ctx.lineWidth=3;ctx.stroke();}
    }
    if(this.selected){ctx.strokeStyle='#0ff';ctx.lineWidth=3;ctx.strokeRect(ox+this.selected[1]*s,oy+this.selected[0]*s,s,s);}
    ctx.fillStyle='#0ff';ctx.font='12px Orbitron';ctx.textAlign='center';ctx.fillText(this.turn==='player'?'Sua vez: selecione e mova uma peça':'Vez do adversário',canvas.width/2,oy-12);
  }
};
const BombermanGame = {
  map:[],player:null,enemies:[],bombs:[],tile:24,cols:13,rows:11,tick:0,
  init(){
    this.tile=Math.max(16,Math.min(30,Math.floor(Math.min((canvas.width-16)/13,(canvas.height-110)/11))));
    this.map=Array.from({length:11},(_,r)=>Array.from({length:13},(_,c)=>(r===0||c===0||r===10||c===12||(r%2===0&&c%2===0))?1:(Math.random()<.16?2:0)));
    this.map[1][1]=this.map[1][2]=this.map[2][1]=0;this.player={x:1,y:1};this.enemies=[{x:11,y:9},{x:11,y:1},{x:1,y:9}];this.bombs=[];this.tick=0;livesContainer.classList.remove('hidden');
  },
  update(){
    if(++this.tick%7===0){
      let dx=0,dy=0,k=Input.keys;if(k.ArrowLeft||k.a)dx=-1;else if(k.ArrowRight||k.d)dx=1;else if(k.ArrowUp||k.w)dy=-1;else if(k.ArrowDown||k.s)dy=1;
      if(this.map[this.player.y+dy]?.[this.player.x+dx]===0){this.player.x+=dx;this.player.y+=dy;}
      if(k[' ']||k.btnA){if(!this.bombs.some(b=>b.x===this.player.x&&b.y===this.player.y))this.bombs.push({x:this.player.x,y:this.player.y,t:95});}
      for(const e of this.enemies)if(Math.random()<.12){const d=[[1,0],[-1,0],[0,1],[0,-1]][Math.floor(Math.random()*4)];if(this.map[e.y+d[1]]?.[e.x+d[0]]===0){e.x+=d[0];e.y+=d[1];}}
    }
    for(let i=this.bombs.length-1;i>=0;i--){const b=this.bombs[i];if(--b.t<=0){
      for(const [dx,dy]of [[0,0],[1,0],[-1,0],[0,1],[0,-1]]){const x=b.x+dx,y=b.y+dy;if(this.map[y]?.[x]===2)this.map[y][x]=0;
        for(let j=this.enemies.length-1;j>=0;j--)if(this.enemies[j].x===x&&this.enemies[j].y===y){this.enemies.splice(j,1);addScore(100);}
      }createExplosion((b.x+.5)*this.tile,(b.y+.5)*this.tile,'#f80',16);this.bombs.splice(i,1);
    }}
    if(this.enemies.some(e=>e.x===this.player.x&&e.y===this.player.y)){if(loseLife())return setGameOver();this.player={x:1,y:1};}
    if(!this.enemies.length)return setGameOver('Fase concluída!');
    const t=this.tile,ox=(canvas.width-13*t)/2,oy=(canvas.height-11*t)/2;
    for(let y=0;y<11;y++)for(let x=0;x<13;x++){ctx.fillStyle=this.map[y][x]===1?'#586273':this.map[y][x]===2?'#98512d':'#17202b';ctx.fillRect(ox+x*t+1,oy+y*t+1,t-2,t-2);}
    for(const b of this.bombs){ctx.fillStyle='#ffb000';ctx.beginPath();ctx.arc(ox+(b.x+.5)*t,oy+(b.y+.5)*t,t*.3,0,Math.PI*2);ctx.fill();}
    for(const e of this.enemies){ctx.fillStyle='#f45';ctx.fillRect(ox+e.x*t+5,oy+e.y*t+5,t-10,t-10);}
    ctx.fillStyle='#0ff';ctx.fillRect(ox+this.player.x*t+4,oy+this.player.y*t+4,t-8,t-8);
  }
};
const PacmanGame = {
  map:[],player:null,ghosts:[],tile:0,cols:19,rows:15,tick:0,dots:0,
  init(){
    this.tile=Math.max(13,Math.min(24,Math.floor(Math.min((canvas.width-12)/19,(canvas.height-100)/15))));
    this.map=Array.from({length:15},(_,r)=>Array.from({length:19},(_,c)=>(r===0||c===0||r===14||c===18||((r%4===0)&&(c%4===0)))?1:2));
    for(let y=1;y<14;y++)for(let x=1;x<18;x++)if((x%6===0&&y%4!==0)||(y%6===0&&x%5!==0))this.map[y][x]=0;
    this.player={x:1,y:1,dir:[0,0]};this.ghosts=[{x:17,y:1,c:'#f55'},{x:17,y:13,c:'#f9f'},{x:1,y:13,c:'#5ff'}];this.tick=0;this.dots=this.map.flat().filter(v=>v===2).length;livesContainer.classList.remove('hidden');
  },
  update(){
    const k=Input.keys;if(k.ArrowLeft||k.a)this.player.dir=[-1,0];if(k.ArrowRight||k.d)this.player.dir=[1,0];if(k.ArrowUp||k.w)this.player.dir=[0,-1];if(k.ArrowDown||k.s)this.player.dir=[0,1];
    if(++this.tick%8===0){
      const [dx,dy]=this.player.dir,nx=this.player.x+dx,ny=this.player.y+dy;if(this.map[ny]?.[nx]!==1){this.player.x=nx;this.player.y=ny;}
      if(this.map[this.player.y][this.player.x]===2){this.map[this.player.y][this.player.x]=0;this.dots--;addScore(10);}
      for(const g of this.ghosts){const opts=[[1,0],[-1,0],[0,1],[0,-1]].filter(([gx,gy])=>this.map[g.y+gy]?.[g.x+gx]!==1);if(opts.length){const d=opts[Math.floor(Math.random()*opts.length)];g.x+=d[0];g.y+=d[1];}}
      if(this.ghosts.some(g=>g.x===this.player.x&&g.y===this.player.y)){if(loseLife())return setGameOver();this.player={x:1,y:1};}
      if(this.dots===0)return setGameOver('Labirinto concluído!');
    }
    const t=this.tile,ox=(canvas.width-19*t)/2,oy=(canvas.height-15*t)/2;
    for(let y=0;y<15;y++)for(let x=0;x<19;x++){ctx.fillStyle=this.map[y][x]===1?'#183a9e':'#050510';ctx.fillRect(ox+x*t,oy+y*t,t,t);if(this.map[y][x]===2){ctx.fillStyle='#ffe9a0';ctx.beginPath();ctx.arc(ox+(x+.5)*t,oy+(y+.5)*t,2,0,Math.PI*2);ctx.fill();}}
    ctx.fillStyle='#ffdf00';ctx.beginPath();ctx.arc(ox+(this.player.x+.5)*t,oy+(this.player.y+.5)*t,t*.42,.2,Math.PI*1.8);ctx.lineTo(ox+(this.player.x+.5)*t,oy+(this.player.y+.5)*t);ctx.fill();
    for(const g of this.ghosts){ctx.fillStyle=g.c;ctx.beginPath();ctx.arc(ox+(g.x+.5)*t,oy+(g.y+.5)*t,t*.4,Math.PI,0);ctx.lineTo(ox+(g.x+1)*t,oy+(g.y+1)*t);ctx.lineTo(ox+g.x*t,oy+(g.y+1)*t);ctx.fill();}
  }
};
const LoloGame = {
  map:[],player:null,tile:0,hearts:0,tick:0,
  init(){
    this.tile=Math.max(18,Math.min(34,Math.floor(Math.min((canvas.width-24)/9,(canvas.height-120)/9))));
    this.map=Array.from({length:9},(_,r)=>Array.from({length:9},(_,c)=>(r===0||c===0||r===8||c===8)?1:0));
    for(const [x,y]of [[3,2],[3,3],[5,3],[5,5],[2,6]])this.map[y][x]=1;
    this.map[2][2]=2;this.map[6][6]=3;this.player={x:1,y:1};this.hearts=0;this.tick=0;livesContainer.classList.add('hidden');
  },
  update(){
    if(++this.tick%8===0){let dx=0,dy=0,k=Input.keys;if(k.ArrowLeft||k.a)dx=-1;else if(k.ArrowRight||k.d)dx=1;else if(k.ArrowUp||k.w)dy=-1;else if(k.ArrowDown||k.s)dy=1;
      const nx=this.player.x+dx,ny=this.player.y+dy,v=this.map[ny]?.[nx];
      if(v===0||v===2||v===3){this.player.x=nx;this.player.y=ny;if(v===2){this.map[ny][nx]=0;this.hearts++;addScore(100);}if(v===3&&this.hearts>0)return setGameOver('Sala concluída!');}
      else if(v===1&&dx+dy!==0){const bx=nx+dx,by=ny+dy;if(this.map[by]?.[bx]===0){this.map[by][bx]=1;this.map[ny][nx]=0;this.player.x=nx;this.player.y=ny;}}
    }
    const t=this.tile,ox=(canvas.width-9*t)/2,oy=(canvas.height-9*t)/2;
    for(let y=0;y<9;y++)for(let x=0;x<9;x++){const v=this.map[y][x];ctx.fillStyle=v===1?'#315c9b':v===2?'#301c46':v===3?'#174b32':'#111827';ctx.fillRect(ox+x*t+1,oy+y*t+1,t-2,t-2);if(v===2||v===3){ctx.fillStyle=v===2?'#ff4d9d':'#0f8';ctx.font=(t*.65)+'px sans-serif';ctx.textAlign='center';ctx.fillText(v===2?'♥':'★',ox+(x+.5)*t,oy+(y+.72)*t);}}
    ctx.fillStyle='#ffd34e';ctx.beginPath();ctx.arc(ox+(this.player.x+.5)*t,oy+(this.player.y+.5)*t,t*.35,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#0ff';ctx.font='12px Orbitron';ctx.textAlign='center';ctx.fillText('Colete o coração e alcance a saída',canvas.width/2,oy-12);
  }
};
