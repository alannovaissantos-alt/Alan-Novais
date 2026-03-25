//// INÍCIO BLOCO 01 - CONSTANTES E DADOS ////
const CLASSES_DATA = {
  "Guerreiro":  { skill:"Fúria Inabalável",    cost:10, desc:"Soma +2 nos dados de ataque e +5 de dano extra, mas perde 5 HP por uso.",     getDano:s=>`Dano extra: +${s.FOR+5}`, hpSelf:5 },
  "Arqueiro":   { skill:"Chuva de Flechas",    cost:15, desc:"Dano em área: +1 nos dados e +3 de dano em cada adversário.",                 getDano:s=>`Dano em área: +${s.FOR+3}`, hpSelf:0 },
  "Mago":       { skill:"Colapso Arcano",      cost:20, desc:"Dano mágico +10 no HP do alvo.",                                              getDano:s=>`Dano mágico: +${s.INT+10}`, hpSelf:0 },
  "Necromante": { skill:"Corrente de Almas",   cost:15, desc:"Revive aliado caído com metade do HP total.",                                 getDano:s=>`Dano base: +${s.INT}`, hpSelf:0 },
  "Druida":     { skill:"Metamorfose Selvagem",cost:15, desc:"Vira uma fera: +2 nos dados de ataque e defesa por 2 rodadas.",               getDano:s=>`Dano fera: +${s.FOR}`, hpSelf:0 },
  "Soldado":    { skill:"Formação de Falange", cost:10, desc:"Aumenta a defesa dos aliados próximos em +2 na próxima rodada.",             getDano:s=>`Dano físico: +${s.FOR}`, hpSelf:0 },
  "Assassino":  { skill:"Golpe das Sombras",   cost:15, desc:"Dano TRIPLO se furtivo + veneno (−1 HP/rodada no adversário).",              getDano:s=>`DANO TRIPLO se furtivo (bônus: +${s.FOR})`, hpSelf:0 },
  "Bardo":      { skill:"Canção da Fagulha",   cost:10, desc:"Dá +2 nos dados de ataque para a equipe na próxima rodada.",                 getDano:s=>`Dano mágico: +${s.INT}`, hpSelf:0 }
};

const STAT_NAMES = {FOR:"Força",INT:"Inteligência",AGI:"Agilidade",VIT:"Vitalidade",CAR:"Carisma",SOR:"Sorte"};

const ATTR_INFO = {
  FOR: { icon:"💪", desc:"<strong>Força</strong> aumenta seu <em>bônus de dano</em> em ataques físicos e a sua <em>Carga Máxima</em> (+5kg por ponto).\nQuanto maior, mais você carrega e mais forte é seu golpe." },
  INT: { icon:"🧠", desc:"<strong>Inteligência</strong> aumenta sua <em>Mana Máxima</em> (+2 MP por ponto), essencial para usar habilidades de classe repetidas vezes." },
  AGI: { icon:"🌀", desc:"<strong>Agilidade</strong> aumenta seu <em>Dado de Iniciativa</em>, determinando quem age primeiro no combate. Quanto maior, mais chance de agir antes do inimigo." },
  VIT: { icon:"❤️", desc:"<strong>Vitalidade</strong> aumenta sua <em>Vida Máxima</em> (+3 HP por ponto). Personagens com alta VIT sobrevivem mais golpes." },
  CAR: { icon:"🗣️", desc:"<strong>Carisma</strong> dá <em>desconto na loja</em> ao comprar itens. A cada 2 pontos de CAR você ganha 10% de desconto (máximo 50%)." },
  SOR: { icon:"🍀", desc:"<strong>Sorte</strong> reduz o número mínimo para <em>Acerto Crítico</em>. A cada 2 pontos, o limite cai em 1 (mínimo 17+). Com SOR 6 você critica no 17 ou mais. Dado natural 20 é sempre crítico independente da Sorte." }
};
//// FIM BLOCO 01 ////

//// INÍCIO BLOCO 02 - ESTADO GLOBAL E INIT ////
let player = {
  name:"Desconhecido",cls:"Guerreiro",personality:"",personalityDesc:"",desc:"",
  skill:"Habilidade",cost:10,skillDesc:"Habilidade especial.",danoPronto:"—",
  finalStats:{FOR:2,INT:1,AGI:1,VIT:2,CAR:1,SOR:1},
  level:1,exp:0,hp:20,maxHp:20,mp:15,maxMp:15,
  freePoints:0,gold:0,maxLevelReached:1,
  inventory:[],buffs:[],hots:[],history:[],notes:"",isDead:false
};
let turnState='wait', actionsUsed={atk:0,pot:0,def:0};
let noteSort = 'newest';
let editingNoteId = null;
let notePage = 1;
let activeBarTarget='', selectedItem=null, isBuyMode=false;
let effMode='pos', pwdCallback=null, pendingStatAllocation=null;
let defIsReaction=false, defShieldTotal=0, lastAliveSnapshot=null;

function init() {
  let saved=localStorage.getItem('rpg_character');
  if(saved){
    let p=JSON.parse(saved);
    player={...player,...p};
    if(!player.history)   player.history=[];
    if(!player.buffs)     player.buffs=[];
    if(!player.hots)      player.hots=[];
    if(!player.inventory) player.inventory=[];
    if(player.gold===undefined) player.gold=0;
    if(!player.maxLevelReached) player.maxLevelReached=player.level;
    if(player.isDead===undefined) player.isDead=false;
    if(!player.skill&&player.skillName) player.skill=player.skillName;
    if(!player.cost&&player.skillCost)  player.cost=player.skillCost;
  } else {
    player.name="Herói"; player.cls="Assassino";
    player.personality="O Rato de Masmorra"; player.personalityDesc="A curiosidade vence o bom senso.";
    player.finalStats={FOR:3,INT:1,AGI:4,VIT:2,CAR:1,SOR:4};
  }

  // Migração: notes de string para array
  if (typeof player.notes === 'string') {
    if (player.notes.trim()) {
      player.notes = [{ id: Date.now(), title: 'Anotação Importada', body: player.notes, createdAt: Date.now(), updatedAt: Date.now() }];
    } else {
      player.notes = [];
    }
  }
  if (!Array.isArray(player.notes)) player.notes = [];

  let cd=CLASSES_DATA[player.cls];
  if(cd){ player.skill=cd.skill; player.cost=cd.cost; player.skillDesc=cd.desc; player.danoPronto=cd.getDano(player.finalStats); }
  recalcMaxStats();
  updateUI();
  switchTab('combate');
  if(player.isDead && player.hp<=0) document.getElementById('death-overlay').classList.add('show');
  else player.isDead=false; 
}
function saveGame(){ localStorage.setItem('rpg_character',JSON.stringify(player)); }
window.onload=init;
//// FIM BLOCO 02 ////

//// INÍCIO BLOCO 03 - UTILIDADES E MODAIS ////
function showModal(id){let e=document.getElementById(id);e.style.display='flex';setTimeout(()=>e.style.opacity='1',10);}
function closeModal(id){let e=document.getElementById(id);e.style.opacity='0';setTimeout(()=>{e.style.display='none';e.classList.remove('show');},200);}
function customAlert(t,txt){document.getElementById('alert-title').innerText=t;document.getElementById('alert-msg').innerHTML=txt;showModal('modal-alert');}
function customConfirm(t,txt,cb){document.getElementById('confirm-title').innerText=t;document.getElementById('confirm-msg').innerHTML=txt;document.getElementById('btn-confirm-action').onclick=()=>{cb();closeModal('modal-confirm');};showModal('modal-confirm');}
function showInfo(t,msg){document.getElementById('info-title').innerText=t;document.getElementById('info-msg').innerHTML=msg;showModal('modal-info');}
function spinDice(elId,val,crit=false){
  playSound('dice');
  let e=document.getElementById(elId); e.innerText=val; e.style.display='block';
  e.classList.remove('spin','critico'); void e.offsetWidth; e.classList.add('spin');
  if(crit) e.classList.add('critico');
}
//// FIM BLOCO 03 ////

