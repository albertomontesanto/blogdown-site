
"use strict";
const model = window.IRISPLEX_MODEL;
if (!model || !Array.isArray(model.coefficients)) throw new Error("Modello IrisPlex non trovato");
const SNP = [
 {gene:"HERC2",rs:"rs12913832",allele:"A",genotypes:["GG","AG","AA"],complement:"T sul sito Erasmus MC"},
 {gene:"OCA2",rs:"rs1800407",allele:"A",genotypes:["GG","AG","AA"]},
 {gene:"SLC24A4",rs:"rs12896399",allele:"T",genotypes:["GG","GT","TT"],alias:"LOC105370627"},
 {gene:"SLC45A2",rs:"rs16891982",allele:"C",genotypes:["GG","GC","CC"]},
 {gene:"TYR",rs:"rs1393350",allele:"A",genotypes:["GG","AG","AA"]},
 {gene:"IRF4",rs:"rs12203592",allele:"T",genotypes:["CC","CT","TT"]}
];
const LABELS={BLUE:"Blu",GREEN_HAZEL:"Verde / Castano-verde",BROWN:"Marrone"};
const STYLES={BLUE:"blue",GREEN_HAZEL:"green",BROWN:"brown"};
const $ = id=>document.getElementById(id);
const rows = $("snp-rows");
let lastResult=null;
const formatPercent=p=>(p*100).toLocaleString("it-IT",{minimumFractionDigits:1,maximumFractionDigits:1})+"%";
function buildRows(){
 rows.innerHTML=SNP.map((s,i)=>{
  const opts=[...s.genotypes,"NA"].map((g,copy)=>{
   const v=copy===3?"NA":String(copy);
   const sub=v==="NA"?"non disponibile":`${copy} ${s.allele}`;
   return `<label class="geno-option ${v==="NA"?'is-missing':''}"><input type="radio" name="snp${i}" value="${v}" ${v==="NA"?'checked':''} aria-label="${s.rs}: ${g}, ${sub}"><span><strong>${g}</strong><small>${sub}</small></span></label>`;
  }).join("");
  const alias=s.alias?`<span class="minor">${s.alias}</span>`:"";
  return `<tr id="row${i}"><td class="index">${i+1}</td><td class="gene">${s.gene}${alias}</td><td class="rs">${s.rs}</td><td class="allele">${s.allele}</td><td><div class="genotypes" role="group" aria-label="Seleziona il genotipo ${s.gene}, ${s.rs}">${opts}</div></td></tr>`;
 }).join("");
 rows.addEventListener("change",()=>{lastResult=null;$("results").hidden=true;$("export").disabled=true;updateRows();setStatus("Genotipi modificati. Premi «Mostra probabilità predette» per aggiornare il risultato.");});
 updateRows();
}
function readInputs(){return SNP.map((_,i)=>document.querySelector(`input[name="snp${i}"]:checked`)?.value ?? "NA")}
function updateRows(){readInputs().forEach((v,i)=>$("row"+i).classList.toggle("active-row",v!=="NA"));}
function setStatus(message,kind=""){const el=$("status");el.textContent=message;el.className="status"+(kind?" "+kind:"");}
/** The exact original 7-feature preprocessing and multinomial softmax of the prior 3-color model. */
function calculate(raw){
 if(raw.length!==6||raw[0]==="NA") throw new Error("Per effettuare la predizione è obbligatorio selezionare HERC2 rs12913832.");
 const nums=raw.map(v=>v==="NA"?NaN:Number(v));
 const features=[Number(nums[0]===1),Number(nums[0]===2),...nums.slice(1)];
 const filled=features.map((v,i)=>Number.isNaN(v)?model.imputation[i]:v);
 const z=filled.map((v,i)=>(v-model.scale_mean[i])/model.scale_sd[i]);
 const logits=model.coefficients.map((coef,k)=>model.intercepts[k]+coef.reduce((total,b,j)=>total+b*z[j],0));
 const largest=Math.max(...logits);
 const exp=logits.map(v=>Math.exp(v-largest));const denom=exp.reduce((a,b)=>a+b,0);
 return exp.map(v=>v/denom);
}
function showPrediction(){
 const raw=readInputs();
 if(raw[0]==="NA"){$("results").hidden=true;setStatus("Seleziona prima il genotipo di HERC2 rs12913832 (GG, AG o AA).","error");document.querySelector('input[name="snp0"]').focus();return;}
 const probabilities=calculate(raw),best=probabilities.indexOf(Math.max(...probabilities)),missing=raw.filter(v=>v==="NA").length;
 const category=model.classes[best];
 $("probabilities").innerHTML=model.classes.map((name,i)=>{
  const css=STYLES[name],pct=probabilities[i]*100;
  return `<div class="prob-row"><div class="prob-label"><span class="eye-dot ${css}" aria-hidden="true"></span>${LABELS[name]}</div><div class="track" role="progressbar" aria-label="${LABELS[name]}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct.toFixed(1)}"><div class="bar-fill ${css}" style="width:${pct.toFixed(6)}%"></div></div><div class="percent">${formatPercent(probabilities[i])}</div></div>`;
 }).join("")+`<div class="winner">Categoria più probabile: <strong>${LABELS[category]}</strong> (${formatPercent(probabilities[best])})</div>`;
 $("prediction-note").textContent=missing?`Attenzione: ${missing} SNP non disponibili. Come nel modello precedente, i marcatori mancanti diversi da HERC2 vengono imputati a 0 copie dell'allele contato. Interpretare con cautela le probabilità.`:"Sei SNP disponibili. Le probabilità sono stime sperimentali basate sul dataset di addestramento; non sono una garanzia del fenotipo.";
 $("results").hidden=false;$("export").disabled=false;
 lastResult={raw,probabilities,category};
 setStatus("Predizione calcolata in locale. Puoi esportare il risultato in CSV.","ok");
 $("results").scrollIntoView({behavior:"smooth",block:"nearest"});
}
function reset(){SNP.forEach((_,i)=>{document.querySelector(`input[name="snp${i}"][value="NA"]`).checked=true;});lastResult=null;$("results").hidden=true;$("export").disabled=true;updateRows();setStatus("Selezioni azzerate. Inserisci i genotipi per una nuova predizione.");}
function csvCell(v){const s=String(v??"");return /[",\r\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s;}
function exportCSV(){
 if(!lastResult) return;
 const {raw,probabilities,category}=lastResult;
 const data=[
  ["Campo","Valore"],["Modello","IrisPlex Local a 3 colori (sperimentale)"],["Categoria più probabile",LABELS[category]],
  ["SNP","Gene","Allele contato","Genotipo","Numero copie"],
  ...SNP.map((s,i)=>[s.rs,s.gene,s.allele,raw[i]==="NA"?"NA":s.genotypes[Number(raw[i])],raw[i]]),
  [],["Categoria","Probabilità"],...model.classes.map((k,i)=>[LABELS[k],probabilities[i].toFixed(6)])
 ];
 const csv='﻿'+data.map(row=>row.map(csvCell).join(",")).join("\r\n");
 const url=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));
 const a=document.createElement("a");a.href=url;a.download="IrisPlex_Local_predizione_3_colori.csv";document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function showMetrics(){const m=model.metrics;$("metrics").innerHTML=[
 ["Accuratezza CV",formatPercent(m.accuracy)],
 ["Balanced accuracy",formatPercent(m.balanced_accuracy)],
 ["AUC macro OvR",m.macro_auc_ovr.toLocaleString("it-IT",{minimumFractionDigits:3,maximumFractionDigits:3})],
 ["Log-loss",m.log_loss.toLocaleString("it-IT",{minimumFractionDigits:3,maximumFractionDigits:3})]
 ].map(([a,b])=>`<div class="metric"><span>${a}</span><strong>${b}</strong></div>`).join("");}
window.IrisPlexLocal={calculate,SNP,model}; // permits local verification of the prediction engine
buildRows();showMetrics();
$("predict").addEventListener("click",showPrediction);
$("clear").addEventListener("click",reset);
$("export").addEventListener("click",exportCSV);
