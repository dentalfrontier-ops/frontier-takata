'use client';
import {useEffect,useMemo,useState} from 'react';
import {supabase} from './lib/supabase';

type Facility={id:string;name:string;address?:string;phone?:string;latitude?:number;longitude?:number};
type Patient={id:string;facility_id?:string;name:string;kana?:string;room?:string;patient_address?:string;patient_latitude?:number;patient_longitude?:number;key_person?:string;key_person_address?:string;relationship?:string;phone?:string;care_manager?:string;care_manager_company?:string;payment?:string;visit_frequency?:string;call_before_visit?:boolean;family_attendance?:boolean;free_checkup?:boolean;memo?:string};
type Schedule={id:string;facility_id?:string;patient_ids?:string[];patient_names:string[];treatment:string;patient_treatments?:Record<string,string>;completed_patients?:Record<string,boolean>;start_at:string;memo?:string;completed?:boolean};
type Tab='home'|'today'|'tomorrow'|'next'|'patients'|'facilities'|'calendar';
const treatments=['口腔ケア','義歯調整','義歯修理','義歯印象','義歯装着','抜歯','SRP','充填','無料検診','嚥下評価','担当者会議','その他'];
const emptyPatient:Patient={id:'',facility_id:'',name:'',kana:'',room:'',patient_address:'',key_person:'',key_person_address:'',relationship:'',phone:'',care_manager:'',care_manager_company:'',payment:'',visit_frequency:'',call_before_visit:false,family_attendance:false,free_checkup:false,memo:''};