//// INÍCIO BLOCO 04 - NAVEGAÇÃO E UI ////
function switchTab(tabId){
  document.querySelectorAll('.tab-content').forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  document.getElementById('tab-'+tabId).classList.add('active');
  document.getElementById('nav-'+tabId).classList.add('active');
  document.getElementById('bars-combat').style.display=tabId==='combate'?'block':'none';
  document.getElementById('bars-exp').style.display   =tabId==='ficha'  ?'block':'none';
  document.getElementById('bars-carga').style.display =tabId==='mochila'?'block':'none';
  document.getElementById('status-ribbon').classList.toggle('visible',tabId!=='combate');
  if(tabId==='combate'){
    document.getElementById('main-dice').innerText='🎲';
    document.getElementById('free-dice-detail').innerText='';
    document.getElementById('combat-log-main').innerText= turnState==='active'?'Seu turno! Escolha uma ação.':'Aguardando ação...';
  }
  if(tabId==='ficha')   renderFicha();
  if(tabId==='mochila') renderMochila();
  if(tabId==='diario')  renderNotesList();
  updateUI();
}

function updateUI(){
  document.getElementById('ui-gold').innerText  =player.gold;
  document.getElementById('ui-name').innerText  =player.name;
  document.getElementById('ui-class').innerText =player.cls;
  document.getElementById('ui-level').innerText =player.level;
  let en=getExpNext(player.level);
  document.getElementById('txt-exp').innerText   =`${player.exp}/${en}`;
  document.getElementById('bar-exp').style.width =`${Math.min(100,(player.exp/en)*100)}%`;
  
  let pMaxHp = player.maxHp, pMaxMp = player.maxMp, pMaxLoad = getMaxLoad();
  let pAtk = getPoderObj('atk').total, pDef = getPoderObj('def').total;

  if (pendingStatAllocation === 'VIT') pMaxHp = 20 + ((player.finalStats['VIT'] + 1) * 3) + getAccVal('hp') + getBuffVal('hp_max') + ((player.level - 1) * 2);
  if (pendingStatAllocation === 'INT') pMaxMp = 15 + ((player.finalStats['INT'] + 1) * 2) + getAccVal('mp') + getBuffVal('mp_max') + (player.level - 1);
  if (pendingStatAllocation === 'FOR') {
      pMaxLoad = 10 + ((player.finalStats['FOR'] + 1) * 5) + getAccVal('kg') + getBuffVal('kg') + ((player.level - 1) * 2);
      pAtk += 1;
  }

  let formatVal = (val, isPreview) => isPreview ? `<span style="color:#2e7d32;font-weight:900;">${val}</span>` : val;
  let hpShow=Math.max(0,player.hp);
  
  document.getElementById('txt-hp').innerHTML   =`${hpShow}/${formatVal(pMaxHp, pendingStatAllocation==='VIT')}`;
  document.getElementById('bar-hp').style.width =`${Math.max(0,(hpShow/pMaxHp)*100)}%`;
  document.getElementById('txt-mp').innerHTML   =`${player.mp}/${formatVal(pMaxMp, pendingStatAllocation==='INT')}`;
  document.getElementById('bar-mp').style.width =`${Math.max(0,(player.mp/pMaxMp)*100)}%`;
  document.getElementById('ribbon-hp').innerHTML=`${hpShow}/${formatVal(pMaxHp, pendingStatAllocation==='VIT')}`;
  document.getElementById('ribbon-mp').innerHTML=`${player.mp}/${formatVal(pMaxMp, pendingStatAllocation==='INT')}`;
  
  let cCur=getCurrentLoad();
  let cStr=`${parseFloat(cCur.toFixed(1))}/${formatVal(pMaxLoad, pendingStatAllocation==='FOR')}kg`;
  document.getElementById('txt-carga').innerHTML    =cStr;
  document.getElementById('ribbon-carga').innerHTML =cStr;
  
  let wc=document.getElementById('warn-carga');
  if(cCur>pMaxLoad){wc.style.display='block';wc.innerText=cCur/pMaxLoad>=1.25?'⚠️ Sobrecarga Crítica! (sem ataques)':'⚠️ Sobrecarga Leve! (−1 HP/turno)';}
  else wc.style.display='none';
  
  document.getElementById('lbl-hp').className    =getBuffVal('hp_max')>0?'buff-aura':'';
  document.getElementById('lbl-mp').className    =getBuffVal('mp_max')>0?'buff-aura':'';
  document.getElementById('lbl-carga').className =getBuffVal('kg')>0?'buff-aura':'';
  document.body.classList.toggle('low-hp',player.hp>0&&player.hp<=player.maxHp*0.20);
  if(player.hp > player.maxHp * 0.3) document.body.classList.remove('low-hp-revive');
  
  let over=(getCurrentLoad()/getMaxLoad()>=1.25);
  document.getElementById('count-atk').innerText=`${actionsUsed.atk}/1`;
  let bA=document.getElementById('btn-atk'), bD=document.getElementById('btn-def'), bS=document.getElementById('btn-skill');
  if(turnState==='active'){
    bA.disabled=actionsUsed.atk>=1||over;
    bS.disabled=actionsUsed.atk>=1||over;
    bD.disabled=actionsUsed.def>=1; 
  } else { bA.disabled=true; bD.disabled=true; bS.disabled=true; }
  
  let disc=getCarismaDiscount(), ci=document.getElementById('carisma-info');
  if(disc>0){ci.style.display='block';document.getElementById('carisma-discount').innerText=disc+'%';}
  else ci.style.display='none';
  renderBuffsList();
  
  let elAtk = document.getElementById('ui-tot-atk'); if(elAtk) elAtk.innerHTML = formatVal(pAtk, pendingStatAllocation==='FOR');
  let elDef = document.getElementById('ui-tot-def'); if(elDef) elDef.innerHTML = formatVal(pDef, false);
  let ribAtk = document.getElementById('ribbon-atk'); if(ribAtk) ribAtk.innerHTML = formatVal(pAtk, pendingStatAllocation==='FOR');
  let ribDef = document.getElementById('ribbon-def'); if(ribDef) ribDef.innerHTML = formatVal(pDef, false);
  saveGame();
}

function renderBuffsList(){
  let d=document.getElementById('active-buffs-container'); d.innerHTML='';
  player.buffs.forEach(b=>{
    let color = b.value > 0 ? '#8e24aa' : '#b71c1c';
    let bg = b.value > 0 ? 'rgba(156,39,176,0.1)' : 'rgba(211,47,47,0.1)';
    let sinal = b.value > 0 ? '+' : '';
    let icone = b.value > 0 ? '⚡' : '⚠️';
    d.innerHTML+=`<div style="font-size:11px;background:${bg};border-left:3px solid ${color};padding:4px 8px;border-radius:4px;color:var(--ink);">${icone} ${b.name}: ${sinal}${b.value} ${b.type.toUpperCase()} (${b.duration} turnos)</div>`;
  });
  player.hots.forEach(h=>{
    let color = h.amount > 0 ? '#388e3c' : '#b71c1c';
    let bg = h.amount > 0 ? 'rgba(56,142,60,0.1)' : 'rgba(211,47,47,0.1)';
    let sinal = h.amount > 0 ? '+' : '';
    let icone = h.amount > 0 ? '💚' : '🩸';
    d.innerHTML+=`<div style="font-size:11px;background:${bg};border-left:3px solid ${color};padding:4px 8px;border-radius:4px;color:var(--ink);">${icone} ${h.name}: ${sinal}${h.amount} ${h.target.toUpperCase()}/turno (${h.duration} turnos)</div>`;
  });
}

function showPoderDetail(type) {
  let p = getPoderObj(type);
  let title = type === 'atk' ? '⚔️ Detalhes do Ataque' : '🛡️ Detalhes da Defesa';
  let msg = `<div style="text-align:left; font-size:14px; line-height:1.8;">`;
  if(type === 'atk') msg += `<strong>Base (Força):</strong> +${p.base}<br>`;
  msg += `<strong>Bônus de Nível (Nv. ${player.level}):</strong> +${p.lvl}<br>`;
  msg += `<strong>Arma/Armadura Equipadas:</strong> +${p.eq}<br>`;
  msg += `<strong>Acessórios Passivos:</strong> +${p.acc}<br>`;
  msg += `<strong>Efeitos Temporários:</strong> +${p.buff}<br>`;
  msg += `<hr style="border:0; border-top:1px dashed rgba(0,0,0,0.2); margin:10px 0;">`;
  msg += `<div style="text-align:center; font-size:24px; font-weight:900; font-family:'Cinzel'; color:var(--ink);">TOTAL: ${p.total}</div>`;
  msg += `</div><p style="font-size:11px; color:#666; margin-top:10px; line-height:1.4;">*Este valor será somado automaticamente ao resultado do seu dado em combate.</p>`;
  customAlert(title, msg);
}
//// FIM BLOCO 04 ////

