/** ABIF (ABI/AB1) parsing, using the vendor's big-endian directory and dye map. */
function ascii(view, offset, length) {
  let result = '';
  for (let i=0;i<length;i++) result += String.fromCharCode(view.getUint8(offset+i));
  return result.replace(/\0+$/g, '');
}

function elementBytes(view, entry) {
  const {size,offset,entryAt} = entry;
  const at = size <= 4 ? entryAt+20 : offset;
  if (at < 0 || size < 0 || at + size > view.byteLength) throw new Error(`Tag ${entry.tag} oltre i limiti del file AB1.`);
  return at;
}

function readNumbers(view, entry) {
  const at = elementBytes(view, entry);
  if (![1,2,3,4,5].includes(entry.type)) throw new Error(`Tag ${entry.tag} di tipo non supportato (${entry.type}).`);
  const elemSize = entry.elementSize;
  if (![1,2,4].includes(elemSize)) throw new Error(`Tag ${entry.tag}: dimensione elemento non supportata.`);
  if (entry.count*elemSize > entry.size) throw new Error(`Tag ${entry.tag}: lunghezza incoerente.`);
  const result = new Array(entry.count);
  for(let i=0;i<entry.count;i++) {
    const o = at + i*elemSize;
    result[i] = elemSize === 1 ? view.getUint8(o)
       : elemSize === 2 ? (entry.type===4 ? view.getInt16(o,false) : view.getUint16(o,false))
       : (entry.type===5 ? view.getInt32(o,false) : view.getUint32(o,false));
  }
  return result;
}

export function parseAB1(buffer) {
  if (!(buffer instanceof ArrayBuffer)) throw new Error('Formato di input non supportato.');
  if (buffer.byteLength < 128) throw new Error('File AB1 troppo piccolo.');
  const v = new DataView(buffer);
  if (ascii(v,0,4) !== 'ABIF') throw new Error('Il file non contiene l’intestazione ABIF.');
  const root = 6;
  const directoryCount = v.getUint32(root+12,false);
  const directoryOffset = v.getUint32(root+20,false);
  if (directoryCount < 4 || directoryCount > 10000 || directoryOffset + directoryCount*28 > buffer.byteLength) {
    throw new Error('Directory ABIF non valida.');
  }
  const tags = new Map();
  for (let i=0;i<directoryCount;i++) {
    const at = directoryOffset+i*28;
    const name=ascii(v,at,4), number=v.getUint32(at+4,false);
    const entry={tag:`${name}${number}`, type:v.getUint16(at+8,false),elementSize:v.getUint16(at+10,false),
      count:v.getUint32(at+12,false),size:v.getUint32(at+16,false),offset:v.getUint32(at+20,false),entryAt:at};
    tags.set(entry.tag, entry);
  }
  const getTag=(key, optional=false)=>{
    const t=tags.get(key); if(!t && !optional) throw new Error(`Tag obbligatorio ${key} assente nel file AB1.`); return t;
  };
  const tagText=(key)=>{const t=getTag(key);return ascii(v,elementBytes(v,t),t.size);};
  // ABI FWO_1 maps DATA9..DATA12 onto the base channels. Do not hardcode GATC.
  const order=tagText('FWO_1').replace(/[^ACGT]/gi,'').toUpperCase();
  if (order.length !== 4 || new Set(order).size !== 4) throw new Error('FWO_1 mancante o non valido: canali fluorescenti non identificabili.');
  const channels={};
  for(let i=0;i<4;i++) {
    const arr=readNumbers(v,getTag(`DATA${9+i}`));
    channels[order[i]]=Float32Array.from(arr.map(k=>Math.max(k,0)));
  }
  const scanCount=channels.A.length;
  if(scanCount<20 || Object.values(channels).some(arr=>arr.length!==scanCount)) throw new Error('Canali DATA9–12 non coerenti.');
  const baseTag = getTag('PBAS2',true) ?? getTag('PBAS1');
  const calls = ascii(v,elementBytes(v,baseTag),baseTag.size).replace(/\0/g,'').toUpperCase();
  const posTag = getTag('PLOC2',true) ?? getTag('PLOC1');
  const locations=Int32Array.from(readNumbers(v,posTag));
  if(calls.length===0 || calls.length !== locations.length) throw new Error('PBAS e PLOC non hanno lo stesso numero di basi.');
  if([...locations].some(p=>p<0 || p>=scanCount)) throw new Error('Almeno una posizione PLOC è fuori dal cromatogramma.');
  const qualTag=getTag('PCON2',true) ?? getTag('PCON1',true);
  const qualities=qualTag ? readNumbers(v,qualTag) : [];
  return {calls,locations,channels,qualities,scanCount,order};
}