export default function Page(){
const [tab,setTab]=useState<Tab>('home'),[facilities,setFacilities]=useState<Facility[]>([]),[patients,setPatients]=useState<Patient[]>([]),[schedules,setSchedules]=useState<Schedule[]>([]),[msg,setMsg]=useState('');
const [facilityId,setFacilityId]=useState(''),[selectedPatientIds,setSelectedPatientIds]=useState<string[]>([]),[manualPatients,setManualPatients]=useState(''),[treatment,setTreatment]=useState(treatments[0]),[startAt,setStartAt]=useState(''),[scheduleMemo,setScheduleMemo]=useState(''),[editingScheduleId,setEditingScheduleId]=useState(''),[returnTab,setReturnTab]=useState<Tab>('today');
const [selectedMonth,setSelectedMonth]=useState(()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`});
const [selectedDate,setSelectedDate]=useState(()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`});
const [nextDraftInfo,setNextDraftInfo]=useState('');
const [patientForm,setPatientForm]=useState<Patient>(emptyPatient),[showPatientForm,setShowPatientForm]=useState(false),[patientSearch,setPatientSearch]=useState('');
const [facilityName,setFacilityName]=useState(''),[facilityAddress,setFacilityAddress]=useState(''),[facilityPhone,setFacilityPhone]=useState(''),[facilityLat,setFacilityLat]=useState(''),[facilityLng,setFacilityLng]=useState(''),[editingFacilityId,setEditingFacilityId]=useState(''),[facilitySearch,setFacilitySearch]=useState('');
useEffect(()=>{load()},[]);
async function load(){const [fr,pr,sr]=await Promise.all([supabase.from('facilities').select('*').order('name'),supabase.from('patients').select('*').order('name'),supabase.from('schedules').select('*').order('start_at',{ascending:true})]);if(fr.data){setFacilities(fr.data);if(fr.data.length&&!facilityId)setFacilityId(fr.data[0].id)}if(pr.data)setPatients(pr.data);if(sr.data)setSchedules(sr.data as Schedule[])}
function getFacility(id?:string){return facilities.find(f=>f.id===id)} function getPatient(id?:string){return patients.find(p=>p.id===id)}
function fmt(dt:string){return new Date(dt).toLocaleString('ja-JP',{timeZone:'Asia/Tokyo',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'})} function dateOnly(dt:string){return new Date(dt).toLocaleDateString('ja-JP',{timeZone:'Asia/Tokyo',month:'2-digit',day:'2-digit'})} function time(dt:string){return new Date(dt).toLocaleTimeString('ja-JP',{timeZone:'Asia/Tokyo',hour:'2-digit',minute:'2-digit'})}
function callPhone(phone?:string){if(phone)window.location.href=`tel:${phone.replace(/-/g,'')}`} function openMap(address?:string,name?:string){const q=encodeURIComponent(address||name||'');if(q)window.open(`https://www.google.com/maps/search/?api=1&query=${q}`,'_blank')}
const sortedSchedules=useMemo(()=>[...schedules].sort((a,b)=>new Date(a.start_at).getTime()-new Date(b.start_at).getTime()),[schedules]);
function isSameYmd(a:Date,b:Date){return a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()&&a.getDate()===b.getDate()}
const todaySchedules=useMemo(()=>{const t=new Date();return sortedSchedules.filter(s=>isSameYmd(new Date(s.start_at),t))},[sortedSchedules]);
const tomorrowSchedules=useMemo(()=>{const t=new Date();t.setDate(t.getDate()+1);return sortedSchedules.filter(s=>isSameYmd(new Date(s.start_at),t))},[sortedSchedules]);
function cardCount(list:Schedule[]){
  return list.reduce((sum,s)=>sum+(s.patient_names?.length || 1),0);
}
const todayCardCount=cardCount(todaySchedules);
const tomorrowCardCount=cardCount(tomorrowSchedules);
const completed=todaySchedules.reduce((sum,s)=>sum+scheduleCompletedCount(s),0), remaining=todayCardCount-completed;
const facilityPatients=useMemo(()=>patients.filter(p=>p.facility_id===facilityId),[patients,facilityId]);
function scheduleMatchesPatient(s:Schedule,p:Patient){return !!(s.patient_ids?.includes(p.id)||s.patient_names?.includes(p.name))}
function monthCount(p:Patient){const n=new Date();return schedules.filter(s=>{const d=new Date(s.start_at);return scheduleMatchesPatient(s,p)&&d.getFullYear()===n.getFullYear()&&d.getMonth()===n.getMonth()}).length}
function history(p:Patient){return sortedSchedules.filter(s=>scheduleMatchesPatient(s,p))} function nextSchedule(p:Patient){const now=new Date();return history(p).find(s=>new Date(s.start_at)>=now)}
const filteredPatients=useMemo(()=>{const q=patientSearch.toLowerCase();return patients.filter(p=>{const f=getFacility(p.facility_id)?.name||'';return ((p.name||'')+(p.kana||'')+f+(p.room||'')+(p.key_person||'')+(p.phone||'')+(p.care_manager||'')+(p.patient_address||'')+(p.key_person_address||'')+(p.memo||'')).toLowerCase().includes(q)})},[patientSearch,patients,facilities]);
const filteredFacilities=useMemo(()=>{const q=facilitySearch.toLowerCase();return facilities.filter(f=>(f.name+(f.address||'')+(f.phone||'')).toLowerCase().includes(q))},[facilitySearch,facilities]);
function patientKeyFor(s:Schedule,name:string,index:number){
  return s.patient_ids?.[index] || name;
}
function treatmentFor(s:Schedule,name:string,index:number){
  return s.patient_treatments?.[patientKeyFor(s,name,index)] || s.treatment || '';
}
async function updatePatientTreatment(s:Schedule,name:string,index:number,value:string){
  const key=patientKeyFor(s,name,index);
  const next={...(s.patient_treatments||{}),[key]:value};
  const {error}=await supabase.from('schedules').update({patient_treatments:next}).eq('id',s.id);
  if(error)return setMsg('エラー：'+error.message);
  await load();
  setMsg(`${name} の診療内容を更新しました`);
}
function patientNamesFromIds(ids:string[]){return ids.map(id=>getPatient(id)?.name).filter(Boolean) as string[]}
function newPatient(){setPatientForm({...emptyPatient,facility_id:facilities[0]?.id||''});setShowPatientForm(true);setTab('patients')} function openPatient(p:Patient){setPatientForm({...emptyPatient,...p});setShowPatientForm(true);setTab('patients');setTimeout(()=>scrollTo({top:0,behavior:'smooth'}),50)}
function setPatientField(k:keyof Patient,v:any){setPatientForm(p=>({...p,[k]:v}))}
async function geocodePatientAddress(){
  const facility=getFacility(patientForm.facility_id);
  const address=(patientForm.patient_address || patientForm.key_person_address || facility?.address || '').trim();
  if(!address){
    setMsg('患者住所または施設住所を入力してください');
    return null;
  }
  const loc=await geocodeAddress(address);
  if(!loc)return null;
  setPatientForm({...patientForm,patient_latitude:loc.lat,patient_longitude:loc.lng});
  setMsg(patientForm.patient_address?'患者住所から座標を取得しました':'施設住所から座標を取得しました');
  return loc;
}

async function savePatient(){if(!patientForm.name.trim())return setMsg('患者名を入力してください');let pLat=patientForm.patient_latitude||null;let pLng=patientForm.patient_longitude||null;if((!pLat||!pLng)&&(patientForm.patient_address||patientForm.key_person_address)){const geo=await geocodePatientAddress();if(geo){pLat=geo.lat;pLng=geo.lng;}}const payload={facility_id:patientForm.facility_id||null,name:patientForm.name.trim(),kana:patientForm.kana||'',room:patientForm.room||'',patient_address:patientForm.patient_address||'',patient_latitude:pLat,patient_longitude:pLng,key_person:patientForm.key_person||'',key_person_address:patientForm.key_person_address||'',relationship:patientForm.relationship||'',phone:patientForm.phone||'',care_manager:patientForm.care_manager||'',care_manager_company:patientForm.care_manager_company||'',payment:patientForm.payment||'',visit_frequency:patientForm.visit_frequency||'',call_before_visit:!!patientForm.call_before_visit,family_attendance:!!patientForm.family_attendance,free_checkup:!!patientForm.free_checkup,memo:patientForm.memo||''};const res=patientForm.id?await supabase.from('patients').update(payload).eq('id',patientForm.id):await supabase.from('patients').insert(payload);if(res.error)return setMsg('エラー：'+res.error.message);await load();setShowPatientForm(false);setMsg(patientForm.id?'患者情報を更新しました':'患者を登録しました')}
async function deletePatient(id:string){if(!confirm('患者を削除しますか？'))return;const {error}=await supabase.from('patients').delete().eq('id',id);if(error)return setMsg('エラー：'+error.message);await load();setShowPatientForm(false)}
function editSchedule(s:Schedule,from:Tab='today'){setNextDraftInfo('');setReturnTab(from);setEditingScheduleId(s.id);setFacilityId(s.facility_id||'');setSelectedPatientIds(s.patient_ids||[]);setManualPatients(s.patient_ids?.length?'':(s.patient_names?.join('、')||''));setTreatment(s.treatment||treatments[0]);const d=new Date(s.start_at);setStartAt(new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16));setScheduleMemo(s.memo||'');setTab('calendar')}
function getNextDateByFrequency(base:Date, frequency?:string){
  const d=new Date(base);
  const f=(frequency||'').replace(/\s/g,'');

  if(f.includes('隔週') || f.includes('2週')) {
    d.setDate(d.getDate()+14);
    return d;
  }

  if(f.includes('月2') || f.includes('月２') || f.includes('月二')) {
    d.setDate(d.getDate()+14);
    return d;
  }

  if(f.includes('月1') || f.includes('月１') || f.includes('月一') || f.includes('4週')) {
    d.setDate(d.getDate()+28);
    return d;
  }

  if(f.includes('2ヶ月') || f.includes('2カ月') || f.includes('２ヶ月') || f.includes('２カ月')) {
    d.setMonth(d.getMonth()+2);
    return d;
  }

  if(f.includes('毎週') || f.includes('週1') || f.includes('週１') || f.includes('1週')) {
    d.setDate(d.getDate()+7);
    return d;
  }

  d.setDate(d.getDate()+7);
  return d;
}

function createNextSchedule(s:Schedule, displayName?:string, displayIndex=0){
  setReturnTab('today');
  setEditingScheduleId('');
  setFacilityId(s.facility_id||'');

  const ps=(s.patient_ids||[]).map(id=>getPatient(id)).filter(Boolean) as Patient[];
  const targetPatient=ps[displayIndex] || ps.find(p=>p.name===displayName) || patients.find(p=>p.name===displayName);
  const selectedIds=targetPatient ? [targetPatient.id] : (s.patient_ids||[]);
  const manualName=targetPatient ? '' : (displayName || (s.patient_ids?.length ? '' : (s.patient_names?.join('、')||'')));

  setSelectedPatientIds(selectedIds);
  setManualPatients(manualName);

  const selectedTreatment=displayName ? treatmentFor(s,displayName,displayIndex) : (s.treatment||treatments[0]);
  setTreatment(selectedTreatment || treatments[0]);

  const frequency=targetPatient?.visit_frequency || ps[0]?.visit_frequency || '';
  const next=new Date(s.start_at);

  setStartAt(new Date(next.getTime()-next.getTimezoneOffset()*60000).toISOString().slice(0,16));
  setScheduleMemo(s.memo||'');
  setNextDraftInfo(`${displayName || s.patient_names?.join('、')} / ${getFacility(s.facility_id)?.name || ''} / 初期日付：元の予定日`);
  setTab('next');
  setMsg('次回登録ページを開きました。日付を変更して保存してください');
}

function adjustNextDraftDays(days:number){
  if(!startAt)return;
  const d=new Date(startAt);
  d.setDate(d.getDate()+days);
  setStartAt(new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16));
}

function resetSchedule(){setNextDraftInfo('');setEditingScheduleId('');setSelectedPatientIds([]);setManualPatients('');setTreatment(treatments[0]);setStartAt('');setScheduleMemo('')}
async function saveSchedule(){const manual=manualPatients.split(/[、,]/).map(v=>v.trim()).filter(Boolean);const names=[...patientNamesFromIds(selectedPatientIds),...manual];if(!facilityId)return setMsg('施設を選んでください');if(!names.length)return setMsg('患者名を選択してください');if(!startAt)return setMsg('日時を入力してください');const row={facility_id:facilityId,patient_ids:selectedPatientIds,patient_names:names,treatment,start_at:`${startAt}:00+09:00`,memo:scheduleMemo,patient_treatments:Object.fromEntries(names.map((name,index)=>[selectedPatientIds[index]||name,treatment]))};const res=editingScheduleId?await supabase.from('schedules').update(row).eq('id',editingScheduleId):await supabase.from('schedules').insert(row);if(res.error)return setMsg('エラー：'+res.error.message);const back=returnTab;resetSchedule();await load();setTab(back);if(back==='calendar'){setTimeout(()=>{const el=document.getElementById('selected-date-route');if(el)el.scrollIntoView({behavior:'smooth',block:'start'});},150)}}
async function deleteSchedule(id:string){if(!confirm('予定を削除しますか？'))return;const {error}=await supabase.from('schedules').delete().eq('id',id);if(error)return setMsg('エラー：'+error.message);await load()} function patientKeyForCompletion(s:Schedule,name:string,index:number){
  return s.patient_ids?.[index] || name;
}
function isPatientCompleted(s:Schedule,name:string,index:number){
  const key=patientKeyForCompletion(s,name,index);
  return !!s.completed_patients?.[key] || !!s.completed;
}
function schedulePatientCount(s:Schedule){
  return s.patient_names?.length || 1;
}
function scheduleCompletedCount(s:Schedule){
  const names=s.patient_names&&s.patient_names.length?s.patient_names:[''];
  return names.filter((name,index)=>isPatientCompleted(s,name,index)).length;
}
async function togglePatientComplete(s:Schedule,name:string,index:number){
  const key=patientKeyForCompletion(s,name,index);
  const next={...(s.completed_patients||{})};
  next[key]=!next[key];
  const names=s.patient_names&&s.patient_names.length?s.patient_names:[''];
  const doneCount=names.filter((n,i)=> i===index ? next[key] : !!next[patientKeyForCompletion(s,n,i)]).length;
  const allDone=doneCount===names.length;
  const {error}=await supabase.from('schedules').update({
    completed_patients:next,
    completed:allDone,
    completed_at:allDone?new Date().toISOString():null
  }).eq('id',s.id);
  if(error)return setMsg('エラー：'+error.message);
  await load();
}
async function setAllPatientsComplete(s:Schedule,done:boolean){
  const names=s.patient_names&&s.patient_names.length?s.patient_names:[''];
  const next:Record<string,boolean>={};
  names.forEach((name,index)=>{next[patientKeyForCompletion(s,name,index)]=done});
  const {error}=await supabase.from('schedules').update({
    completed_patients:next,
    completed:done,
    completed_at:done?new Date().toISOString():null
  }).eq('id',s.id);
  if(error)return setMsg('エラー：'+error.message);
  await load();
}
async function toggleComplete(s:Schedule){await setAllPatientsComplete(s,!s.completed)}
async function geocodeAddress(address:string){
  const apiKey=process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if(!apiKey){
    setMsg('Google Maps APIキーが未設定です');
    return null;
  }
  if(!address.trim()){
    setMsg('住所を入力してください');
    return null;
  }
  try{
    const url=`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;
    const res=await fetch(url);
    const data=await res.json();
    if(data.status!=='OK' || !data.results?.length){
      setMsg('座標を取得できませんでした。住所を確認してください');
      return null;
    }
    const loc=data.results[0].geometry.location;
    return {lat:loc.lat,lng:loc.lng};
  }catch(e){
    setMsg('座標取得中にエラーが発生しました');
    return null;
  }
}

async function geocodeFacilityAddress(){
  const address=facilityAddress.trim() || facilityName.trim();
  if(!address){
    setMsg('住所を入力してください');
    return null;
  }

  const apiKey=process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if(!apiKey){
    setMsg('Google Maps APIキーが未設定です。VercelのEnvironment Variablesに NEXT_PUBLIC_GOOGLE_MAPS_API_KEY を追加してください');
    return null;
  }

  const loc=await geocodeAddress(address);
  if(!loc)return null;
  setFacilityLat(String(loc.lat));
  setFacilityLng(String(loc.lng));
  setMsg('住所から座標を取得しました');
  return loc;
}

async function saveFacility(){if(!facilityName.trim())return setMsg('施設名を入力してください');let lat=facilityLat?Number(facilityLat):null;let lng=facilityLng?Number(facilityLng):null;if((!lat||!lng)&&facilityAddress.trim()){const geo=await geocodeFacilityAddress();if(geo){lat=geo.lat;lng=geo.lng;}}const row={name:facilityName.trim(),address:facilityAddress,phone:facilityPhone,latitude:lat,longitude:lng};const res=editingFacilityId?await supabase.from('facilities').update(row).eq('id',editingFacilityId):await supabase.from('facilities').insert(row);if(res.error)return setMsg('エラー：'+res.error.message);setEditingFacilityId('');setFacilityName('');setFacilityAddress('');setFacilityPhone('');setFacilityLat('');setFacilityLng('');await load()} function editFacility(f:Facility){setEditingFacilityId(f.id);setFacilityName(f.name||'');setFacilityAddress(f.address||'');setFacilityPhone(f.phone||'');setFacilityLat(f.latitude?String(f.latitude):'');setFacilityLng(f.longitude?String(f.longitude):'')} async function deleteFacility(id:string){if(!confirm('施設を削除しますか？'))return;const {error}=await supabase.from('facilities').delete().eq('id',id);if(error)return setMsg('エラー：'+error.message);await load()}
function scheduleAddress(s:Schedule){const f=getFacility(s.facility_id);const isHome=(f?.name||'').includes('居宅');if(isHome){const p=s.patient_ids?.map(id=>getPatient(id)).find(Boolean);return p?.patient_address||p?.key_person_address||f?.address}return f?.address}
function copyList(list:Schedule[],label:string){
  type Group = {
    key:string;
    timeText:string;
    facilityName:string;
    patients:{name:string;treatment:string}[];
  };

  const groups:Group[] = [];

  list.forEach(s=>{
    const facilityName = getFacility(s.facility_id)?.name || '';
    const timeText = time(s.start_at);
    const key = `${timeText}__${facilityName}`;
    let group = groups.find(g=>g.key===key);

    if(!group){
      group = { key, timeText, facilityName, patients:[] };
      groups.push(group);
    }

    const names = s.patient_names && s.patient_names.length ? s.patient_names : [''];
    names.forEach((name,index)=>{
      group!.patients.push({
        name,
        treatment: treatmentFor(s,name,index) || s.treatment || ''
      });
    });
  });

  const nl = String.fromCharCode(10);

  const blocks = groups.map(g=>{
    const header = `${g.timeText}　${g.facilityName}`;
    const patientsText = g.patients.map(p=>{
      return `・${p.name}${p.treatment ? `　　${p.treatment}` : ''}`;
    }).join(nl);

    return [header,'────────────────',patientsText].join(nl);
  });

  const text = [`【${label}】`,'',blocks.join(nl+nl) || '該当なし'].join(nl);

  navigator.clipboard.writeText(text);
  setMsg(label + 'をコピーしました');
}

function copyToday(onlyDone=false){copyList(onlyDone?todaySchedules.filter(s=>s.completed):todaySchedules,onlyDone?'本日の日報':'本日の予定')}
function roomSortValue(name:string,index:number,s:Schedule){
  const p=(s.patient_ids||[]).map(id=>getPatient(id)).filter(Boolean)[index] || patients.find(x=>x.name===name);
  const room=p?.room||'';
  const n=parseInt(room.replace(/[^0-9]/g,''),10);
  return Number.isFinite(n)?n:999999+index;
}
function ScheduleGroupHeader({s}:{s:Schedule}){
  const f=getFacility(s.facility_id);
  const total=schedulePatientCount(s);
  const doneCount=scheduleCompletedCount(s);
  const rate=total?Math.round((doneCount/total)*100):0;
  return <div className='facilityGroupHeader'>
    <div className='row'>
      <div>
        <div className='facilityGroupTime'>{time(s.start_at)}　{f?.name}</div>
        <div className='small'>同施設まとめ / {total}名</div>
      </div>
      <span className='badge'>{doneCount}/{total} 完了</span>
    </div>
    <div className='progressOuter'><div className='progressInner' style={{width:`${rate}%`}} /></div>
    <div className='grid2'>
      <button className='secondary done' onClick={()=>setAllPatientsComplete(s,true)}>全員完了</button>
      <button className='secondary' onClick={()=>setAllPatientsComplete(s,false)}>全員未完了</button>
    </div>
  </div>
}

function renderScheduleCards(list:Schedule[], options?:{showDate?:boolean;from?:Tab;allowComplete?:boolean}){
  return list.flatMap(s=>{
    const names=s.patient_names&&s.patient_names.length?s.patient_names:[''];
    const cards=names
      .map((name,index)=>({name,index,sort:roomSortValue(name,index,s)}))
      .sort((a,b)=>a.sort-b.sort)
      .map(({name,index})=>(
      <ScheduleCard
        key={`${s.id}-${index}`}
        s={s}
        showDate={options?.showDate}
        from={options?.from}
        allowComplete={options?.allowComplete}
        displayName={name}
        displayIndex={index}
      />
    ));
    return [
      <ScheduleGroupHeader key={`${s.id}-header`} s={s}/>,
      ...cards
    ];
  });
}

function openSchedulePatient(s:Schedule, displayName?:string, displayIndex=0){
  const ps=(s.patient_ids||[]).map(id=>getPatient(id)).filter(Boolean) as Patient[];
  const p=ps[displayIndex] || ps.find(x=>x.name===displayName) || patients.find(x=>x.name===displayName) || ps[0];
  if(p){
    openPatient(p);
  }else{
    setMsg('患者情報が見つかりません');
  }
}

function locationFromSchedule(s?:Schedule){
  if(!s)return null;
  const f=getFacility(s.facility_id);
  const isHome=(f?.name||'').includes('居宅');
  if(isHome){
    const p=(s.patient_ids||[]).map(id=>getPatient(id)).find(Boolean);
    if(p?.patient_latitude&&p?.patient_longitude){
      return {latitude:p.patient_latitude,longitude:p.patient_longitude,name:p.name};
    }
  }
  if(f?.latitude&&f?.longitude){
    return {latitude:f.latitude,longitude:f.longitude,name:f.name};
  }
  return null;
}

function distanceBetweenLocations(a:any,b:any){
  if(!a?.latitude||!a?.longitude||!b?.latitude||!b?.longitude)return null;
  const R=6371;
  const dLat=(b.latitude-a.latitude)*Math.PI/180;
  const dLng=(b.longitude-a.longitude)*Math.PI/180;
  const lat1=a.latitude*Math.PI/180;
  const lat2=b.latitude*Math.PI/180;
  const x=Math.sin(dLat/2)**2+Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLng/2)**2;
  return R*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x));
}

async function bulkGeocodeFacilities(){
  let ok=0;
  let ng=0;
  for(const f of facilities){
    if(f.latitude&&f.longitude)continue;
    const address=(f.address||f.name||'').trim();
    if(!address){ng++;continue;}
    const loc=await geocodeAddress(address);
    if(loc){
      const {error}=await supabase.from('facilities').update({latitude:loc.lat,longitude:loc.lng}).eq('id',f.id);
      if(error)ng++; else ok++;
    }else{
      ng++;
    }
  }
  await load();
  setMsg(`施設座標 一括取得：成功${ok}件 / 失敗${ng}件`);
}

async function bulkGeocodePatients(){
  let ok=0;
  let ng=0;
  for(const p of patients){
    if(p.patient_latitude&&p.patient_longitude)continue;
    const f=getFacility(p.facility_id);
    const address=(p.patient_address||p.key_person_address||f?.address||'').trim();
    if(!address){ng++;continue;}
    const loc=await geocodeAddress(address);
    if(loc){
      const {error}=await supabase.from('patients').update({patient_latitude:loc.lat,patient_longitude:loc.lng}).eq('id',p.id);
      if(error)ng++; else ok++;
    }else{
      ng++;
    }
  }
  await load();
  setMsg(`患者座標 一括取得：成功${ok}件 / 失敗${ng}件`);
}

function distanceKm(a?:Facility,b?:Facility){
  if(!a?.latitude||!a?.longitude||!b?.latitude||!b?.longitude)return null;
  const R=6371;
  const dLat=(b.latitude-a.latitude)*Math.PI/180;
  const dLng=(b.longitude-a.longitude)*Math.PI/180;
  const lat1=a.latitude*Math.PI/180;
  const lat2=b.latitude*Math.PI/180;
  const x=Math.sin(dLat/2)**2+Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLng/2)**2;
  return R*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x));
}
function estimateDriveMinutes(km:number){
  return Math.max(5,Math.round((km/25)*60+5));
}

function groupSchedulesForRoute(list:Schedule[]){
  type RouteGroup = {key:string; timeText:string; facilityName:string; schedules:Schedule[]; patientCount:number};
  const groups:RouteGroup[] = [];
  list.forEach(s=>{
    const facilityName=getFacility(s.facility_id)?.name || '';
    const timeText=time(s.start_at);
    const key=`${timeText}__${facilityName}`;
    let group=groups.find(g=>g.key===key);
    if(!group){
      group={key,timeText,facilityName,schedules:[],patientCount:0};
      groups.push(group);
    }
    group.schedules.push(s);
    group.patientCount += s.patient_names?.length || 1;
  });
  return groups;
}

function scrollToTodayRoute(){
  const el=document.getElementById('today-route');
  if(el){
    el.scrollIntoView({behavior:'smooth',block:'start'});
    el.classList.add('flashTarget');
    setTimeout(()=>el.classList.remove('flashTarget'),1200);
  }else{
    setTab('today');
    setTimeout(()=>{
      const route=document.getElementById('today-route');
      if(route)route.scrollIntoView({behavior:'smooth',block:'start'});
    },100);
  }
}

function scrollToSchedule(s:Schedule){
  const el=document.getElementById(`schedule-${s.id}`);
  if(el){
    el.scrollIntoView({behavior:'smooth',block:'start'});
    el.classList.add('flashTarget');
    setTimeout(()=>el.classList.remove('flashTarget'),1200);
  }
}

function RouteBox({list,title,count,id}:{list:Schedule[];title:string;count:number;id?:string}){
  const groups=groupSchedulesForRoute(list);
  const startLocation={latitude:33.5590829,longitude:130.4266273,name:'大橋駅'};
  let totalKm=0;
  let totalMins=0;

  function travelText(from:any,to:any,label:string){
    const km=to?distanceBetweenLocations(from,to):null;
    if(km===null)return `↓ 🚗 ${label}：緯度経度未登録`;
    const mins=estimateDriveMinutes(km);
    totalKm += km;
    totalMins += mins;
    return `↓ 🚗 ${label} 約${mins}分（${km.toFixed(1)}km）`;
  }

  return <div id={id} className='routeBox'>
    <div className='routeHead'><h2>{title}</h2><span className='badge'>{count}名</span></div>
    <div className='startPoint'>🚉 出発：大橋駅</div>
    {groups.length===0&&<p className='small'>予定はありません。</p>}

    {groups.length>0&&<div className='travelLine startTravel'>
      {travelText(startLocation,locationFromSchedule(groups[0].schedules[0]),'最初の訪問先まで')}
    </div>}

    {groups.map((g,index)=>{
      const currentLocation=locationFromSchedule(g.schedules[0]);
      const nextGroup=groups[index+1];
      const nextLocation=nextGroup?locationFromSchedule(nextGroup.schedules[0]):null;
      const travel=nextGroup?travelText(currentLocation,nextLocation,'次の訪問先まで'):null;
      return <div key={g.key}>
        <button className='routeItem' onClick={()=>scrollToSchedule(g.schedules[0])}>
          <div><b>{g.timeText}　{g.facilityName}</b><div className='small'>{g.patientCount}名 / タップで予定へ移動</div></div><span>▶</span>
        </button>
        {nextGroup&&<div className='travelLine'>{travel}</div>}
      </div>
    })}

    {groups.length>0&&(()=>{
      const last=groups[groups.length-1];
      const lastLocation=locationFromSchedule(last.schedules[0]);
      const backText=travelText(lastLocation,startLocation,'大橋駅へ戻る');
      return <div>
        <div className='travelLine returnTravel'>{backText}</div>
        <div className='endPoint'>🏁 到着：大橋駅</div>
        <div className='routeTotal'>総移動： 約{Math.round(totalMins)}分 / {totalKm.toFixed(1)}km</div>
      </div>
    })()}
  </div>
}

function TodayRoute(){
  return <RouteBox list={todaySchedules} title='🚗 今日のルート' count={todayCardCount} id='today-route'/>;
}

function ScheduleCard({s,showDate=false,from='today',allowComplete=true,displayName,displayIndex=0}:{s:Schedule;showDate?:boolean;from?:Tab;allowComplete?:boolean;displayName?:string;displayIndex?:number}){
  const f=getFacility(s.facility_id);
  const isHome=(f?.name||'').includes('居宅');
  const ps=(s.patient_ids||[]).map(id=>getPatient(id)).filter(Boolean) as Patient[];
  const cardPatient=ps[displayIndex] || ps.find(p=>p.name===displayName) || ps[0];
  const patientName=displayName || s.patient_names?.join('、') || '';
  const done=displayName?isPatientCompleted(s,patientName,displayIndex):!!s.completed;
  const total=schedulePatientCount(s);
  const doneCount=scheduleCompletedCount(s);
  const rate=total?Math.round((doneCount/total)*100):0;
  const roomText=cardPatient?.room ? `🏠 ${cardPatient.room}` : '';
  const treatmentText=displayName ? treatmentFor(s,displayName,displayIndex) : s.treatment;

  return <div id={`schedule-${s.id}`} className={'item compactCard '+(done?'completed':'')}>
    <div className='compactTop'>
      <div>
        <div className='compactTime'>{showDate?fmt(s.start_at):time(s.start_at)}　{f?.name}</div>
        <div className='compactPatient'>{done?'✓':'○'} {patientName}</div>
        <div className='compactMeta'>{roomText} {roomText?' / ':''}🦷 {treatmentText}</div>
      </div>
      <div className='compactActions'>
        {allowComplete&&displayName&&<button className={done?'circleDone on':'circleDone'} onClick={()=>togglePatientComplete(s,patientName,displayIndex)}>{done?'✓':'○'}</button>}
        <button className='nextAlways' onClick={()=>createNextSchedule(s,displayName,displayIndex)}>次回</button>
      </div>
    </div>

    <div className='compactProgress'>
      <span>{doneCount}/{total} 完了</span>
      <div className='progressOuter'><div className='progressInner' style={{width:`${rate}%`}} /></div>
    </div>

    <details className='compactDetails'>
      <summary>詳細 ▼</summary>

      <div className='detailGrid'>
        <button className='secondary patientDetail' onClick={()=>openSchedulePatient(s,displayName,displayIndex)}>患者詳細</button>
        <button className='secondary' onClick={()=>openMap(scheduleAddress(s),f?.name)}>ナビ</button>
        {from==='today'&&<button className='secondary routeBack' onClick={()=>scrollToTodayRoute()}>⬆ ルートへ戻る</button>}{from==='calendar'&&<button className='secondary routeBack' onClick={()=>{const el=document.getElementById('selected-date-route'); if(el)el.scrollIntoView({behavior:'smooth',block:'start'});}}>⬆ この日のルートへ戻る</button>}
      </div>

      {displayName&&<div className='treatmentEdit'>
        <label>診療内容</label>
        <select value={treatmentFor(s,displayName,displayIndex)} onChange={e=>updatePatientTreatment(s,displayName,displayIndex,e.target.value)}>
          {treatments.map(t=><option key={t} value={t}>{t}</option>)}
        </select>
      </div>}

      <div className='phoneBox'>
        <div className='small'>電話</div>
        <div className='grid2'>
          {f?.phone&&<button className='secondary phone' onClick={()=>callPhone(f.phone)}>🏢 施設へ電話</button>}
          {cardPatient?.phone&&<button className='secondary phone' onClick={()=>callPhone(cardPatient.phone)}>📞 {cardPatient.name}へ電話</button>}
        </div>
        {!f?.phone&&!cardPatient?.phone&&<div className='small'>電話番号未登録</div>}
      </div>

      {cardPatient?.key_person&&<div className='small'>KP：{cardPatient.key_person} {cardPatient.phone?` / ${cardPatient.phone}`:''}</div>}
      {s.memo&&<div className='small'>備考：{s.memo}</div>}
      {isHome&&cardPatient&&<button className='secondary' onClick={()=>openMap(cardPatient.patient_address||cardPatient.key_person_address,cardPatient.name)}>{cardPatient.name} の地図</button>}
    </details>
  </div>
}
function renderPatientForm(){const p=patientForm;const hist=history(p).slice(-6).reverse();return <div className='detail'><div className='row'><h2>{p.id?'👤 患者詳細':'➕ 患者登録'}</h2><button className='mini' onClick={()=>setShowPatientForm(false)}>閉じる</button></div>{p.id&&<div className='grid2'><div className='stat'><b>{monthCount(p)}</b>今月</div><div className='stat'><b>{hist.length}</b>履歴</div></div>}<label>施設</label><select value={p.facility_id||''} onChange={e=>setPatientField('facility_id',e.target.value)}>{facilities.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}</select><div className='grid2'><div><label>患者名</label><input value={p.name||''} onChange={e=>setPatientField('name',e.target.value)}/></div><div><label>フリガナ</label><input value={p.kana||''} onChange={e=>setPatientField('kana',e.target.value)}/></div></div><label>患者住所</label><textarea value={p.patient_address||''} onChange={e=>setPatientField('patient_address',e.target.value)}/><label>部屋番号</label><input value={p.room||''} onChange={e=>setPatientField('room',e.target.value)}/>
<label>訪問頻度</label>
<select value={p.visit_frequency||''} onChange={e=>setPatientField('visit_frequency',e.target.value)}>
  <option value=''>未設定</option>
  <option value='毎週'>毎週</option>
  <option value='隔週'>隔週</option>
  <option value='月2'>月2</option>
  <option value='月1'>月1</option>
  <option value='2ヶ月に1回'>2ヶ月に1回</option>
  <option value='その他'>その他</option>
</select>
{p.visit_frequency==='その他'&&<input value={p.memo||''} onChange={e=>setPatientField('memo',e.target.value)} placeholder='例：第2火曜日、3週間ごと など'/>}
<div className='frequencyHelp'>次回登録はこの訪問頻度を見て自動計算します。</div><label>キーパーソン</label><input value={p.key_person||''} onChange={e=>setPatientField('key_person',e.target.value)}/><label>電話</label><input value={p.phone||''} onChange={e=>setPatientField('phone',e.target.value)}/><label>キーパーソン住所</label><textarea value={p.key_person_address||''} onChange={e=>setPatientField('key_person_address',e.target.value)}/><label>ケアマネ</label><input value={p.care_manager||''} onChange={e=>setPatientField('care_manager',e.target.value)}/><label>メモ</label><textarea value={p.memo||''} onChange={e=>setPatientField('memo',e.target.value)}/>{p.id&&<><h3>診療履歴</h3>{hist.map(h=><div className='item' key={h.id}><b>{dateOnly(h.start_at)}</b><div className='small'>{h.treatment} / {getFacility(h.facility_id)?.name}</div></div>)}</>}<div className='grid3'><button className='secondary' onClick={()=>callPhone(p.phone)}>電話</button><button className='secondary' onClick={()=>openMap(p.patient_address||p.key_person_address,p.name)}>地図</button><button className='secondary danger' onClick={()=>deletePatient(p.id)}>削除</button></div><button className='primary' onClick={savePatient}>保存</button></div>}

function monthSchedules(){
  const [y,m]=selectedMonth.split('-').map(Number);
  return sortedSchedules.filter(s=>{
    const d=new Date(s.start_at);
    return d.getFullYear()===y && d.getMonth()+1===m;
  });
}

function calendarDays(){
  const [y,m]=selectedMonth.split('-').map(Number);
  const first=new Date(y,m-1,1);
  const last=new Date(y,m,0);
  const days:(Date|null)[]=[];
  for(let i=0;i<first.getDay();i++) days.push(null);
  for(let day=1;day<=last.getDate();day++) days.push(new Date(y,m-1,day));
  return days;
}

function schedulesForDate(day:Date){
  return sortedSchedules.filter(s=>{
    const d=new Date(s.start_at);
    return d.getFullYear()===day.getFullYear() && d.getMonth()===day.getMonth() && d.getDate()===day.getDate();
  });
}

function moveMonth(diff:number){
  const [y,m]=selectedMonth.split('-').map(Number);
  const d=new Date(y,m-1+diff,1);
  setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`);
}


function toYmd(d:Date){
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function selectedDateSchedules(){
  const [y,m,day]=selectedDate.split('-').map(Number);
  return sortedSchedules.filter(s=>{
    const d=new Date(s.start_at);
    return d.getFullYear()===y && d.getMonth()+1===m && d.getDate()===day;
  });
}

function createScheduleForSelectedDate(){
  setReturnTab('calendar');
  setNextDraftInfo('');
  setEditingScheduleId('');
  setSelectedPatientIds([]);
  setManualPatients('');
  setTreatment(treatments[0]);
  setScheduleMemo('');
  setStartAt(`${selectedDate}T10:00`);
  setTab('calendar');
  setMsg('選択した日付で新規予定を作成します');
}

function CalendarDayDetail(){
  const list=selectedDateSchedules();
  return <div className='dayDetail'>
    <div className='dayDetailHead'>
      <div>
        <h2>📌 {selectedDate} の予定</h2>
        <div className='small'>この日の予定を閲覧・編集できます</div>
      </div>
      <div className='tomorrowCount'>{cardCount(list)}件</div>
    </div>
    <button className='primary' onClick={createScheduleForSelectedDate}>この日に予定を追加</button>
    <RouteBox list={list} title='🚗 この日のルート' count={cardCount(list)} id='selected-date-route'/>
    {list.length===0&&<p className='small'>この日の予定はありません。</p>}
    {renderScheduleCards(list,{showDate:true,from:'calendar'})}
  </div>
}

function CalendarMonth(){
  const days=calendarDays();
  const ms=monthSchedules();
  return <div className='calendarBox'>
    <div className='calendarHead'>
      <button className='mini' onClick={()=>moveMonth(-1)}>前月</button>
      <h2>{selectedMonth}</h2>
      <button className='mini' onClick={()=>moveMonth(1)}>翌月</button>
    </div>
    <div className='grid2'>
      <div className='stat'><b>{ms.length}</b>今月予定</div>
      <div className='stat'><b>{ms.filter(s=>s.completed).length}</b>完了</div>
    </div>
    <div className='weekRow'>
      {['日','月','火','水','木','金','土'].map(w=><div key={w}>{w}</div>)}
    </div>
    <div className='monthGrid'>
      {days.map((day,i)=>{
        if(!day) return <div key={i} className='dayCell empty'></div>;
        const list=schedulesForDate(day);
        const isToday=isSameYmd(day,new Date());
        return <button key={i} className={'dayCell '+(isToday?'todayCell':'')} onClick={()=>setSelectedDate(toYmd(day))}>
          <div className='dayNum'>{day.getDate()}</div>
          {list.slice(0,3).map(s=><div key={s.id} className='daySchedule'>
            {time(s.start_at)} {getFacility(s.facility_id)?.name || ''}
          </div>)}
          {list.length>3&&<div className='more'>+{list.length-3}件</div>}
        </button>
      })}
    </div>
  </div>
}

return <main className='wrap'><section className='head'><h1>FRONTIER OS</h1><div>訪問歯科支援センターフロンティア</div></section><section className='card'>{tab==='home'&&<div><h2>ダッシュボード</h2><div className='grid3'><div className='stat'><b>{todayCardCount}</b>本日</div><div className='stat'><b>{completed}</b>完了</div><div className='stat'><b>{remaining}</b>残り</div></div><div className='grid2'><div className='stat'><b>{tomorrowCardCount}</b>明日</div><div className='stat'><b>{patients.length}</b>患者</div></div><div className='menu'><button onClick={()=>setTab('today')}>🚗 今日/明日</button><button onClick={()=>setTab('patients')}>👤 患者</button><button onClick={()=>setTab('facilities')}>🏢 施設</button><button onClick={()=>setTab('calendar')}>📅 予定登録</button></div><TodayRoute/><h3>🚗 今日の訪問</h3>{renderScheduleCards(todaySchedules.slice(0,3),{from:'today'})}<button className='secondary' onClick={()=>setTab('today')}>今日の訪問をすべて見る</button><div className='tomorrowBox'><div className='tomorrowHead'><div><h3>📅 明日の訪問</h3><div className='small'>今日とは別画面で確認できます</div></div><div className='tomorrowCount'>{tomorrowCardCount}件</div></div><button className='primary' onClick={()=>setTab('tomorrow')}>明日の訪問を開く</button><button className='secondary' onClick={()=>copyList(tomorrowSchedules,'明日の予定')}>明日の予定をコピー</button></div></div>}{tab==='today'&&<div><TodayRoute/><h2>🚗 今日の訪問</h2><div className='grid3'><div className='stat'><b>{todayCardCount}</b>予定</div><div className='stat'><b>{completed}</b>完了</div><div className='stat'><b>{remaining}</b>残り</div></div><div className='grid2'><button className='primary' onClick={()=>copyToday(false)}>予定コピー</button><button className='primary' onClick={()=>copyToday(true)}>日報コピー</button></div>{renderScheduleCards(todaySchedules,{from:'today'})}</div>}{tab==='tomorrow'&&<div><div className='tomorrowBox'><div className='tomorrowHead'><div><h2>📅 明日の訪問</h2><div className='small'>今日の予定とは別に表示しています</div></div><div className='tomorrowCount'>{tomorrowCardCount}件</div></div><button className='primary' onClick={()=>copyList(tomorrowSchedules,'明日の予定')}>明日の予定をコピー</button>{tomorrowSchedules.length===0&&<p className='small'>明日の予定はありません。</p>}{renderScheduleCards(tomorrowSchedules,{from:'tomorrow',allowComplete:false})}</div></div>}{tab==='next'&&<div className='nextPageBox'><div className='row'><h2>📅 次回登録</h2><button className='mini' onClick={()=>setTab(returnTab)}>戻る</button></div>{nextDraftInfo&&<div className='nextSummary'><b>対象</b><div className='small'>{nextDraftInfo}</div></div>}<label>施設</label><select value={facilityId} onChange={e=>{setFacilityId(e.target.value);setSelectedPatientIds([])}}>{facilities.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}</select><label>患者</label><div className='checks'>{facilityPatients.map(p=><label className='checkrow' key={p.id}><input type='checkbox' checked={selectedPatientIds.includes(p.id)} onChange={e=>setSelectedPatientIds(prev=>e.target.checked?[...prev,p.id]:prev.filter(x=>x!==p.id))}/>{p.name}{p.visit_frequency&&<span className='badge'>頻度：{p.visit_frequency}</span>}</label>)}</div><label>手入力</label><input value={manualPatients} onChange={e=>setManualPatients(e.target.value)} placeholder='患者リストにない場合だけ入力'/><label>次回日時</label><input type='datetime-local' value={startAt} onChange={e=>setStartAt(e.target.value)}/><div className='grid3'><button className='secondary' onClick={()=>adjustNextDraftDays(7)}>+1週</button><button className='secondary' onClick={()=>adjustNextDraftDays(14)}>+2週</button><button className='secondary' onClick={()=>adjustNextDraftDays(28)}>+4週</button></div><label>診療内容</label><select value={treatment} onChange={e=>setTreatment(e.target.value)}>{treatments.map(t=><option key={t}>{t}</option>)}</select><label>備考</label><textarea value={scheduleMemo} onChange={e=>setScheduleMemo(e.target.value)} placeholder='次回メモ・注意事項'/><button className='primary' onClick={saveSchedule}>次回予定を保存</button></div>}{tab==='patients'&&<div><div className='row'><h2>👤 患者</h2><button className='mini' onClick={newPatient}>新規</button></div>{showPatientForm&&renderPatientForm()}<label>検索</label><input className='search' value={patientSearch} onChange={e=>setPatientSearch(e.target.value)} placeholder='患者名・施設・電話・住所'/>{filteredPatients.map(p=>{const f=getFacility(p.facility_id);const n=nextSchedule(p);return <div className='item' key={p.id} onClick={()=>openPatient(p)}><div className='row'><b>{p.name}</b><button className='mini'>開く</button></div><div className='small'>{f?.name} {p.room?'/ '+p.room:''}</div><span className='badge'>今月 {monthCount(p)}回</span>{n&&<span className='badge'>次回 {fmt(n.start_at)}</span>}</div>})}</div>}{tab==='facilities'&&<div><h2>🏢 施設</h2><div className='bulkBox'><button className='secondary geoButton' onClick={bulkGeocodeFacilities}>施設座標を一括取得</button><button className='secondary geoButton' onClick={bulkGeocodePatients}>患者/居宅座標を一括取得</button><div className='small'>患者住所がある場合は患者住所、なければ施設住所から取得します。</div></div><label>施設名</label><input value={facilityName} onChange={e=>setFacilityName(e.target.value)}/><label>住所</label><input value={facilityAddress} onChange={e=>setFacilityAddress(e.target.value)}/><label>電話</label><input value={facilityPhone} onChange={e=>setFacilityPhone(e.target.value)}/><div className='grid2'><div><label>緯度</label><input value={facilityLat} onChange={e=>setFacilityLat(e.target.value)} placeholder='33.5902'/></div><div><label>経度</label><input value={facilityLng} onChange={e=>setFacilityLng(e.target.value)} placeholder='130.4017'/></div></div><div className='small'>住所保存時に座標を自動取得します。取得できない場合は下のボタンで再取得してください。</div><button className='secondary geoButton' onClick={geocodeFacilityAddress}>住所から座標を取得</button><button className='primary' onClick={saveFacility}>{editingFacilityId?'更新':'登録'}</button><label>検索</label><input className='search' value={facilitySearch} onChange={e=>setFacilitySearch(e.target.value)}/>{filteredFacilities.map(f=><div className='item' key={f.id}><b>{f.name}</b><div className='small'>{f.address} {f.phone}</div><div className='small'>{f.latitude&&f.longitude?`座標：${f.latitude}, ${f.longitude}`:'座標未登録'}</div><div className='grid3'><button className='secondary' onClick={()=>editFacility(f)}>編集</button><button className='secondary' onClick={()=>openMap(f.address,f.name)}>地図</button><button className='secondary danger' onClick={()=>deleteFacility(f.id)}>削除</button></div></div>)}</div>}{tab==='calendar'&&<div><CalendarMonth/><CalendarDayDetail/><h2>{nextDraftInfo?'📅 次回予定の確認・編集':(editingScheduleId?'✏️ 予定編集':'📅 予定登録')}</h2>{nextDraftInfo&&<div className='nextDraftBox'><b>次回登録中</b><div className='small'>{nextDraftInfo}</div><div className='grid3'><button className='secondary' onClick={()=>adjustNextDraftDays(7)}>+1週</button><button className='secondary' onClick={()=>adjustNextDraftDays(14)}>+2週</button><button className='secondary' onClick={()=>adjustNextDraftDays(28)}>+4週</button></div><div className='small'>下の「日時」「診療内容」を確認して、最後に保存してください。</div></div>}<label>施設</label><select value={facilityId} onChange={e=>{setFacilityId(e.target.value);setSelectedPatientIds([])}}>{facilities.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}</select><label>患者</label><div className='checks'>{facilityPatients.map(p=><label className='checkrow' key={p.id}><input type='checkbox' checked={selectedPatientIds.includes(p.id)} onChange={e=>setSelectedPatientIds(prev=>e.target.checked?[...prev,p.id]:prev.filter(x=>x!==p.id))}/>{p.name}</label>)}</div><label>手入力</label><input value={manualPatients} onChange={e=>setManualPatients(e.target.value)}/><label>処置</label><select value={treatment} onChange={e=>setTreatment(e.target.value)}>{treatments.map(t=><option key={t}>{t}</option>)}</select><label>日時</label><input type='datetime-local' value={startAt} onChange={e=>setStartAt(e.target.value)}/><label>備考</label><textarea value={scheduleMemo} onChange={e=>setScheduleMemo(e.target.value)}/><button className='primary' onClick={saveSchedule}>{nextDraftInfo?'次回予定を保存':(editingScheduleId?'予定を更新':'保存')}</button><h3>全予定</h3>{renderScheduleCards(sortedSchedules,{showDate:true,from:'calendar'})}</div>}{msg&&<div className='msg'>{msg}</div>}</section><nav className='bottom'><button className={tab==='home'?'on':''} onClick={()=>setTab('home')}>🏠<br/>ホーム</button><button className={tab==='today'?'on':''} onClick={()=>setTab('today')}>🚗<br/>今日</button><button className={tab==='tomorrow'?'on':''} onClick={()=>setTab('tomorrow')}>📅<br/>明日</button><button className={tab==='patients'?'on':''} onClick={()=>setTab('patients')}>👤<br/>患者</button><button className={tab==='facilities'?'on':''} onClick={()=>setTab('facilities')}>🏢<br/>施設</button><button className={tab==='calendar'?'on':''} onClick={()=>setTab('calendar')}>📅<br/>予定</button></nav></main>
}