//// INÍCIO BLOCO 05 - BARRAS E STATUS ////
function getExpNext(lvl){return Math.floor(100*Math.pow(1.35,lvl-1));}
function getEqVal(type) {return player.inventory.filter(i=>i.type===type&&i.equipped).reduce((s,i)=>s+i.value,0);}
function getAccVal(bt)  {return player.inventory.filter(i=>i.type==='acc'&&i.equipped&&i.useType===bt).reduce((s,i)=>s+i.value,0);}
function getBuffVal(bt) {return player.buffs.filter(b=>b.type===bt).reduce((s,b)=>s+b.value,0);}

function getStat(s) { return player.finalStats[s] + getBuffVal(s); }

function getPoderObj(type){
  let base = type==='atk' ? getStat('FOR') : 0;
  let lvl = player.level - 1;
  let eq = getEqVal(type);
  let acc = getAccVal(type);
  let buff = getBuffVal(type);
  let total = base + lvl + eq + acc + buff;
  return {base, lvl, eq, acc, buff, total};
}

function getMaxLoad()   {return 10+(getStat('FOR')*5)+getAccVal('kg')+getBuffVal('kg')+((player.level-1)*2);}
function getCurrentLoad(){return player.inventory.reduce((s,i)=>{let w=i.weight||0;if(i.equipped&&i.type!=='use')w/=2;return s+w;},0);}
function getCritThreshold() { return Math.max(17, 20 - Math.floor(getStat('SOR') / 2)); }
function getCarismaDiscount(){return Math.min(50,Math.floor(getStat('CAR')/2)*10);}

function recalcMaxStats(){
  player.maxHp=20+(getStat('VIT')*3)+getAccVal('hp')+getBuffVal('hp_max')+((player.level-1)*2);
  player.maxMp=15+(getStat('INT')*2)+getAccVal('mp')+getBuffVal('mp_max')+(player.level-1);
  if(player.hp>player.maxHp) player.hp=player.maxHp;
  if(player.mp>player.maxMp) player.mp=player.maxMp;
  let cd=CLASSES_DATA[player.cls]; if(cd) player.danoPronto=cd.getDano({FOR: getStat('FOR'), INT: getStat('INT'), AGI: getStat('AGI'), VIT: getStat('VIT'), CAR: getStat('CAR'), SOR: getStat('SOR')});
}

// FIX: Função centralizada para checar Level Up de qualquer fonte (Mestre ou Poção)
function checkLevelUp() {
  let leveled = false;
  while(player.exp >= getExpNext(player.level)){
    player.exp -= getExpNext(player.level); 
    player.level++;
    if(player.level > player.maxLevelReached){
        player.freePoints++;
        player.maxLevelReached = player.level;
    }
    recalcMaxStats(); 
    player.hp = player.maxHp; 
    player.mp = player.maxMp;
    leveled = true;
  }
  if(leveled) customAlert("🎉 NÍVEL UP!",`Você atingiu o Nível ${player.level}!<br>Vida e Mana restauradas.`);
}

function openBarModal(target){
  activeBarTarget=target;
  document.getElementById('bar-val-input').value='';
  document.getElementById('bar-title').innerText='Ajustar '+{exp:'Experiência',hp:'Vida (HP)',mp:'Mana (MP)'}[target];
  document.getElementById('btn-bar-sub').style.display=target==='exp'?'none':'block';
  showModal('modal-bar-action');
}
function executeBarAction(op){ if(player.isDead) return;
  let val=parseInt(document.getElementById('bar-val-input').value);
  if(isNaN(val)||val<=0) return;
  closeModal('modal-bar-action');
  if(activeBarTarget==='exp'&&op==='add'){
    logAction('exp',val,`Ganhou ${val} EXP`); 
    player.exp+=val;
    checkLevelUp(); // <- Chama a nova função
  } else if(activeBarTarget==='hp'){
    if(op==='add'){player.hp=Math.min(player.maxHp,player.hp+val);logAction('hp',val,`Curou ${val} HP`);}
    if(op==='sub'){playSound('hit');player.hp-=val;logAction('hp',-val,`Sofreu ${val} dano`);}
  } else if(activeBarTarget==='mp'){
    if(op==='add'){player.mp=Math.min(player.maxMp,player.mp+val);logAction('mp',val,`Recuperou ${val} Mana`);}
    if(op==='sub'){player.mp=Math.max(0,player.mp-val);logAction('mp',-val,`Gastou ${val} Mana`);}
  }
  updateUI();
  if(player.hp<=0) promptDeath();
}
//// FIM BLOCO 05 ////

//// INÍCIO BLOCO 06 - COMBATE E TURNOS ////
function startTurn(){ if(player.isDead) return;
  turnState='active'; actionsUsed={atk:0,pot:0,def:0};
  document.getElementById('main-dice').innerText='🎲';
  document.getElementById('free-dice-detail').innerText='';
  document.getElementById('combat-log-main').innerText='Seu turno! Escolha uma ação.';
  document.getElementById('wait-overlay').classList.add('hidden');
  updateUI();
}

function endTurn(){ if(player.isDead) return;
  let logs='';
  let cMax=getMaxLoad(), cCur=getCurrentLoad(), pct=cCur/cMax;
  
  // FIX: Trava a perda de HP por peso em ZERO (não fica negativo)
  if(pct>=1.25){player.hp=Math.max(0, player.hp - 5);logs+='💔 Sobrecarga Severa: −5 HP.<br>';logAction('hp',-5,'Dano por Sobrecarga',false);}
  else if(pct>1.0){player.hp=Math.max(0, player.hp - 1);logs+='💔 Sobrecarga Leve: −1 HP.<br>';logAction('hp',-1,'Dano por Sobrecarga',false);}
  
  let rHp=getAccVal('+hp'), rMp=getAccVal('+mp');
  if(rHp>0){player.hp=Math.min(player.maxHp,player.hp+rHp);logs+=`💍 Passiva: +${rHp} HP.<br>`;}
  if(rMp>0){player.mp=Math.min(player.maxMp,player.mp+rMp);logs+=`💍 Passiva: +${rMp} Mana.<br>`;}
  
  for(let i=player.hots.length-1;i>=0;i--){
    let h=player.hots[i];
    if(h.target==='hp') { player.hp=Math.max(0, Math.min(player.maxHp, player.hp+h.amount)); }
    else { player.mp=Math.max(0, Math.min(player.maxMp, player.mp+h.amount)); }
    
    let icone = h.amount > 0 ? '💚' : '🩸';
    let sinal = h.amount > 0 ? '+' : '';
    logs+=`${icone} ${h.name}: ${sinal}${h.amount} ${h.target.toUpperCase()}<br>`;
    
    h.duration--; 
    if(h.duration<=0) {
        logs += `<span style="color:#888; font-size:11px;">↳ ⏳ Efeito encerrou.</span><br><br>`;
        player.hots.splice(i,1);
    } else {
        logs += `<span style="color:#888; font-size:11px;">↳ ⏳ Restam ${h.duration} turno(s).</span><br><br>`;
    }
  }
  
  let bEnd=false;
  for(let i=player.buffs.length-1;i>=0;i--){
    let b = player.buffs[i];
    b.duration--;
    if(b.duration<=0){
        logs+=`⏳ O efeito de "${b.name}" encerrou.<br>`;
        player.buffs.splice(i,1);
        bEnd=true;
    } else {
        logs+=`⚡ "${b.name}" ativo. <span style="color:#888; font-size:11px;">Restam ${b.duration} turno(s).</span><br>`;
    }
  }
  if(bEnd) recalcMaxStats();
  
  turnState='wait'; actionsUsed={atk:0,pot:0,def:0};
  document.getElementById('wait-overlay').classList.remove('hidden');
  document.getElementById('init-dice').style.display='none';
  document.getElementById('init-detail').style.display='none';
  document.getElementById('main-dice').innerText='🎲';
  document.getElementById('free-dice-detail').innerText='';
  document.getElementById('combat-log-main').innerText='Aguardando ação...';
  logAction('sys',0,'Encerrou o Turno',false);
  updateUI();
  
  if(player.hp<=0) promptDeath();
  else if(logs) customAlert("Relatório do Turno", logs);
}

function rollInitiative(){
  let d=Math.floor(Math.random()*20)+1, agi=getStat('AGI');
  document.getElementById('init-d').innerText=d; document.getElementById('init-agi').innerText=agi;
  document.getElementById('init-tot').innerText=d+agi; document.getElementById('init-detail').style.display='block';
  spinDice('init-dice',d);
}

function rollFreeDice(){
  let d=Math.floor(Math.random()*20)+1, crit=d>=getCritThreshold();
  let agi=getStat('AGI');
  spinDice('main-dice',d,crit);
  document.getElementById('free-dice-detail').innerHTML=`AGI: ${agi} &nbsp;|&nbsp; Total: <strong>${d+agi}</strong>`;
  document.getElementById('combat-log-main').innerHTML=crit
    ?`🎲 Dado: <strong style="color:var(--gold);">${d} ★ CRÍTICO!</strong>`
    :`🎲 Dado: <strong>${d}</strong>`;
  if(crit) triggerCritEffect();
}

function getD20(limitW){
  let d=Math.floor(Math.random()*20)+1;
  if(limitW&&getCurrentLoad()>getMaxLoad()&&d>10){customAlert("Exaustão de Peso","O excesso de peso limitou seu dado a 10.");return 10;}
  return d;
}

function triggerCritEffect(){
  playSound('crit');
  document.body.classList.remove('crit-flash'); void document.body.offsetWidth;
  document.body.classList.add('crit-flash'); setTimeout(()=>document.body.classList.remove('crit-flash'),800);
}

function actionAtk(){ if(player.isDead) return;
  let d=getD20(true); actionsUsed.atk++;
  let crit=d>=getCritThreshold();
  let p = getPoderObj('atk');
  let tot = d + p.total;
  let critLabel=crit?` <span class="crit-badge">★ CRÍTICO!</span>`:'';
  spinDice('main-dice',d,crit);
  document.getElementById('free-dice-detail').innerText='';
  document.getElementById('combat-log-main').innerHTML =
    `⚔️ Ataque${critLabel}<br>
    <span style="font-size:17px;font-family:'Cinzel';font-weight:900;letter-spacing:0.5px;">
      Dado(<span style="color:var(--gem-blue);">${d}</span>) + Poder(<span style="color:var(--ink-light);">${p.total}</span>) = <span style="color:var(--gem-red);font-size:20px;">${tot}</span>
    </span>`;
  if(crit) triggerCritEffect();
  logAction('sys',0,`Atacou: ${tot}${crit?' (CRÍTICO)':''}`,false);
  updateUI();
}

function openDefModal(isReaction){ if(player.isDead) return;
  defIsReaction=isReaction;
  document.getElementById('def-title').innerText=isReaction?'🛡️ Defesa (Reação)':'🛡️ Defesa';
  document.getElementById('def-dice-display').innerText='...';
  document.getElementById('def-log').innerText='';
  document.getElementById('def-damage-area').style.display='none';
  document.getElementById('def-damage-input').value='';
  showModal('modal-def');
  setTimeout(()=>{
    let d=getD20(false);
    let p = getPoderObj('def');
    defShieldTotal = d + p.total;
    let el=document.getElementById('def-dice-display');
    el.innerText=d; el.classList.remove('spin'); void el.offsetWidth; el.classList.add('spin');
    document.getElementById('def-log').innerHTML=`Dado(${d}) + Escudo Total(${p.total})<br><strong style="font-size:16px;">🛡️ Defesa Final: ${defShieldTotal}</strong>`;
    document.getElementById('def-damage-area').style.display='block';
    if(!isReaction){ actionsUsed.def++; updateUI(); }
    logAction('sys',0,`Defendeu: Escudo ${defShieldTotal}`,false);
  },500);
}

function applyDefDamage(){ if(player.isDead) return;
  let raw=parseInt(document.getElementById('def-damage-input').value);
  if(isNaN(raw)||raw<0) return;
  let real=Math.max(0,raw-defShieldTotal);
  closeModal('modal-def');
  if(real>0){
    playSound('hit');
    player.hp-=real; logAction('hp',-real,`Sofreu ${real} dano após defesa`);
    customAlert("💥 Dano Recebido",`Ataque Monstro: ${raw}<br>Seu Escudo: ${defShieldTotal}<br><strong>Dano real que passou: ${real} HP</strong>`);
  } else {
    customAlert("🛡️ Defesa Perfeita!",`Ataque Monstro: ${raw} | Seu Escudo: ${defShieldTotal}<br><strong>Você defendeu tudo! Nenhum dano.</strong>`);
  }
  updateUI(); if(player.hp<=0) promptDeath();
}

function actionSkill(){ if(player.isDead) return;
  let cd=CLASSES_DATA[player.cls]||{};
  let cost=cd.cost||player.cost||10, skill=cd.skill||player.skill, desc=cd.desc||player.skillDesc;
  if(player.mp<cost) return customAlert("Sem Mana",`${skill} custa ${cost} Mana. Você tem ${player.mp}.`);
  if(player.cls==="Guerreiro"&&cd.hpSelf>0) player.hp=Math.max(1,player.hp-cd.hpSelf);
  player.mp-=cost; actionsUsed.atk++;
  let d=getD20(true), crit=d>=getCritThreshold();
  spinDice('main-dice',d,crit);
  document.getElementById('free-dice-detail').innerText='';
  let p = getPoderObj('atk');
  let skillTot = d + p.total;
  document.getElementById('combat-log-main').innerHTML =
    `🔥 <strong>${skill}</strong>${crit ? '<span class="crit-badge" style="margin-left:6px;">★ CRÍTICO!</span>' : ''}<br>
    <em style="font-size:11px;color:var(--ink-light);">${desc}</em><br>
    <span style="font-size:17px;font-family:'Cinzel';font-weight:900;">
      Dado(<span style="color:var(--gem-blue);">${d}</span>) + Poder(<span style="color:var(--ink-light);">${p.total}</span>) = <span style="color:var(--gem-red);font-size:20px;">${skillTot}</span>
    </span><br>
    <span style="font-size:12px;color:var(--ink-light);">Mana: −${cost}</span>`;
  if(crit) triggerCritEffect();
  logAction('mp',-cost,`Usou ${skill}`); updateUI();
  if(player.hp<=0) promptDeath();
}

function promptDeath(){
  document.querySelectorAll('.modal-overlay').forEach(m => {
    m.style.opacity='0'; 
    setTimeout(() => { m.style.display='none'; m.classList.remove('show'); }, 200);
  });
  lastAliveSnapshot = JSON.parse(JSON.stringify(player));
  player.hp = 0; 
  player.isDead = true; 
  saveGame();
  playSound('death');
  document.getElementById('death-overlay').classList.add('show');
}

function revivePlayer(){ 
  requirePassword(() => {
    document.getElementById('death-overlay').classList.remove('show');
    player.hp = 10;
    player.isDead = false;
    document.body.classList.add('low-hp-revive');
    logAction('hp', 10, 'Revivido pelo Mestre');
    updateUI();
    customAlert("⚕️ Revivido!", `${player.name} retornou dos mortos com 10 HP!`);
  }); 
}

function useRevivePotion() {
  let potion = player.inventory.find(i => i.type === 'use' && i.name.toLowerCase().includes('ressuscitar'));
  if (potion) {
    customConfirm("🧪 Usar Poção", `Deseja usar a poção "${potion.name}" para reviver?`, () => {
      player.inventory = player.inventory.filter(i => i.id !== potion.id);
      document.getElementById('death-overlay').classList.remove('show');
      player.hp = 10;
      player.isDead = false;
      document.body.classList.add('low-hp-revive');
      logAction('hp', 10, `Revivido por ${potion.name}`);
      updateUI();
      customAlert("✨ Ressurreição!", `A poção trouxe ${player.name} de volta à vida!`);
    });
  } else {
    customAlert("😔 Sem Poção", "Você não tem nenhuma poção de ressuscitar na mochila.");
  }
}

function exportLastState() {
  if(!lastAliveSnapshot) return customAlert("Erro", "Nenhum estado salvo encontrado.");
  
  // Cria uma cópia do snapshot e injeta 10 de HP para o personagem não voltar morto
  let exportData = JSON.parse(JSON.stringify(lastAliveSnapshot));
  exportData.hp = 10;
  exportData.isDead = false;
  
  let code = btoa(encodeURIComponent(JSON.stringify(exportData)));
  navigator.clipboard.writeText(code).then(() => {
    alert("✅ Último estado salvo copiado para a área de transferência! (Personagem terá 10 HP)");
  }).catch(() => {
    prompt("Copie o código abaixo (Personagem terá 10 HP):", code);
  });
}

function endGameDeath() {
  customConfirm("🛑 Fim da Linha", "Tem certeza que deseja encerrar a partida? Seu personagem será apagado do navegador.", () => {
    localStorage.removeItem('rpg_character');
    window.location.href = 'index.html';
  });
}
//// FIM BLOCO 06 ////

//// INÍCIO BLOCO 07 - MOCHILA E LOJA ////
function renderMochila(){
  let list=document.getElementById('inventory-list'); list.innerHTML='';
  if(!player.inventory.length){list.innerHTML="<p style='text-align:center;color:#666;padding:20px;'>Mochila vazia.</p>";return;}
  [...player.inventory].sort((a,b)=>b.equipped-a.equipped).forEach(i=>{
    let icon=i.type==='atk'?'⚔️':i.type==='def'?'🛡️':i.type==='acc'?'💍':'🧪';
    let w=i.weight||0;
    let wShow=(i.equipped&&i.type!=='use')?`<del style="opacity:0.4;">${w}kg</del> <strong>${w/2}kg</strong>`:`${w}kg`;
    
    let badge = i.equipped ? `<span style="background:var(--gold); color:var(--ink); font-size:9px; padding:2px 6px; border-radius:4px; font-weight:bold; margin-left:8px; vertical-align:middle; letter-spacing:0.5px;">EQUIPADO</span>` : '';
    
    list.innerHTML+=`<div class="list-item ${i.equipped?'equipped':''} ${i.desc?'item-glow':''}" onclick="openItemAction(${i.id})">
      <div class="item-info">
        <div class="item-name" style="align-items:center;"><span>${icon} ${i.name} ${badge}</span><span style="font-size:11px;">${wShow}</span></div>
        <div class="item-sub">${i.type==='use'?'Consumível':`+${i.value}`}</div>
      </div></div>`;
  });
}
function openItemAction(id){
  selectedItem=player.inventory.find(i=>i.id===id); let i=selectedItem;
  document.getElementById('item-action-title').innerText=(i.equipped?'⭐ ':'')+i.name;
  let desc=i.type==='use'?'Consumível — efeito ao usar':i.type==='acc'?`Bônus: +${i.value} ${(i.useType||'').toUpperCase()}`:`Poder Bruto: +${i.value}`;
  document.getElementById('item-action-desc').innerHTML=`${desc}<br>💰 Preço base: ${i.price||0}G`;
  let wi=document.getElementById('item-weight-info'), w=i.weight||0;
  if(i.type!=='use'){wi.style.display='block';wi.innerHTML=i.equipped?`📦 Equipado: <strong>${w/2}kg</strong> (peso original: ${w}kg — itens equipados pesam metade!)`:`📦 Peso: <strong>${w}kg</strong> → se equipar: <strong>${w/2}kg</strong> (equipado pesa metade)`;}
  else wi.style.display='none';
  let le=document.getElementById('item-action-lore');
  if(i.desc){le.style.display='block';le.innerText=`"${i.desc}"`;}else le.style.display='none';
  let be=document.getElementById('btn-item-equip');
  if(i.type==='use'){be.innerText='🧪 Beber / Usar';be.className='btn btn-blue';}
  else{be.innerText=i.equipped?'↩️ Desequipar':'✅ Equipar';be.className='btn btn-primary';}
  showModal('modal-item-action');
}
function executeItemAction(action){
  let i=selectedItem; closeModal('modal-item-action');
  if(action==='drop'){
      customConfirm("Jogar Fora?",`Descartar "${i.name}"?`,()=>{
          player.inventory=player.inventory.filter(x=>x.id!==i.id);
          recalcMaxStats(); // FIX: Agora atualiza se jogar item fora equipado
          renderMochila();
          updateUI();
      });
  }
  else if(action==='equip'){if(i.type==='use')consumePotion(i.id);else{i.equipped=!i.equipped;recalcMaxStats();renderMochila();updateUI();}}
  else if(action==='sell'){
    if(!i.price||i.price<=0) return customAlert("Sem Valor","Este item não tem preço base definido.");
    let m=Math.max(1,Math.floor(i.price*0.75));
    document.getElementById('sell-slider').max=m; document.getElementById('sell-slider').value=Math.floor(m/2);
    document.getElementById('sell-price-display').innerText=Math.floor(m/2); showModal('modal-sell');
  }
}
function confirmSell(){
  let v=parseInt(document.getElementById('sell-slider').value);
  player.gold+=v; logAction('sell',v,`Vendeu ${selectedItem.name}`);
  player.inventory=player.inventory.filter(x=>x.id!==selectedItem.id);
  closeModal('modal-sell'); 
  recalcMaxStats(); // FIX: Agora atualiza a força/peso se vender item equipado
  renderMochila(); 
  updateUI();
  customAlert("Vendido!",`Mercador pagou 💰${v}G.`);
}
function promptEditItem(){
  closeModal('modal-item-action');
  requirePassword(()=>{
    isBuyMode=false; let i=selectedItem;
    document.getElementById('add-item-title').innerText="Editar Item";
    document.getElementById('item-type').value=i.type; toggleItemType();
    document.getElementById('item-name').value=i.name; document.getElementById('item-lore').value=i.desc||'';
    document.getElementById('item-val').value=i.value; document.getElementById('item-price').value=i.price||0;
    document.getElementById('item-weight').value=i.weight;
    if(i.type==='acc'&&i.useType) document.getElementById('item-acc-type').value=i.useType;
    document.getElementById('btn-save-item').innerText="SALVAR EDIÇÃO"; showModal('modal-add-item');
  });
}

function openAddItemModal(mode){
  isBuyMode=(mode==='buy'); selectedItem=null;
  document.getElementById('add-item-title').innerText=isBuyMode?'Comprar na Loja':'Achar Item';
  document.getElementById('btn-save-item').innerText=isBuyMode?'COMPRAR':'ADICIONAR';
  ['item-name','item-lore','item-val','item-price','item-weight','item-gold-val'].forEach(id=>document.getElementById(id).value='');

  let lblPrice = document.getElementById('lbl-item-price');
  if(lblPrice) lblPrice.innerText = isBuyMode ? 'Valor Pago (G)' : 'Valor de Mercado (G)';

  let optGold = document.getElementById('opt-gold');
  if(optGold) optGold.style.display = isBuyMode ? 'none' : 'block';

  let typeSel = document.getElementById('item-type');
  if(isBuyMode && typeSel.value === 'gold') typeSel.value = 'atk'; 

  typeSel.value='atk'; toggleItemType(); showModal('modal-add-item');
}
function toggleItemType(){
  let t=document.getElementById('item-type').value;
  let wN=document.getElementById('wrap-normal-fields'), wG=document.getElementById('wrap-gold-fields');
  
  if(t==='gold' && !isBuyMode){
    wN.style.display='none'; wG.style.display='block'; 
    document.getElementById('btn-save-item').innerText='GUARDAR OURO'; return;
  }

  wN.style.display='block'; wG.style.display='none';
  document.getElementById('wrap-name').style.display=t==='use'?'none':'block';
  document.getElementById('item-use-wrap').style.display=t==='use'?'block':'none';
  document.getElementById('item-acc-wrap').style.display=t==='acc'?'block':'none';
  let ww=document.getElementById('wrap-weight');
  if(t==='use'){ww.style.display='none';document.getElementById('item-weight').value=0.5;}else ww.style.display='flex';
  toggleDurationField();
}
function toggleDurationField(){
  let u=document.getElementById('item-use-type').value;
  document.getElementById('item-duration').style.display=(u.includes('hot')||u.includes('buff'))?'block':'none';
}
function autoGenerateWeight(){
  let p=parseInt(document.getElementById('item-val').value)||1, t=document.getElementById('item-type').value;
  document.getElementById('item-weight').value=t==='acc'?Math.max(1,Math.ceil(p/4)):Math.max(1,Math.floor(p*1.2));
}
function saveItem(){
  let t=document.getElementById('item-type').value;
  if(t==='gold' && !isBuyMode){
    let v=parseInt(document.getElementById('item-gold-val').value)||0;
    if(v<=0) return customAlert("Erro","Informe a quantidade de ouro.");
    player.gold+=v; logAction('gold',v,`Achou ${v}G`);
    closeModal('modal-add-item'); updateUI(); return;
  }
  let v=parseInt(document.getElementById('item-val').value)||0;
  let p=parseInt(document.getElementById('item-price').value)||0;
  let w=parseFloat(document.getElementById('item-weight').value)||0;
  let uType=null, dur=0, n='';
  if(t==='use'){
    uType=document.getElementById('item-use-type').value;
    let lbl=document.querySelector(`#item-use-type option[value="${uType}"]`).innerText.split(' ').slice(1).join(' ');
    n=`Poção: ${lbl}`; w=0.5;
    if(uType.includes('hot')||uType.includes('buff')){dur=parseInt(document.getElementById('item-duration').value)||1;n+=` (${dur} turnos)`;}
  } else {
    n=document.getElementById('item-name').value.trim();
    if(t==='acc') uType=document.getElementById('item-acc-type').value;
  }
  let lore=document.getElementById('item-lore').value.trim();
  if(!n) return customAlert("Erro","Item precisa de um nome.");
  
  if(!selectedItem&&isBuyMode){
    let disc=getCarismaDiscount(), fp=Math.max(1,Math.floor(p*(1-disc/100)));
    if(p<=0) return customAlert("Erro","Item de loja precisa de preço.");
    if(player.gold<fp) return customAlert("Sem Ouro",`Custa ${fp}G mas você tem ${player.gold}G.`);
    player.gold-=fp;
    if(disc>0) customAlert("🗣️ Carisma!",`Desconto de ${disc}%!<br>Original: ${p}G → Pago: ${fp}G`);
    p=fp; 
  }
  let obj={id:selectedItem?selectedItem.id:Date.now(),name:n,desc:lore,type:t,value:v,weight:w,price:p,useType:uType,duration:dur,equipped:selectedItem?selectedItem.equipped:false};
  if(selectedItem) player.inventory=player.inventory.map(x=>x.id===selectedItem.id?obj:x);
  else{player.inventory.push(obj);logAction(isBuyMode?'buy':'add',p,`${isBuyMode?'Comprou':'Achou'} ${n}`);}
  closeModal('modal-add-item'); renderMochila(); recalcMaxStats(); updateUI();
}
//// FIM BLOCO 07 ////

//// INÍCIO BLOCO 08 - EFEITOS E POÇÕES ////
function openPotionSelector(){
  if(turnState==='active'&&actionsUsed.pot>=2) return customAlert("Limite","Você já bebeu 2 poções neste turno.");
  let pots=player.inventory.filter(i=>i.type==='use');
  let list=document.getElementById('potion-list-popup'); list.innerHTML='';
  if(!pots.length) list.innerHTML="<p style='text-align:center;color:#666;'>Sem poções.</p>";
  pots.forEach(p=>{list.innerHTML+=`<div class="list-item"><div class="item-info"><div class="item-name">🧪 ${p.name}</div></div><button class="btn btn-blue" style="width:auto;padding:8px 14px;font-size:12px;" onclick="consumePotion(${p.id});closeModal('modal-potions');">BEBER</button></div>`;});
  showModal('modal-potions');
}
function consumePotion(id){
  let p=player.inventory.find(i=>i.id===id); if(!p) return;
  if(turnState==='active') actionsUsed.pot++;
  let t=p.useType, v=p.value;
  
  if(t==='inst_hp' || t==='hp_inst')      {player.hp=Math.min(player.maxHp,player.hp+v);logAction('hp',v,'Bebeu Poção HP');}
  else if(t==='inst_mp' || t==='mp_inst') {player.mp=Math.min(player.maxMp,player.mp+v);logAction('mp',v,'Bebeu Poção Mana');}
  else if(t==='inst_exp' || t==='exp')    {
      player.exp+=v;
      logAction('exp',v,'Bebeu Poção EXP');
      checkLevelUp(); // FIX: A Poção agora evolui o jogador de nível na hora!
  }
  else if(t.startsWith('hot_'))  {player.hots.push({id:Date.now(),target:t.replace('hot_',''),amount:v,duration:p.duration,name:p.name});}
  else if(t.endsWith('_hot'))    {player.hots.push({id:Date.now(),target:t.split('_')[0],amount:v,duration:p.duration,name:p.name});} 
  else if(t.startsWith('buff_')) {player.buffs.push({id:Date.now(),type:t.replace('buff_',''),value:v,duration:p.duration,name:p.name});recalcMaxStats();}
  
  player.inventory=player.inventory.filter(i=>i.id!==p.id);
  renderMochila(); updateUI();
}

function openAddEffectModal(){
  document.getElementById('eff-val').value=''; document.getElementById('eff-dur').value=''; document.getElementById('eff-desc').value='';
  setEffectMode('pos'); showModal('modal-add-effect');
}
function setEffectMode(mode){effMode=mode;document.getElementById('btn-eff-pos').style.opacity=mode==='pos'?'1':'0.5';document.getElementById('btn-eff-neg').style.opacity=mode==='neg'?'1':'0.5';}

function saveManualEffect(){
  let stat=document.getElementById('eff-stat').value, val=parseInt(document.getElementById('eff-val').value);
  let dur=parseInt(document.getElementById('eff-dur').value), desc=document.getElementById('eff-desc').value.trim()||'Efeito';
  if(isNaN(val)||isNaN(dur)||dur<=0) return customAlert("Erro","Preencha todos os campos.");
  
  if(effMode==='neg') val=-val;
  
  if(stat === 'hp_turn' || stat === 'mp_turn') {
    let tgt = stat.split('_')[0];
    player.hots.push({id:Date.now(), target:tgt, amount:val, duration:dur, name:desc});
  } else {
    player.buffs.push({id:Date.now(), type:stat, value:val, duration:dur, name:desc});
  }
  
  closeModal('modal-add-effect'); recalcMaxStats(); updateUI();
}
//// FIM BLOCO 08 ////

//// INÍCIO BLOCO 09 - FICHA TÉCNICA ////
function diffHTML(oldVal, newVal) {
  return `<span style="color:#c62828;text-decoration:line-through;font-size:11px;">${oldVal}</span>` +
         `<span style="color:#aaa;font-size:11px;"> → </span>` +
         `<span style="color:#2e7d32;font-weight:900;font-size:13px;">${newVal}</span>`;
}

function getStatPreview(stat) {
  let next = player.finalStats[stat] + 1;
  let preview = {};
  if (stat === 'VIT') {
    let newMaxHp = 20 + (next * 3) + getAccVal('hp') + getBuffVal('hp_max') + ((player.level - 1) * 2);
    preview.maxHp = { old: player.maxHp, new: newMaxHp };
  }
  if (stat === 'INT') {
    let newMaxMp = 15 + (next * 2) + getAccVal('mp') + getBuffVal('mp_max') + (player.level - 1);
    preview.maxMp = { old: player.maxMp, new: newMaxMp };
  }
  if (stat === 'FOR') {
    preview.maxLoad = { old: getMaxLoad(), new: 10 + (next * 5) + getAccVal('kg') + getBuffVal('kg') + ((player.level - 1) * 2) };
    let p = getPoderObj('atk');
    preview.atk = { old: p.total, new: p.total + 1 };
  }
  if (stat === 'SOR') {
    let oldC = getCritThreshold();
    let newC = Math.max(17, 20 - Math.floor((getStat('SOR') + 1) / 2));
    if (newC !== oldC) preview.crit = { old: oldC, new: newC };
  }
  if (stat === 'CAR') {
    let oldD = getCarismaDiscount();
    let newD = Math.min(50, Math.floor((getStat('CAR') + 1) / 2) * 10);
    if (newD !== oldD) preview.discount = { old: oldD, new: newD };
  }
  if (stat === 'AGI') {
    preview.agi = { old: getStat('AGI'), new: getStat('AGI') + 1 };
  }
  return preview;
}

function renderFicha(){
  let preview = pendingStatAllocation ? getStatPreview(pendingStatAllocation) : {};
  document.getElementById('ficha-pers').innerText=player.personality||player.name;
  document.getElementById('ficha-desc').innerText=`"${player.personalityDesc||player.desc||'Sem descrição.'}"`;
  document.getElementById('attr-free-points').innerText=player.freePoints;
  document.getElementById('level-up-banner').style.display=player.freePoints>0?'block':'none';
  let list=document.getElementById('attributes-list'); list.innerHTML='';
  for(let s in STAT_NAMES){
    let sel=pendingStatAllocation===s;
    
    // Lógica para mostrar os buffs visuais (Verde ou Vermelho)
    let baseV = player.finalStats[s];
    let buffV = getBuffVal(s);
    let finalV = baseV + buffV + (sel?1:0);
    let buffStr = buffV > 0 ? `<sup style="color:var(--gem-green);font-size:10px;">+${buffV}</sup>` : buffV < 0 ? `<sup style="color:var(--gem-red);font-size:10px;">${buffV}</sup>` : '';
    let valDisplay = sel ? diffHTML(finalV - 1, finalV) : `${finalV}${buffStr}`;

    let pi='';
    if(sel&&s==='FOR') pi=`<span style="color:var(--gem-green);font-size:10px;margin-left:6px;">💪→${10+(finalV)*5+getAccVal('kg')+getBuffVal('kg')+(player.level-1)*2}kg</span>`;
    if(sel&&s==='VIT') pi=`<span style="color:var(--gem-green);font-size:10px;margin-left:6px;">❤️→${20+(finalV)*3+getAccVal('hp')+getBuffVal('hp_max')+(player.level-1)*2}HP</span>`;
    if(sel&&s==='INT') pi=`<span style="color:var(--gem-green);font-size:10px;margin-left:6px;">💧→${15+(finalV)*2+getAccVal('mp')+getBuffVal('mp_max')+(player.level-1)}MP</span>`;
    if(sel&&s==='SOR') pi=`<span style="color:var(--gem-green);font-size:10px;margin-left:6px;">🍀→crít.${Math.max(15,20-(finalV))}+</span>`;
    
    let btn=player.freePoints>0?(sel
          ?`<button class="btn btn-blue" style="width:32px;height:32px;padding:0;border-radius:50%;font-size:13px;" onclick="event.stopPropagation();pendingStatAllocation=null;renderFicha();updateUI();">✓</button>`
          :`<button class="btn btn-outline" style="width:32px;height:32px;padding:0;border-radius:50%;font-size:15px;" onclick="event.stopPropagation();pendingStatAllocation='${s}';renderFicha();updateUI();">+</button>`):'';
    list.innerHTML+=`<div class="list-item ${sel?'equipped':''}" style="margin-bottom:5px;padding:10px 12px;cursor:pointer;" onclick="showAttrInfo('${s}')">
      <div><div style="font-weight:bold;font-size:13px;">${ATTR_INFO[s]?ATTR_INFO[s].icon+' ':''} ${STAT_NAMES[s]}${pi}</div></div>
      <div style="display:flex;align-items:center;gap:10px;">
        <span style="font-size:18px;font-weight:900;font-family:'Cinzel';${sel||buffV!==0?'color:var(--gem-blue);':''}">${valDisplay}</span>${btn}
      </div></div>`;
  }
  document.getElementById('btn-confirm-attr').style.display=pendingStatAllocation?'block':'none';
  let cd=CLASSES_DATA[player.cls]||{};
  document.getElementById('sk-name').innerText=`🔥 ${cd.skill||player.skill} (${cd.cost||player.cost} Mana)`;
  document.getElementById('sk-desc').innerText=cd.desc||player.skillDesc||'—';
  document.getElementById('sk-dano').innerText=player.danoPronto||'—';
  let m=document.getElementById('mecanicas-list'); m.innerHTML='';
  [{icon:'⚔️',name:'Bônus de Ataque',
    val: preview.atk ? diffHTML('+'+preview.atk.old, '+'+preview.atk.new) : `+${getStat('FOR')} (Força)`,
    desc:'Somado ao dado em ataques físicos'},
   {icon:'🛡️',name:'Bônus de Defesa',val:`Nível ${player.level}`,desc:'Somado ao dado de defesa + armaduras'},
   {icon:'🍀',name:'Acerto Crítico',
    val: preview.crit ? diffHTML(preview.crit.old+'–20', preview.crit.new+'–20') : `${getCritThreshold()}–20`,
    desc:`Rol ${getCritThreshold()}+ = CRÍTICO! (SOR: ${getStat('SOR')})`},
   {icon:'🗣️',name:'Desconto Loja',
    val: preview.discount ? diffHTML(preview.discount.old+'%', preview.discount.new+'%') : `${getCarismaDiscount()}%`,
    desc:`CAR ${getStat('CAR')} → ${getCarismaDiscount()}% de desconto`},
   {icon:'💪',name:'Carga Máxima',
    val: preview.maxLoad ? diffHTML(preview.maxLoad.old+'kg', preview.maxLoad.new+'kg') : `${getMaxLoad()}kg`,
    desc:'10 + (FOR×5) + bônus de nível'},
   {icon:'💧',name:'Mana Máxima',
    val: preview.maxMp ? diffHTML(preview.maxMp.old+'MP', preview.maxMp.new+'MP') : `${player.maxMp}MP`,
    desc:'15 + (INT×2) + bônus de nível'},
  ].forEach(r=>{m.innerHTML+=`<div class="ficha-stat-row"><div><div style="font-weight:bold;font-size:13px;">${r.icon} ${r.name}</div><div style="font-size:11px;color:var(--ink-light);">${r.desc}</div></div><div class="ficha-stat-val" style="font-size:14px;min-width:50px;text-align:right;">${r.val}</div></div>`;});
}

function showAttrInfo(stat){
  let a=ATTR_INFO[stat]; if(!a) return;
  document.getElementById('attr-info-title').innerText=`${a.icon} ${STAT_NAMES[stat]}`;
  document.getElementById('attr-info-msg').innerHTML=a.desc.replace(/\n/g,'<br>');
  document.getElementById('attr-info-value').innerText=`Valor atual: ${getStat(stat)}`;
  showModal('modal-attr-info');
}

function confirmStatPoint(){
  if(pendingStatAllocation&&player.freePoints>0){
    player.finalStats[pendingStatAllocation]++; player.freePoints--;
    pendingStatAllocation=null; recalcMaxStats(); renderFicha(); updateUI();
  }
}

function showStatInfo(stat){
  let infos={
    hp:`❤️ <strong>Vida (HP)</strong><br>Chegou a 0 → você cai inconsciente!<br>Aumentada por <em>Vitalidade</em> (+3/ponto) e por nível (+2/nível).<br><br>Toque aqui para curar ou sofrer dano manualmente.`,
    mp:`💧 <strong>Mana (MP)</strong><br>Combustível das habilidades especiais.<br>Aumentada por <em>Inteligência</em> (+2/ponto) e por nível.<br><br>Toque aqui para ajustar manualmente.`,
    carga:`💪 <strong>Carga/Peso</strong><br>Itens <strong>equipados</strong> pesam <strong>metade</strong> do peso original.<br><br>▸ Acima de 100%: −1 HP por turno<br>▸ Acima de 125%: −5 HP por turno e sem ataques<br><br>Aumenta com <em>Força</em> (+5kg por ponto).`
  };
  showInfo('Informação',infos[stat]||'');
}
function showClassInfo(){
  let cd=CLASSES_DATA[player.cls]||{};
  showInfo(`${player.cls} — Nível ${player.level}`,
    `🔥 <strong>${cd.skill||player.skill}</strong> (${cd.cost||player.cost} Mana)<br><br><em>${cd.desc||player.skillDesc}</em><br><br><strong style="color:var(--gold);">${player.danoPronto}</strong><br><br>🍀 Crítico em: ${getCritThreshold()}–20<br>🗣️ Desconto na loja: ${getCarismaDiscount()}%`);
}
function openDetails(t){ if(t==='carga') showStatInfo('carga'); }
//// FIM BLOCO 09 ////

//// INÍCIO BLOCO 10 - PAINEL DO MESTRE ////
function openMestreMenu(){ showModal('modal-mestre'); }
function requirePassword(cb){ pwdCallback=cb; document.getElementById('input-pwd').value=''; showModal('modal-password'); }
function verifyPassword(){
  if(document.getElementById('input-pwd').value.toLowerCase()==='guitarra'){ closeModal('modal-password'); if(pwdCallback) pwdCallback(); }
  else customAlert("Acesso Negado","Senha incorreta.");
}
function logAction(type,delta,desc,revertible=true){
  let ts=new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
  player.history.unshift({id:Date.now(),type,delta,desc,ts,revertible});
  if(player.history.length>25) player.history.pop();
}
function openHistory(){
  closeModal('modal-mestre');
  let list=document.getElementById('history-list'); list.innerHTML='';
  if(!player.history.length) list.innerHTML="<p style='text-align:center;color:#666;'>Nenhuma ação registrada.</p>";
  player.history.forEach(h=>{
    let d=h.delta>0?`+${h.delta}`:h.delta<0?`${h.delta}`:'—';
    let rb=h.revertible?`<button class="btn-revert" onclick="promptRevert(${h.id})">Desfazer</button>`:'';
    list.innerHTML+=`<div class="history-item"><div><strong>${h.ts}</strong> — ${h.desc} <span style="color:#888;">(${d})</span></div>${rb}</div>`;
  });
  showModal('modal-history');
}
function promptRevert(id){
  closeModal('modal-history');
  requirePassword(()=>{
    let h=player.history.find(x=>x.id===id); if(!h) return;
    if(h.type==='hp'){let n=player.hp-h.delta;if(n<=0){player.hp=1;customAlert("⚠️ Proteção","Desfazer causaria morte. HP travado em 1.");}else player.hp=Math.min(player.maxHp,n);}
    else if(h.type==='mp')   player.mp=Math.max(0,player.mp-h.delta);
    else if(h.type==='exp')  player.exp=Math.max(0,player.exp-h.delta);
    else if(h.type==='gold') player.gold=Math.max(0,player.gold-h.delta);
    else if(h.type==='add'||h.type==='buy'){if(h.type==='buy')player.gold+=h.delta;customAlert("Aviso","Para remover o item, exclua-o manualmente na mochila.");}
    else if(h.type==='sell'){player.gold=Math.max(0,player.gold-h.delta);customAlert("Aviso","Ouro removido. Recrie o item se necessário.");}
    player.history=player.history.filter(x=>x.id!==id); updateUI();
    if(player.hp>0 && player.isDead){ player.isDead=false; document.getElementById('death-overlay').classList.remove('show'); }
  });
}
function exportSave(){
  closeModal('modal-mestre');
  let code=btoa(encodeURIComponent(JSON.stringify(player)));
  navigator.clipboard.writeText(code).then(()=>customAlert("✅ Exportado!","Código copiado! Cole no WhatsApp para guardar.")).catch(()=>prompt("Copie o código:",code));
}
function importSave(){
  closeModal('modal-mestre');
  let code=prompt("Cole o Código do Personagem:");
  if(code){try{let p=JSON.parse(decodeURIComponent(atob(code.trim())));if(p.name){player={...player,...p};saveGame();recalcMaxStats();updateUI();switchTab('combate');customAlert("✅ Ficha Importada!","Personagem restaurado.");}}catch(e){customAlert("Erro","Código inválido ou corrompido.");}}
}
function resetData(){
  closeModal('modal-mestre');
  customConfirm("💀 Morte Definitiva","Apagar este personagem PARA SEMPRE?",()=>{requirePassword(()=>{localStorage.removeItem('rpg_character');location.reload();});});
}
//// FIM BLOCO 10 ////

//// INÍCIO BLOCO 11 - SISTEMA DE ANOTAÇÕES ////
function openNoteSearch() {
  let wrap = document.getElementById('note-search-wrap');
  wrap.style.display = wrap.style.display === 'none' ? 'block' : 'none';
  if (wrap.style.display === 'block') document.getElementById('note-search-input').focus();
  notePage = 1;
  renderNotesList();
}

function setNoteSort(type) {
  noteSort = type;
  notePage = 1;
  document.getElementById('sort-newest').classList.toggle('active', type === 'newest');
  document.getElementById('sort-oldest').classList.toggle('active', type === 'oldest');
  renderNotesList();
}

function changeNotePage(delta) {
  notePage += delta;
  renderNotesList();
}

function openNoteModal(id) {
  editingNoteId = id;
  let note = id ? player.notes.find(n => n.id === id) : null;
  document.getElementById('note-edit-title').innerText = note ? '✏️ Editar Anotação' : '📝 Nova Anotação';
  document.getElementById('note-input-title').value = note ? note.title : '';
  document.getElementById('note-input-body').value = note ? note.body : '';
  showModal('modal-note-edit');
}

function saveNote() {
  let title = document.getElementById('note-input-title').value.trim();
  let body  = document.getElementById('note-input-body').value.trim();
  if (!body) return customAlert("Atenção", "Escreva algo na anotação antes de salvar.");
  if (!title) title = 'Sem título';
  if (editingNoteId) {
    let note = player.notes.find(n => n.id === editingNoteId);
    if (note) { note.title = title; note.body = body; note.updatedAt = Date.now(); }
  } else {
    player.notes.unshift({ id: Date.now(), title, body, createdAt: Date.now(), updatedAt: Date.now() });
  }
  saveGame(); closeModal('modal-note-edit'); renderNotesList();
}

function deleteNote(id) {
  customConfirm("🗑️ Excluir?", "Esta anotação será apagada permanentemente.", () => {
    player.notes = player.notes.filter(n => n.id !== id);
    saveGame(); closeModal('modal-note-view'); renderNotesList();
  });
}

function openNoteView(id) {
  let note = player.notes.find(n => n.id === id); if (!note) return;
  document.getElementById('note-view-title').innerText = note.title || 'Sem título';
  document.getElementById('note-view-body').innerText = note.body;
  document.getElementById('note-view-edit-btn').onclick   = () => { closeModal('modal-note-view'); openNoteModal(id); };
  document.getElementById('note-view-delete-btn').onclick = () => deleteNote(id);
  showModal('modal-note-view');
}

function renderNotesList() {
  let search = (document.getElementById('note-search-input')?.value || '').toLowerCase();
  let list = (player.notes || [])
    .filter(n => !search || n.title.toLowerCase().includes(search) || n.body.toLowerCase().includes(search))
    .sort((a, b) => noteSort === 'newest' ? b.createdAt - a.createdAt : a.createdAt - b.createdAt);
  
  let container = document.getElementById('notes-list'); if (!container) return;
  
  if (!list.length) {
    container.innerHTML = `<p style="text-align:center;color:#999;padding:20px;font-size:13px;">${search ? 'Nenhum registro encontrado.' : 'Seu diário está vazio. Clique em + Nova para começar a escrever sua lenda.'}</p>`;
    return;
  }

  const ITEMS_PER_PAGE = 10;
  let totalPages = Math.ceil(list.length / ITEMS_PER_PAGE);
  if (notePage > totalPages) notePage = totalPages;
  if (notePage < 1) notePage = 1;

  let start = (notePage - 1) * ITEMS_PER_PAGE;
  let paginatedList = list.slice(start, start + ITEMS_PER_PAGE);

  const LIMIT = 160;
  let html = paginatedList.map(note => {
    let isLong = note.body.length > LIMIT;
    let preview = isLong ? note.body.substring(0, LIMIT) + '...' : note.body;
    
    let d = new Date(note.createdAt);
    let dateStr = `${d.getDate()}/${d.getMonth()+1} ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
    
    return `<div class="note-card" onclick="openNoteView(${note.id})" style="cursor:pointer;">
      <div class="note-card-header">
        <span class="note-card-title">${note.title || 'Sem título'}</span>
        <span class="note-card-date">${dateStr} <span style="font-size:12px; margin-left:4px; opacity:0.6;">✏️ ❌</span></span>
      </div>
      <div class="note-card-body">${preview.replace(/\n/g, '<br>')}</div>
      ${isLong ? `<div class="note-card-more">Toque para ler mais ▼</div>` : ''}
    </div>`;
  }).join('');

  if (totalPages > 1) {
    html += `<div style="display:flex; justify-content:space-between; align-items:center; margin-top:10px; font-size:12px; font-weight:bold; color:var(--ink-light);">
      <button class="btn-filter" style="width:auto; padding:6px 12px; opacity:${notePage === 1 ? '0.4' : '1'}" onclick="changeNotePage(-1)" ${notePage === 1 ? 'disabled' : ''}>◀ Ant</button>
      <span>Pág ${notePage} / ${totalPages}</span>
      <button class="btn-filter" style="width:auto; padding:6px 12px; opacity:${notePage === totalPages ? '0.4' : '1'}" onclick="changeNotePage(1)" ${notePage === totalPages ? 'disabled' : ''}>Próx ▶</button>
    </div>`;
  }

  container.innerHTML = html;
}
//// FIM BLOCO 11 ////

//// INÍCIO BLOCO 12 - SONS ////
function playSound(type) {
  try {
    let ctx = new (window.AudioContext || window.webkitAudioContext)();
    let g = ctx.createGain();
    g.connect(ctx.destination);
    if (type === 'dice') {
      let o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 300;
      o.connect(g); g.gain.setValueAtTime(0.15, ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      o.start(); o.stop(ctx.currentTime + 0.08);
    } else if (type === 'crit') {
      [523, 784].forEach((freq, i) => {
        let o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = freq;
        let gn = ctx.createGain(); o.connect(gn); gn.connect(ctx.destination);
        let t = ctx.currentTime + i * 0.18;
        gn.gain.setValueAtTime(0.25, t); gn.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
        o.start(t); o.stop(t + 0.3);
      });
    } else if (type === 'hit') {
      let o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 80;
      o.connect(g); g.gain.setValueAtTime(0.3, ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      o.start(); o.stop(ctx.currentTime + 0.3);
    } else if (type === 'death') {
      let o = ctx.createOscillator(); o.type = 'sine';
      o.frequency.setValueAtTime(200, ctx.currentTime); o.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.9);
      o.connect(g); g.gain.setValueAtTime(0.3, ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.9);
      o.start(); o.stop(ctx.currentTime + 0.9);
    }
    setTimeout(() => ctx.close(), 1500);
  } catch(e) {}
}
//// FIM BLOCO 12 ////