'use client';
import {useEffect,useMemo,useState} from 'react';
import {supabase} from './lib/supabase';

type Clinic={id:string;name:string;shortName:string;color?:string;invoiceRecipient?:string;faxSender?:string;portalPin?:string;portalLoginId?:string;portalPassword?:string;startAddress?:string;startLat?:number;startLng?:number;endAddress?:string;endLat?:number;endLng?:number;memo?:string};
type Facility={id:string;name:string;address?:string;phone?:string;latitude?:number;longitude?:number;fax_number?:string;fax_schedule_type?:string;clinic_id?:string};
type Patient={id:string;created_at?:string;createdAt?:string;facility_id?:string;name:string;kana?:string;room?:string;patient_address?:string;patient_latitude?:number;patient_longitude?:number;key_person?:string;key_person_address?:string;relationship?:string;phone?:string;care_manager?:string;care_manager_company?:string;care_manager_phone?:string;payment?:string;visit_frequency?:string;call_before_visit?:boolean;family_attendance?:boolean;free_checkup?:boolean;medical_history?:string;memo?:string;clinic_id?:string};
type Schedule={id:string;facility_id?:string;patient_ids?:string[];patient_names:string[];treatment:string;patient_treatments?:Record<string,string>;completed_patients?:Record<string,boolean>;canceled_patients?:Record<string,boolean>;cancel_reasons?:Record<string,string>;patient_memos?:Record<string,string>;route_no?:number;start_at:string;memo?:string;completed?:boolean;clinic_id?:string};
type Tab='home'|'today'|'route1'|'route2'|'tomorrow'|'next'|'patients'|'facilities'|'calendar'|'admin'|'adminBilling'|'adminStaff'|'adminFax'|'adminReports'|'adminAI'|'adminClinics'|'adminSettings'|'clinicPortal'|'adminBillingSettings';
const defaultTreatments=[
  '口腔ケア',
  '義歯調整',
  '義歯修理',
  '義歯印象',
  '義歯BITE',
  '義歯セット',
  '義歯TF',
  '義歯新製',
  '義歯洗浄',
  '歯石除去',
  'スケーリング',
  'SRP',
  'PMTC',
  '虫歯治療',
  'CR充填',
  '根管治療',
  '抜歯',
  '消毒',
  '投薬',
  '疼痛確認',
  '歯牙動揺確認',
  '口腔内診査',
  '無料検診',
  '嚥下評価',
  '摂食嚥下指導',
  '口腔リハビリ',
  '口腔機能訓練',
  '口腔機能管理',
    '家族説明',
  'ケアマネ報告',
  '担当者会議',
      'その他'
];
const emptyPatient:Patient={id:'',facility_id:'',name:'',kana:'',room:'',patient_address:'',key_person:'',key_person_address:'',relationship:'',phone:'',care_manager:'',care_manager_company:'',care_manager_phone:'',payment:'',visit_frequency:'',call_before_visit:false,family_attendance:false,free_checkup:false,medical_history:'',memo:''};

const FRONTIER_VERSION='FRONTIER OS Ver.3.0.2 医院フィルター修正';
const FRONTIER_BUILD='2026-07-05';

export default function Page(){
const [tab,setTab]=useState<Tab>('home'),[clinics,setClinics]=useState<Clinic[]>([{id:'aloha',name:'アロハ歯科・矯正歯科',shortName:'ALOHA',color:'#0284c7',invoiceRecipient:'アロハ歯科・矯正歯科　御中',faxSender:'アロハ歯科\n訪問担当',portalPin:'2026',portalLoginId:'aloha',portalPassword:'2026'}]),[activeClinicId,setActiveClinicId]=useState('aloha'),[clinicForm,setClinicForm]=useState<Clinic>({id:'',name:'',shortName:'',color:'#0284c7',invoiceRecipient:'',faxSender:'',portalPin:'2026',portalLoginId:'',portalPassword:'',startAddress:'',endAddress:''}),[facilities,setFacilities]=useState<Facility[]>([]),[patients,setPatients]=useState<Patient[]>([]),[schedules,setSchedules]=useState<Schedule[]>([]),[msg,setMsg]=useState(''),[demoMode,setDemoMode]=useState(false),[guidedDemo,setGuidedDemo]=useState(false),[guidedStep,setGuidedStep]=useState(0),[guidedCollapsed,setGuidedCollapsed]=useState(false),[easyMode,setEasyMode]=useState(true),[calendarActiveRoute,setCalendarActiveRoute]=useState<1|2>(1),[routePreview,setRoutePreview]=useState<{routeNo:1|2;ids:string[];baseStart:string}|null>(null),[draggingRouteId,setDraggingRouteId]=useState(''),[cancelModal,setCancelModal]=useState<{s:Schedule;name:string;index:number}|null>(null),[adminUnlocked,setAdminUnlocked]=useState(false);
const [clinicUnlocked,setClinicUnlocked]=useState(false),[clinicLoginInput,setClinicLoginInput]=useState(''),[clinicPasswordInput,setClinicPasswordInput]=useState(''),[clinicPinInput,setClinicPinInput]=useState(''),[clinicPortalPin,setClinicPortalPin]=useState('2026');
const [adminUnitPrices,setAdminUnitPrices]=useState({visit1:2500,visit2:3000,ope1:1500,ope2:2000});
const [newPatientInfoFeePrice,setNewPatientInfoFeePrice]=useState(1000);
const [newPatientInfoFeeEnabled,setNewPatientInfoFeeEnabled]=useState<Record<string,boolean>>({});
const [billingMonth,setBillingMonth]=useState(()=>new Date().toISOString().slice(0,7));
const [billingFacilityTypes,setBillingFacilityTypes]=useState<Record<string,string>>({});
const [billingPatientTypes,setBillingPatientTypes]=useState<Record<string,string>>({});
const [treatmentOptions,setTreatmentOptions]=useState<string[]>(defaultTreatments),[newTreatment,setNewTreatment]=useState('');
const [scheduleLocationType,setScheduleLocationType]=useState<string>('facility');
const [facilityId,setFacilityId]=useState(''),[selectedPatientIds,setSelectedPatientIds]=useState<string[]>([]),[manualPatients,setManualPatients]=useState(''),[schedulePatientSearch,setSchedulePatientSearch]=useState(''),[treatment,setTreatment]=useState(defaultTreatments[0]),[startAt,setStartAt]=useState(''),[scheduleMemo,setScheduleMemo]=useState(''),[routeNo,setRouteNo]=useState(1),[editingScheduleId,setEditingScheduleId]=useState(''),[returnTab,setReturnTab]=useState<Tab>('today');
const [addingScheduleId,setAddingScheduleId]=useState(''),[addPatientSearch,setAddPatientSearch]=useState(''),[addPatientIds,setAddPatientIds]=useState<string[]>([]),[addPatientModalSchedule,setAddPatientModalSchedule]=useState<Schedule|null>(null);
const [selectedMonth,setSelectedMonth]=useState(()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`});
const [selectedDate,setSelectedDate]=useState(()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`});
const tutorialSteps=[
  {title:'① 今日を開いてください',body:'下の「今日」タブを実際にタップしてください。押せたら「できた」を押します。',target:'今日タブ'},
  {title:'② 今日のルートを確認',body:'今日のルート欄を見て、訪問順と移動時間を確認してください。',target:'今日のルート'},
  {title:'③ 予定カードを開く',body:'予定カードの「詳細」を実際にタップしてください。詳細欄が開いたら「できた」を押します。',target:'詳細'},
  {title:'④ 本日のメモを確認',body:'詳細欄の「本日のメモ」を確認してください。練習では入力しなくても大丈夫です。',target:'本日のメモ'},
  {title:'⑤ 次回登録を確認',body:'予定カードの「次回」ボタンの位置を確認してください。実際に押すと次回登録画面へ進みます。',target:'次回'},
  {title:'⑥ カレンダーを開く',body:'下の「予定」タブをタップし、カレンダーの日付を押すとその日のルートへ移動します。',target:'予定タブ'},
  {title:'⑦ 患者追加を確認',body:'施設ヘッダーの「患者追加」ボタンを確認してください。押すと検索モーダルが開きます。',target:'患者追加'},
  {title:'完了',body:'基本操作は完了です。ホームの「使い方」からいつでも再表示できます。',target:''}
];
const [showTutorial,setShowTutorial]=useState(false),[tutorialStep,setTutorialStep]=useState(0),[tutorialMinimized,setTutorialMinimized]=useState(false);
const guidedDemoSteps=[
  {title:'STEP1 今日を開く',body:'下の「今日」タブを押して、今日の訪問画面を開いてください。',target:'今日',tab:'today'},
  {title:'STEP2 ルート確認',body:'今日のルートで訪問順と移動時間を見ます。ルート1/2がある日は分かれて表示されます。',target:'今日のルート',tab:'today',scroll:'today-route'},
  {title:'STEP3 詳細を開く',body:'予定カードの「詳細」を押してください。電話・ナビ・メモ・予定編集が出ます。',target:'詳細',tab:'today'},
  {title:'STEP4 メモを見る',body:'詳細内の「本日のメモ」に、その日だけのメモを入力できます。今回は確認だけでOKです。',target:'本日のメモ',tab:'today'},
  {title:'STEP5 完了にする',body:'○ボタンを押すと患者ごとに完了になります。デモなので本番データは変わりません。',target:'○ 完了',tab:'today'},
  {title:'STEP6 次回登録',body:'「次回」を押すと、患者・施設・処置を引き継いで次回予定を作れます。',target:'次回',tab:'today'},
  {title:'STEP7 カレンダー',body:'下の「予定」を押して、日付をタップするとその日のルートへ自動で移動します。',target:'予定',tab:'calendar'},
  {title:'STEP8 患者追加',body:'施設ヘッダーの「患者追加」を押すと、患者検索モーダルが開きます。',target:'患者追加',tab:'today'},
  {title:'完了！',body:'お疲れさまでした。これで基本操作は完了です。',target:'訪問を開始する',tab:'today'}
];
function startGuidedDemo(){
  startDemoMode();
  setGuidedStep(0);
  setGuidedDemo(true);
  setMsg('操作練習デモを開始しました');
}
function stopGuidedDemo(){
  setGuidedDemo(false);
  setGuidedStep(0);
}
function moveGuidedTarget(stepIndex=guidedStep){
  const step=guidedDemoSteps[stepIndex];
  if(!step)return;
  if(step.tab)setTab(step.tab as Tab);
  if(step.scroll){
    setTimeout(()=>{
      const el=document.getElementById(step.scroll);
      if(el)el.scrollIntoView({behavior:'smooth',block:'start'});
    },180);
  }
}
function nextGuidedStep(){
  const next=Math.min(guidedStep+1,guidedDemoSteps.length-1);
  setGuidedStep(next);
  moveGuidedTarget(next);
}
function demoOpenFirstDetail(){
  setTab('today');
  setTimeout(()=>{
    const detail=document.querySelector('.compactDetails') as HTMLDetailsElement | null;
    if(detail){
      detail.open=true;
      detail.scrollIntoView({behavior:'smooth',block:'center'});
    }
  },180);
}
function demoCompleteFirstPatient(){
  setTab('today');
  setTimeout(()=>{
    const btn=document.querySelector('.circleDone') as HTMLButtonElement | null;
    if(btn)btn.click();
  },180);
}
function demoOpenCalendarRoute(){
  setTab('calendar');
  setTimeout(()=>{
    const el=document.getElementById('selected-date-route');
    if(el)el.scrollIntoView({behavior:'smooth',block:'start'});
  },180);
}
function demoOpenAddPatient(){
  setTab('today');
  setTimeout(()=>{
    const route=document.getElementById('today-route');
    if(route)route.scrollIntoView({behavior:'smooth',block:'start'});
    setTimeout(()=>{
      const buttons=Array.from(document.querySelectorAll('button')) as HTMLButtonElement[];
      const btn=buttons.find(b=>b.textContent?.includes('患者追加'));
      if(btn)btn.click();
      else setMsg('患者追加ボタンが見つかりません。施設ヘッダーまでスクロールしてください。');
    },220);
  },180);
}

useEffect(()=>{
  if(typeof window!=='undefined' && localStorage.getItem('frontier_tutorial_done')!=='1'){
    setShowTutorial(true);
  }
},[]);
function closeTutorial(done=true){
  setShowTutorial(false);
  setTutorialStep(0);
  if(done && typeof window!=='undefined')localStorage.setItem('frontier_tutorial_done','1');
}
function openTutorial(){
  setTutorialStep(0);
  setShowTutorial(true);
}
const [nextDraftInfo,setNextDraftInfo]=useState('');
const [patientForm,setPatientForm]=useState<Patient>(emptyPatient),[showPatientForm,setShowPatientForm]=useState(false),[patientSearch,setPatientSearch]=useState(''),[photoExtracting,setPhotoExtracting]=useState(false),[patientLocationType,setPatientLocationType]=useState<string>('facility');
const [facilityName,setFacilityName]=useState(''),[facilityAddress,setFacilityAddress]=useState(''),[facilityPhone,setFacilityPhone]=useState(''),[facilityFax,setFacilityFax]=useState(''),[facilityFaxType,setFacilityFaxType]=useState('monthly'),[facilityLat,setFacilityLat]=useState(''),[facilityLng,setFacilityLng]=useState(''),[editingFacilityId,setEditingFacilityId]=useState(''),[facilitySearch,setFacilitySearch]=useState('');
useEffect(()=>{
  if(typeof window!=='undefined'){
    const savedClinics=localStorage.getItem('frontier_clinics');
    const savedActiveClinic=localStorage.getItem('frontier_active_clinic_id');
    if(savedClinics){
      try{
        const parsed=JSON.parse(savedClinics);
        if(Array.isArray(parsed)&&parsed.length)setClinics(parsed);
      }catch{}
    }
    if(savedActiveClinic)setActiveClinicId(savedActiveClinic);
    const savedClinicPin=localStorage.getItem('frontier_clinic_portal_pin');
    if(savedClinicPin)setClinicPortalPin(savedClinicPin);
    const saved=localStorage.getItem('frontier_treatments');
    if(saved){
      try{
        const arr=JSON.parse(saved);
        if(Array.isArray(arr)&&arr.length)setTreatmentOptions(arr);
      }catch{}
    }
  }
  const savedPrices=localStorage.getItem('frontier_admin_prices');
    if(savedPrices){
      try{
        const obj=JSON.parse(savedPrices);
        setAdminUnitPrices({
          visit1:Number(obj.visit1||2500),
          visit2:Number(obj.visit2||3000),
          ope1:Number(obj.ope1||1500),
          ope2:Number(obj.ope2||2000)
        });
        setNewPatientInfoFeePrice(Number(obj.infoFee||1000));
      }catch{}
    }
    const savedFacilityTypes=localStorage.getItem('frontier_billing_facility_types');
    if(savedFacilityTypes){try{setBillingFacilityTypes(JSON.parse(savedFacilityTypes)||{});}catch{}}
    const savedPatientTypes=localStorage.getItem('frontier_billing_patient_types');
    if(savedPatientTypes){try{setBillingPatientTypes(JSON.parse(savedPatientTypes)||{});}catch{}}
    const savedInfoFeeEnabled=localStorage.getItem('frontier_new_patient_info_fee_enabled');
    if(savedInfoFeeEnabled){try{setNewPatientInfoFeeEnabled(JSON.parse(savedInfoFeeEnabled)||{});}catch{}}
  load();
  if(typeof window!=='undefined'){
    const path=window.location.pathname;
    if(path.includes('/route1'))setTab('route1');
    else if(path.includes('/route2'))setTab('route2');
    else if(path.includes('/today'))setTab('today');
    else if(path.includes('/tomorrow'))setTab('tomorrow');
    else if(path.includes('/calendar'))setTab('calendar');
    else if(path.includes('/clinic'))setTab('clinicPortal');
    else if(path.includes('/admin'))setTab('admin');
  }
},[]);
useEffect(()=>{load();},[activeClinicId]);
useEffect(()=>{if(clinicUnlocked && tab.startsWith('admin'))setTab('home'); if(clinicUnlocked && tab==='clinicPortal')setTab('home');},[clinicUnlocked,tab]);
function buildDemoData(){
  const today=new Date();
  const tomorrow=new Date();
  tomorrow.setDate(today.getDate()+1);
  const ymd=(d:Date)=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const iso=(d:Date,hm:string)=>`${ymd(d)}T${hm}:00+09:00`;

  const demoFacilities:Facility[]=[
    {id:'demo-f1',name:'デモ施設：ラ・ナシカ乙金',address:'福岡県大野城市乙金1-4-3',phone:'092-000-0001',latitude:33.5402,longitude:130.5021},
    {id:'demo-f2',name:'デモ施設：グランメゾン小笹',address:'福岡県福岡市中央区小笹',phone:'092-000-0002',latitude:33.5677,longitude:130.3867},
    {id:'demo-home',name:'居宅',address:'',phone:'',latitude:null,longitude:null}
  ] as Facility[];

  const demoPatients:Patient[]=[
    {id:'demo-p1',facility_id:'demo-f1',name:'吉武 澄子',kana:'ヨシタケ スミコ',room:'201',patient_address:'',key_person:'久保山様',key_person_address:'福岡県大野城市白木原1-13-14-2',relationship:'長女',phone:'090-0000-0001',care_manager:'山口様',care_manager_company:'',payment:'',visit_frequency:'毎週',call_before_visit:false,family_attendance:false,free_checkup:false,memo:'デモ患者です'},
    {id:'demo-p2',facility_id:'demo-f1',name:'芦塚 紀子',kana:'アシヅカ ノリコ',room:'202',patient_address:'',key_person:'芦塚様',key_person_address:'福岡県大野城市山田3-9-10-101',relationship:'弟',phone:'090-0000-0002',care_manager:'山口様',care_manager_company:'',payment:'',visit_frequency:'毎週',call_before_visit:false,family_attendance:false,free_checkup:false,memo:''},
    {id:'demo-p5',facility_id:'demo-f1',name:'宇都宮 静',kana:'ウツノミヤ シズカ',room:'203',patient_address:'',key_person:'中村様',key_person_address:'福岡市中央区荒戸3-2-16',relationship:'娘',phone:'090-0000-0005',care_manager:'山口様',care_manager_company:'',payment:'',visit_frequency:'月1',call_before_visit:false,family_attendance:false,free_checkup:false,memo:'追加練習用のデモ患者です'},
    {id:'demo-p3',facility_id:'demo-f2',name:'緒方 百合子',kana:'オガタ ユリコ',room:'305',patient_address:'',key_person:'中野様',key_person_address:'福岡市中央区赤坂3-4-22',relationship:'長女',phone:'090-0000-0003',care_manager:'塚本様',care_manager_company:'',payment:'',visit_frequency:'隔週',call_before_visit:false,family_attendance:false,free_checkup:false,memo:''},
    {id:'demo-p4',facility_id:'demo-home',name:'森 利由',kana:'モリ トシユキ',room:'',patient_address:'福岡市南区柳河内2丁目3-49',key_person:'森様',key_person_address:'福岡市南区大橋1丁目',relationship:'妻',phone:'090-0000-0004',care_manager:'',care_manager_company:'',care_manager_phone:'',payment:'',visit_frequency:'毎週',call_before_visit:false,family_attendance:false,free_checkup:false,memo:'居宅は患者住所優先'}
  ] as Patient[];

  const demoSchedules:Schedule[]=[
    {id:'demo-s0',facility_id:'demo-f1',patient_ids:['demo-p1'],patient_names:['吉武 澄子'],treatment:'口腔ケア',patient_treatments:{'demo-p1':'口腔ケア'},completed_patients:{},route_no:1,start_at:iso(new Date(today.getFullYear(),today.getMonth(),2),'10:30'),memo:'過去デモ',completed:false},
    {id:'demo-s1',facility_id:'demo-f1',patient_ids:['demo-p1','demo-p2'],patient_names:['吉武 澄子','芦塚 紀子'],treatment:'口腔ケア',patient_treatments:{'demo-p1':'口腔ケア','demo-p2':'義歯調整'},completed_patients:{},route_no:1,start_at:iso(today,'10:30'),memo:'施設到着後、受付へ声かけ',completed:false},
    {id:'demo-s2',facility_id:'demo-f2',patient_ids:['demo-p3'],patient_names:['緒方 百合子'],treatment:'義歯調整',patient_treatments:{'demo-p3':'義歯調整'},completed_patients:{},route_no:1,start_at:iso(today,'13:00'),memo:'',completed:false},
    {id:'demo-s3',facility_id:'demo-home',patient_ids:['demo-p4'],patient_names:['森 利由'],treatment:'口腔ケア',patient_treatments:{'demo-p4':'口腔ケア'},completed_patients:{},route_no:2,start_at:iso(today,'15:15'),memo:'訪問前電話',completed:false},
    {id:'demo-s4',facility_id:'demo-f1',patient_ids:['demo-p1'],patient_names:['吉武 澄子'],treatment:'口腔ケア',patient_treatments:{'demo-p1':'口腔ケア'},completed_patients:{},route_no:1,start_at:iso(tomorrow,'10:30'),memo:'明日のデモ',completed:false}
  ] as Schedule[];

  return {demoFacilities,demoPatients,demoSchedules};
}

function startDemoMode(){
  const d=buildDemoData();
  setDemoMode(true);
  setFacilities(d.demoFacilities);
  setPatients(d.demoPatients);
  setSchedules(d.demoSchedules);
  setFacilityId('demo-f1');
  setTab('today');
  setMsg('デモ画面を表示しました。練習用なので本番データは変更しません。');
  setTimeout(()=>{const el=document.getElementById('today-route');if(el)el.scrollIntoView({behavior:'smooth',block:'start'});},200);
}

async function exitDemoMode(){
  setGuidedDemo(false);
  setGuidedStep(0);
  setDemoMode(false);
  setMsg('デモを終了しました');
  await load();
  setTab('home');
}

async function load(targetClinicId?:string){
  const cid=targetClinicId || activeClinicId || 'aloha';

  let [fr,pr,sr]=await Promise.all([
    supabase.from('facilities').select('*').eq('clinic_id',cid).order('name'),
    supabase.from('patients').select('*').eq('clinic_id',cid).order('created_at',{ascending:false}),
    supabase.from('schedules').select('*').eq('clinic_id',cid).order('start_at',{ascending:true})
  ]);

  // clinic_id追加前のDBでも落ちないようにフォールバック
  if(fr.error && String(fr.error.message||'').includes('clinic_id')){
    [fr,pr,sr]=await Promise.all([
      supabase.from('facilities').select('*').order('name'),
      supabase.from('patients').select('*').order('created_at',{ascending:false}),
      supabase.from('schedules').select('*').order('start_at',{ascending:true})
    ]);
  }

  const belongs=(x:any)=>(x.clinic_id||'aloha')===cid;
  const fs=(fr.data||[]).filter(belongs) as Facility[];
  const ps=(pr.data||[]).filter(belongs) as Patient[];
  const ss=(sr.data||[]).filter(belongs) as Schedule[];

  setFacilities(fs);
  setPatients(ps);
  setSchedules(ss);
  setFacilityId(prev=>fs.some(f=>f.id===prev)?prev:(fs[0]?.id||''));
}
function activeClinic(){return clinics.find(c=>c.id===activeClinicId)||clinics[0]}
function activeClinicStartCoord(){
  const c=activeClinic();
  if(c?.startLat&&c?.startLng)return {lat:Number(c.startLat),lng:Number(c.startLng)};
  return null;
}
function activeClinicEndCoord(){
  const c=activeClinic();
  if(c?.endLat&&c?.endLng)return {lat:Number(c.endLat),lng:Number(c.endLng)};
  return activeClinicStartCoord();
}
function saveClinicsLocal(next:Clinic[], activeId=activeClinicId){
  setClinics(next);
  if(typeof window!=='undefined')localStorage.setItem('frontier_clinics',JSON.stringify(next));
  if(activeId){
    setActiveClinicId(activeId);
    if(typeof window!=='undefined')localStorage.setItem('frontier_active_clinic_id',activeId);
  }
}
function switchClinic(id:string){
  saveClinicsLocal(clinics,id);
  setFacilities([]);
  setPatients([]);
  setSchedules([]);
  setFacilityId('');
  setSelectedPatientIds([]);
  setSchedulePatientSearch('');
  load(id);
  const c=clinics.find(x=>x.id===id);
  setMsg(`${c?.name||'医院'} に切り替えました`);
}
function safeClinicId(name:string){
  return (name||'clinic').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'') || `clinic-${Date.now()}`;
}
function getFacility(id?:string){return facilities.find(f=>f.id===id && (f.clinic_id||'aloha')===activeClinicId)} function getPatient(id?:string){return patients.find(p=>p.id===id && (p.clinic_id||'aloha')===activeClinicId)}
const timeOptions=Array.from({length:57},(_,i)=>{
  const total=7*60+i*15;
  const h=String(Math.floor(total/60)).padStart(2,'0');
  const m=String(total%60).padStart(2,'0');
  return `${h}:${m}`;
});
function localYmdValue(d=new Date()){
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function scheduleDatePart(){return startAt?startAt.slice(0,10):localYmdValue()}
function scheduleTimePart(){
  const t=startAt?startAt.slice(11,16):'10:00';
  return timeOptions.includes(t)?t:'10:00';
}
function setScheduleDatePart(date:string){
  const t=scheduleTimePart();
  setStartAt(`${date}T${t}`);
}
function setScheduleTimePart(t:string){
  const d=scheduleDatePart();
  setStartAt(`${d}T${t}`);
}
function moveScheduleTime(minutes:number){
  const base=startAt?new Date(startAt):new Date(`${localYmdValue()}T10:00`);
  base.setMinutes(base.getMinutes()+minutes);
  const h=String(base.getHours()).padStart(2,'0');
  const m=String(Math.round(base.getMinutes()/15)*15).padStart(2,'0');
  const rounded=`${h}:${m==='60'?'00':m}`;
  setStartAt(`${localYmdValue(base)}T${timeOptions.includes(rounded)?rounded:'10:00'}`);
}

function fmt(dt:string){return new Date(dt).toLocaleString('ja-JP',{timeZone:'Asia/Tokyo',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'})} function dateOnly(dt:string){return new Date(dt).toLocaleDateString('ja-JP',{timeZone:'Asia/Tokyo',month:'2-digit',day:'2-digit'})} function time(dt:string){return new Date(dt).toLocaleTimeString('ja-JP',{timeZone:'Asia/Tokyo',hour:'2-digit',minute:'2-digit'})}
function callPhone(phone?:string){if(phone)window.location.href=`tel:${phone.replace(/-/g,'')}`} function openMap(address?:string,name?:string){const q=encodeURIComponent(address||name||'');if(q)window.open(`https://www.google.com/maps/search/?api=1&query=${q}`,'_blank')}
const clinicFilteredSchedules=useMemo(()=>schedules.filter(s=>(s.clinic_id||'aloha')===activeClinicId),[schedules,activeClinicId]);
const sortedSchedules=useMemo(()=>[...clinicFilteredSchedules].sort((a,b)=>new Date(a.start_at).getTime()-new Date(b.start_at).getTime()),[clinicFilteredSchedules]);
function isSameYmd(a:Date,b:Date){return a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()&&a.getDate()===b.getDate()}
const todaySchedules=useMemo(()=>{const t=new Date();return sortedSchedules.filter(s=>isSameYmd(new Date(s.start_at),t))},[sortedSchedules]);
const tomorrowSchedules=useMemo(()=>{const t=new Date();t.setDate(t.getDate()+1);return sortedSchedules.filter(s=>isSameYmd(new Date(s.start_at),t))},[sortedSchedules]);
function cardCount(list:Schedule[]){
  return list.reduce((sum,s)=>sum+schedulePatientCount(s),0);
}
const todayCardCount=cardCount(todaySchedules);
const tomorrowCardCount=cardCount(tomorrowSchedules);
const completed=todaySchedules.reduce((sum,s)=>sum+scheduleCompletedCount(s),0), remaining=todayCardCount-completed;

function ymdFromDate(d:Date){
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function monthRangeFromYmd(ymd:string){
  const [y,m]=ymd.split('-').map(Number);
  return {start:`${y}-${String(m).padStart(2,'0')}-01`, prefix:`${y}-${String(m).padStart(2,'0')}`};
}
function weekRangeFromYmd(ymd:string){
  const d=new Date(ymd+'T00:00:00');
  const day=d.getDay();
  const start=new Date(d);
  start.setDate(d.getDate()-day);
  const end=new Date(start);
  end.setDate(start.getDate()+6);
  return {start:ymdFromDate(start),end:ymdFromDate(end)};
}
function isPatientScheduledInSchedule(s:Schedule,p:Patient){
  return (s.patient_ids||[]).includes(p.id)||(s.patient_names||[]).includes(p.name);
}
function isScheduleCountableForPatient(s:Schedule,p:Patient){
  const names=s.patient_names&&s.patient_names.length?s.patient_names:[''];
  const idxById=(s.patient_ids||[]).findIndex(id=>id===p.id);
  const idx=idxById>=0?idxById:names.findIndex(n=>n===p.name);
  if(idx<0)return false;
  const name=names[idx]||p.name;
  return !isPatientCanceled(s,name,idx)&&isCountTarget(s,name,idx);
}
function patientMonthCount(p:Patient,ymd=scheduleDatePart()){
  const prefix=monthRangeFromYmd(ymd).prefix;
  return schedules.filter(s=>String(s.start_at||'').startsWith(prefix)&&isPatientScheduledInSchedule(s,p)&&isScheduleCountableForPatient(s,p)).length;
}
function patientWeekCount(p:Patient,ymd=scheduleDatePart()){
  const range=weekRangeFromYmd(ymd);
  return schedules.filter(s=>{
    const day=String(s.start_at||'').slice(0,10);
    return day>=range.start&&day<=range.end&&isPatientScheduledInSchedule(s,p)&&isScheduleCountableForPatient(s,p);
  }).length;
}
function targetMonthlyCount(p:Patient){
  const f=p.visit_frequency||'';
  if(f==='毎週')return 4;
  if(f==='隔週'||f==='月2')return 2;
  if(f==='月1')return 1;
  return 0;
}
function priorityPatientsByScheduleNeed(list:Patient[]){
  return [...list].sort((a,b)=>{
    const aw=patientWeekCount(a), bw=patientWeekCount(b);
    if(aw===0 && bw>0)return -1;
    if(bw===0 && aw>0)return 1;
    const at=targetMonthlyCount(a), bt=targetMonthlyCount(b);
    const an=at?patientMonthCount(a)/at:999;
    const bn=bt?patientMonthCount(b)/bt:999;
    if(an!==bn)return an-bn;
    return (a.kana||a.name||'').localeCompare(b.kana||b.name||'','ja');
  });
}
function patientScheduleStatusLabel(p:Patient){
  const m=patientMonthCount(p);
  const w=patientWeekCount(p);
  const target=targetMonthlyCount(p);
  const targetText=target?` / 目安${target}回`:'';
  return `今月${m}回${targetText}・今週${w}回`;
}
function missedSchedulePatientsForMonth(ymd=scheduleDatePart()){
  return patients.filter(p=>{
    const target=targetMonthlyCount(p);
    if(!target)return false;
    return patientMonthCount(p,ymd)<target;
  }).sort((a,b)=>patientMonthCount(a,ymd)-patientMonthCount(b,ymd));
}

function lastScheduleForPatient(p:Patient){
  return history(p).filter(s=>new Date(s.start_at)<=new Date()).sort((a,b)=>new Date(b.start_at).getTime()-new Date(a.start_at).getTime())[0];
}
function daysSinceLastVisit(p:Patient){
  const last=lastScheduleForPatient(p);
  if(!last)return null;
  return Math.floor((Date.now()-new Date(last.start_at).getTime())/(1000*60*60*24));
}
function aiScheduleRiskLevel(p:Patient,ymd=scheduleDatePart()){
  const target=targetMonthlyCount(p);
  const month=patientMonthCount(p,ymd);
  const week=patientWeekCount(p,ymd);
  const days=daysSinceLastVisit(p);
  if(!target)return '確認';
  if(month===0 && target>=2)return '高';
  if(month<target && week===0)return '高';
  if(month<target)return '中';
  if(days!==null && days>28 && target>=2)return '中';
  return '低';
}
function aiScheduleReason(p:Patient,ymd=scheduleDatePart()){
  const target=targetMonthlyCount(p);
  const month=patientMonthCount(p,ymd);
  const week=patientWeekCount(p,ymd);
  const days=daysSinceLastVisit(p);
  const parts:string[]=[];
  if(target)parts.push(`今月${month}/${target}回`);
  else parts.push('訪問頻度未設定');
  parts.push(`今週${week}回`);
  if(days===null)parts.push('過去訪問なし');
  else parts.push(`前回から${days}日`);
  if(target && month<target)parts.push('予定追加候補');
  if(week===0)parts.push('今週未予定');
  return parts.join(' / ');
}

function aiScheduleCreateCandidates(){
  const ymd=scheduleDatePart();
  const base=(String(scheduleLocationType)==='home'
    ? patients.filter(p=>!p.facility_id)
    : patients.filter(p=>p.facility_id===facilityId));
  return base
    .filter(p=>!selectedPatientIds.includes(p.id))
    .map(p=>{
      const target=targetMonthlyCount(p);
      const month=patientMonthCount(p,ymd);
      const week=patientWeekCount(p,ymd);
      const days=daysSinceLastVisit(p);
      const score=(week===0?100:0)+(target&&month<target?80:0)+(days?Math.min(days,45):20);
      const reason=[
        week===0?'今週未予定':'今週予定あり',
        target?`今月${month}/${target}回`:`頻度未設定`,
        days===null?'過去訪問なし':`前回から${days}日`
      ].join(' / ');
      return {p,score,reason,month,week,target,days};
    })
    .sort((a,b)=>b.score-a.score);
}
function aiApplyTopSchedulePatients(limit=3){
  const candidates=aiScheduleCreateCandidates().filter(x=>x.week===0 || (x.target>0 && x.month<x.target));
  if(candidates.length===0){
    setMsg('AI候補はありません。頻度や今月回数は足りています。');
    return;
  }
  const ids=candidates.slice(0,limit).map(x=>x.p.id);
  setSelectedPatientIds(prev=>Array.from(new Set([...prev,...ids])));
  setMsg(`AI候補 ${ids.length}名を選択しました`);
}
function aiSuggestScheduleTime(){
  const ymd=scheduleDatePart();
  const sameDay=sortedSchedules.filter(s=>String(s.start_at||'').slice(0,10)===ymd && (s.route_no||1)===routeNo)
    .sort((a,b)=>new Date(a.start_at).getTime()-new Date(b.start_at).getTime());
  if(sameDay.length===0){
    setScheduleTimePart(routeNo===1?'10:00':'13:00');
    setMsg('AIが空き時間を提案しました');
    return;
  }
  const last=sameDay[sameDay.length-1];
  const d=new Date(last.start_at);
  d.setMinutes(d.getMinutes()+treatmentMinutesForSchedule(last)+15);
  const hhmm=`${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  setScheduleTimePart(hhmm);
  setMsg(`AIが ${hhmm} を提案しました`);
}
function aiScheduleCreateReason(){
  const c=aiScheduleCreateCandidates().slice(0,5);
  if(c.length===0)return '施設・区分を選ぶとAI候補を表示します。';
  return c.map((x,i)=>`${i+1}. ${x.p.name}：${x.reason}`).join('\n');
}

function aiScheduleSuggestions(ymd=scheduleDatePart()){
  return patients
    .filter(p=>targetMonthlyCount(p)>0)
    .map(p=>({p,level:aiScheduleRiskLevel(p,ymd),reason:aiScheduleReason(p,ymd),target:targetMonthlyCount(p),month:patientMonthCount(p,ymd),week:patientWeekCount(p,ymd),days:daysSinceLastVisit(p)}))
    .filter(x=>x.level!=='低')
    .sort((a,b)=>{
      const rank=(v:string)=>v==='高'?0:v==='中'?1:2;
      const r=rank(a.level)-rank(b.level);
      if(r!==0)return r;
      return (a.month/a.target)-(b.month/b.target);
    });
}
function patientMemoItems(p:Patient){
  const hist=history(p).slice(-12).reverse();
  const items:string[]=[];
  if(p.medical_history)items.push(`既往症：${p.medical_history}`);
  if(p.memo)items.push(`基本メモ：${p.memo}`);
  hist.forEach(s=>{
    const names=s.patient_names&&s.patient_names.length?s.patient_names:[''];
    const idxById=(s.patient_ids||[]).findIndex(id=>id===p.id);
    const idx=idxById>=0?idxById:names.findIndex(n=>n===p.name);
    const name=names[idx]||p.name;
    const key=patientKeyFor(s,name,Math.max(idx,0));
    const memo=s.patient_memos?.[key] || s.memo || '';
    const treatment=idx>=0?treatmentFor(s,name,idx):s.treatment;
    if(memo || treatment)items.push(`${dateOnly(s.start_at)} ${treatment||''} ${memo||''}`.trim());
  });
  return items;
}
function aiPatientSummary(p:Patient){
  const items=patientMemoItems(p);
  const text=items.join(' / ');
  const lower=text.toLowerCase();
  const attention:string[]=[];
  const denture:string[]=[];
  const next:string[]=[];
  const general:string[]=[];
  if(p.medical_history)attention.push(`既往症：${p.medical_history}`);
  if(/痛|疼痛|痛み|潰瘍|傷|出血|腫|発赤/.test(text))attention.push('疼痛・粘膜症状の記載あり。次回確認が必要です。');
  if(/義歯|入れ歯|デンチャ|denture|bite|印象|セット|tf/i.test(text))denture.push('義歯関連の対応履歴あり。適合・疼痛・安定性を確認してください。');
  if(/嚥下|むせ|咳|食事|舌圧|パタカラ|摂食/.test(text))attention.push('嚥下・食事関連の記載あり。食形態やむせを確認してください。');
  if(/次回|予定|調整|確認|再診|セット|印象|修理/.test(text))next.push('前回メモに次回対応につながる記載があります。');
  if(p.care_manager)general.push(`ケアマネ：${p.care_manager}${p.care_manager_company?`（${p.care_manager_company}）`:''}`);
  if(p.visit_frequency)general.push(`訪問頻度：${p.visit_frequency}`);
  if(items.length===0)general.push('メモ・履歴が少ないため要約できる情報が不足しています。');
  return {
    attention:attention.length?attention:['特記リスクはメモ上確認できません。'],
    denture:denture.length?denture:['義歯関連の重要メモは確認できません。'],
    next:next.length?next:['次回対応は通常確認です。'],
    general
  };
}

const facilityPatients=useMemo(()=>String(scheduleLocationType)==='home'?patients.filter(p=>!p.facility_id):patients.filter(p=>p.facility_id===facilityId),[patients,facilityId,scheduleLocationType]);
const filteredFacilityPatients=useMemo(()=>{
  const q=schedulePatientSearch.trim().toLowerCase();
  const base=!q?facilityPatients:facilityPatients.filter(p=>{
    const f=getFacility(p.facility_id)?.name||'';
    return [p.name,p.kana,p.room,p.patient_address,p.phone,f].some(v=>(v||'').toLowerCase().includes(q));
  });
  return priorityPatientsByScheduleNeed(base);
},[facilityPatients,schedulePatientSearch,facilities,schedules,startAt]);
function scheduleMatchesPatient(s:Schedule,p:Patient){return !!(s.patient_ids?.includes(p.id)||s.patient_names?.includes(p.name))}
function monthCount(p:Patient){
  const n=new Date();
  return schedules.filter(s=>{
    const d=new Date(s.start_at);
    if(!scheduleMatchesPatient(s,p))return false;
    if(d.getFullYear()!==n.getFullYear()||d.getMonth()!==n.getMonth())return false;
    const names=s.patient_names&&s.patient_names.length?s.patient_names:[''];
    const index=names.findIndex((name,i)=>(s.patient_ids?.[i]||name)===p.id || name===p.name);
    return index>=0 ? isCountTarget(s,names[index],index) : false;
  }).length;
}
function history(p:Patient){return sortedSchedules.filter(s=>scheduleMatchesPatient(s,p))} function nextSchedule(p:Patient){const now=new Date();return history(p).find(s=>new Date(s.start_at)>=now)}
const clinicFilteredPatients=useMemo(()=>patients.filter(p=>(p.clinic_id||'aloha')===activeClinicId),[patients,activeClinicId]);
const filteredPatients=useMemo(()=>{const q=patientSearch.toLowerCase();const list=clinicFilteredPatients.filter(p=>{const f=getFacility(p.facility_id)?.name||'';return ((p.name||'')+(p.kana||'')+f+(p.room||'')+(p.key_person||'')+(p.phone||'')+(p.care_manager||'')+(p.patient_address||'')+(p.key_person_address||'')+(p.memo||'')).toLowerCase().includes(q)});return sortedPatientsNewestFirst(list)},[patientSearch,clinicFilteredPatients,facilities]);
const clinicFilteredFacilities=useMemo(()=>facilities.filter(f=>(f.clinic_id||'aloha')===activeClinicId),[facilities,activeClinicId]);
const filteredFacilities=useMemo(()=>{const q=facilitySearch.toLowerCase();return clinicFilteredFacilities.filter(f=>(f.name+(f.address||'')+(f.phone||'')).toLowerCase().includes(q))},[facilitySearch,clinicFilteredFacilities]);
function patientKeyFor(s:Schedule,name:string,index:number){
  return s.patient_ids?.[index] || name;
}
function treatmentFor(s:Schedule,name:string,index:number){
  return s.patient_treatments?.[patientKeyFor(s,name,index)] || s.treatment || '';
}
async function updatePatientTreatment(s:Schedule,name:string,index:number,value:string){
  const key=patientKeyFor(s,name,index);
  if(demoMode){
    setSchedules(prev=>prev.map(x=>x.id===s.id?{...x,patient_treatments:{...(x.patient_treatments||{}),[key]:value}}:x));
    setMsg(`${name} の診療内容を更新しました（デモ）`);
    return;
  }
  const next={...(s.patient_treatments||{}),[key]:value};
  const {error}=await supabase.from('schedules').update({patient_treatments:next}).eq('id',s.id);
  if(error)return setMsg('エラー：'+error.message);
  await load();
  setMsg(`${name} の診療内容を更新しました`);
}
function memoFor(s:Schedule,name:string,index:number){
  return s.patient_memos?.[patientKeyFor(s,name,index)] || '';
}

async function updatePatientMemo(s:Schedule,name:string,index:number,value:string){
  const key=patientKeyFor(s,name,index);
  if(demoMode){
    setSchedules(prev=>prev.map(x=>x.id===s.id?{...x,patient_memos:{...(x.patient_memos||{}),[key]:value}}:x));
    setMsg(`${name} の本日のメモを保存しました（デモ）`);
    return;
  }
  const next={...(s.patient_memos||{}),[key]:value};
  const {error}=await supabase.from('schedules').update({patient_memos:next}).eq('id',s.id);
  if(error)return setMsg('エラー：'+error.message);
  await load();
  setMsg(`${name} の本日のメモを保存しました`);
}

function startAddPatientToSchedule(s:Schedule){
  setAddingScheduleId(s.id);
  setAddPatientModalSchedule(s);
  setAddPatientSearch('');
  setAddPatientIds([]);
}

async function addSelectedPatientsToSchedule(s:Schedule){
  if(addPatientIds.length===0){
    setMsg('追加する患者を選択してください');
    return;
  }
  const addPatients=patients.filter(p=>addPatientIds.includes(p.id));
  const nextPatientIds=[...(s.patient_ids||[])];
  const nextPatientNames=[...(s.patient_names||[])];
  const nextTreatments={...(s.patient_treatments||{})};
  const nextCompleted={...(s.completed_patients||{})};
  const nextCanceled={...(s.canceled_patients||{})};
  const nextCancelReasons={...(s.cancel_reasons||{})};
  addPatients.forEach(p=>{
    if(nextPatientIds.includes(p.id) || nextPatientNames.includes(p.name))return;
    nextPatientIds.push(p.id);
    nextPatientNames.push(p.name);
    nextTreatments[p.id]=s.treatment||treatmentOptions[0];
    nextCompleted[p.id]=false;
    nextCanceled[p.id]=false;
  });

  if(demoMode){
    setSchedules(prev=>prev.map(x=>x.id===s.id?{
      ...x,
      patient_ids:nextPatientIds,
      patient_names:nextPatientNames,
      patient_treatments:nextTreatments,
      completed_patients:nextCompleted,
      canceled_patients:nextCanceled,
      cancel_reasons:nextCancelReasons,
      completed:false
    }:x));
    setAddingScheduleId('');
    setAddPatientModalSchedule(null);
    setAddPatientSearch('');
    setAddPatientIds([]);
    setMsg(`${addPatients.length}名を予定に追加しました（デモ）`);
    return;
  }

  const {error}=await supabase.from('schedules').update({
    patient_ids:nextPatientIds,
    patient_names:nextPatientNames,
    patient_treatments:nextTreatments,
    completed_patients:nextCompleted,
    canceled_patients:nextCanceled,
    cancel_reasons:nextCancelReasons,
    completed:false,
    completed_at:null
  }).eq('id',s.id);
  if(error)return setMsg('エラー：'+error.message);
  setAddingScheduleId('');
  setAddPatientModalSchedule(null);
  setAddPatientSearch('');
  setAddPatientIds([]);
  await load();
  setMsg(`${addPatients.length}名を予定に追加しました`);
}

async function removePatientFromSchedule(s:Schedule,name:string,index:number){
  if(!confirm(`${name} さんをこの予定から外しますか？\n予定全体は削除されません。`))return;
  const removeId=s.patient_ids?.[index];
  const nextPatientIds=(s.patient_ids||[]).filter((_,i)=>i!==index);
  const nextPatientNames=(s.patient_names||[]).filter((_,i)=>i!==index);
  const nextTreatments={...(s.patient_treatments||{})};
  const nextCompleted={...(s.completed_patients||{})};
  const nextMemos={...(s.patient_memos||{})};
  const nextCanceled={...(s.canceled_patients||{})};
  const nextCancelReasons={...(s.cancel_reasons||{})};
  const key=removeId || name;
  delete nextTreatments[key];
  delete nextCompleted[key];
  delete nextMemos[key];
  delete nextCanceled[key];
  delete nextCancelReasons[key];
  if(nextPatientNames.length===0){
    const {error}=await supabase.from('schedules').delete().eq('id',s.id);
    if(error)return setMsg('エラー：'+error.message);
    await load();
    setMsg('最後の患者を外したため予定を削除しました');
    return;
  }
  const allDone=nextPatientNames.every((n,i)=>!!nextCompleted[nextPatientIds[i]||n]);
  const {error}=await supabase.from('schedules').update({
    patient_ids:nextPatientIds,
    patient_names:nextPatientNames,
    patient_treatments:nextTreatments,
    completed_patients:nextCompleted,
    patient_memos:nextMemos,
    canceled_patients:nextCanceled,
    cancel_reasons:nextCancelReasons,
    completed:allDone,
    completed_at:allDone?new Date().toISOString():null
  }).eq('id',s.id);
  if(error)return setMsg('エラー：'+error.message);
  await load();
  setMsg(`${name} さんをこの予定から外しました`);
}

function patientNamesFromIds(ids:string[]){return ids.map(id=>getPatient(id)?.name).filter(Boolean) as string[]}
function newPatient(){setPatientLocationType('facility');setPatientForm({...emptyPatient,facility_id:facilities[0]?.id||''});setShowPatientForm(true);setTab('patients')} function openPatient(p:Patient){setPatientLocationType(p.facility_id?'facility':'home');setPatientForm({...emptyPatient,...p});setShowPatientForm(true);setTab('patients');setTimeout(()=>scrollTo({top:0,behavior:'smooth'}),50)}
function setPatientField(k:keyof Patient,v:any){setPatientForm(p=>({...p,[k]:v}))}
function mergePatientExtract(data:any){
  const next:any={...patientForm};
  const map:Record<string,keyof Patient>={
    patient_name:'name',
    name:'name',
    kana:'kana',
    facility_name:'facility_id',
    room:'room',
    patient_address:'patient_address',
    key_person:'key_person',
    key_person_relationship:'relationship',
    relationship:'relationship',
    key_person_phone:'phone',
    phone:'phone',
    care_manager:'care_manager',
    care_manager_company:'care_manager_company',
    care_manager_phone:'care_manager_phone',
    memo:'memo'
  };

  Object.entries(map).forEach(([k,target])=>{
    const v=data?.[k];
    if(v && typeof v==='string'){
      if(target==='facility_id'){
        const found=facilities.find(f=>f.name.includes(v) || v.includes(f.name));
        if(found)next.facility_id=found.id;
      }else{
        next[target]=v;
      }
    }
  });

  if(data?.facility_name && !next.facility_id){
    setMsg(`施設「${data.facility_name}」は未登録です。施設を選択してください。`);
  }else{
    setMsg('写真から読み取った内容をフォームへ反映しました。確認してから保存してください。');
  }
  setPatientForm(next as Patient);
}

async function fileToDataUrl(file:File){
  return new Promise<string>((resolve,reject)=>{
    const reader=new FileReader();
    reader.onload=()=>resolve(String(reader.result));
    reader.onerror=()=>reject(reader.error);
    reader.readAsDataURL(file);
  });
}


function loadPdfJs():Promise<any>{
  return new Promise((resolve,reject)=>{
    const w:any=window as any;
    if(w.pdfjsLib){
      resolve(w.pdfjsLib);
      return;
    }
    const script=document.createElement('script');
    script.src='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    script.onload=()=>{
      const lib=(window as any).pdfjsLib;
      if(!lib){
        reject(new Error('PDFライブラリを読み込めませんでした'));
        return;
      }
      lib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      resolve(lib);
    };
    script.onerror=()=>reject(new Error('PDFライブラリを読み込めませんでした'));
    document.head.appendChild(script);
  });
}

async function pdfFileToImages(file:File){
  const pdfjs=await loadPdfJs();
  const buffer=await file.arrayBuffer();
  const pdf=await pdfjs.getDocument({data:buffer}).promise;
  const images:string[]=[];
  const maxPages=Math.min(pdf.numPages,4);

  for(let pageNo=1; pageNo<=maxPages; pageNo++){
    const page=await pdf.getPage(pageNo);
    const viewport=page.getViewport({scale:1.6});
    const canvas=document.createElement('canvas');
    const ctx=canvas.getContext('2d');
    if(!ctx)continue;
    canvas.width=Math.floor(viewport.width);
    canvas.height=Math.floor(viewport.height);
    await page.render({canvasContext:ctx,viewport}).promise;
    images.push(canvas.toDataURL('image/jpeg',0.88));
  }

  return images;
}

async function extractPatientFromFile(file:File,sourceType:'camera'|'image'|'pdf'='image'){
  setPhotoExtracting(true);
  const isPdf=file.type.includes('pdf') || file.name.toLowerCase().endsWith('.pdf') || sourceType==='pdf';
  const label=isPdf?'PDF':sourceType==='camera'?'写真':'画像';
  setMsg(`${label}を読み取り中です...`);

  try{
    let body:any={
      fileName:file.name,
      mimeType:file.type,
      sourceType
    };

    if(isPdf){
      setMsg('PDFを画像に変換中です...');
      const images=await pdfFileToImages(file);
      if(images.length===0)throw new Error('PDFを画像化できませんでした');
      body.images=images;
      body.convertedFromPdf=true;
      setMsg(`PDF ${images.length}ページを読み取り中です...`);
    }else{
      const dataUrl=await fileToDataUrl(file);
      body.image=dataUrl;
    }

    const res=await fetch('/api/extract-patient-from-image',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify(body)
    });

    const json=await res.json();
    if(!res.ok)throw new Error(json.error||'読み取りに失敗しました');
    mergePatientExtract(json);
  }catch(e:any){
    setMsg(`${label}読み取りエラー：`+(e?.message||e));
  }finally{
    setPhotoExtracting(false);
  }
}

function extractPatientFromImage(file:File){
  return extractPatientFromFile(file,'image');
}

async function geocodePatientAddress(){
  const facility=getFacility(patientForm.facility_id);
  const home=isHomeFacility(facility);
  const address=(home
    ? (patientForm.patient_address || patientForm.key_person_address || facility?.address || '')
    : (facility?.address || patientForm.patient_address || patientForm.key_person_address || '')
  ).trim();

  if(!address){
    setMsg('患者住所または施設住所を入力してください');
    return null;
  }

  const loc=await geocodeAddress(address);
  if(!loc)return null;
  setPatientForm({...patientForm,patient_latitude:loc.lat,patient_longitude:loc.lng});
  setMsg(home ? (patientForm.patient_address?'患者住所から座標を取得しました':'患者住所が空のためキーパーソン住所から座標を取得しました') : '施設住所から座標を取得しました');
  return loc;
}

function removePatientSchemaFields(payload:any, message?:string){
  const p={...payload};
  const text=message||'';
  if(text.includes('care_manager_phone'))delete p.care_manager_phone;
  if(text.includes('care_manager_company'))delete p.care_manager_company;
  if(text.includes('medical_history'))delete p.medical_history;
  if(text.includes('clinic_id'))delete p.clinic_id;
  return p;
}

async function updatePatientSafely(id:string,payload:any){
  let res=await supabase.from('patients').update(payload).eq('id',id).select('*').single();
  if(res.error && String(res.error.message||'').includes('schema cache')){
    const safePayload=removePatientSchemaFields(payload,res.error.message);
    res=await supabase.from('patients').update(safePayload).eq('id',id).select('*').single();
  }
  return res;
}

async function insertPatientSafely(payload:any){
  let res=await supabase.from('patients').insert(payload).select('*').single();
  if(res.error && String(res.error.message||'').includes('schema cache')){
    const safePayload=removePatientSchemaFields(payload,res.error.message);
    res=await supabase.from('patients').insert(safePayload).select('*').single();
  }
  return res;
}

async function savePatient(){
  if(!patientForm.name.trim())return setMsg('患者名を入力してください');

  let pLat=patientForm.patient_latitude||null;
  let pLng=patientForm.patient_longitude||null;

  if(patientForm.patient_address||patientForm.key_person_address){
    const geo=await geocodePatientAddress();
    if(geo){pLat=geo.lat;pLng=geo.lng;}
  }

  const payload={
    clinic_id:activeClinicId,
    facility_id:String(patientLocationType)==='facility' ? (patientForm.facility_id||null) : null,
    name:patientForm.name.trim(),
    kana:patientForm.kana||'',
    room:patientForm.room||'',
    patient_address:patientForm.patient_address||'',
    patient_latitude:pLat,
    patient_longitude:pLng,
    key_person:patientForm.key_person||'',
    key_person_address:patientForm.key_person_address||'',
    relationship:patientForm.relationship||'',
    phone:patientForm.phone||'',
    care_manager:patientForm.care_manager||'',
    care_manager_company:patientForm.care_manager_company||'',
    care_manager_phone:patientForm.care_manager_phone||'',
    payment:patientForm.payment||'',
    visit_frequency:patientForm.visit_frequency||'',
    call_before_visit:!!patientForm.call_before_visit,
    family_attendance:!!patientForm.family_attendance,
    free_checkup:!!patientForm.free_checkup,
    medical_history:patientForm.medical_history||'',
    memo:patientForm.memo||''
  };

  if(demoMode){
    const updated={...patientForm,...payload,id:patientForm.id||`demo-p-${Date.now()}`} as Patient;
    setPatients(prev=>patientForm.id?prev.map(p=>p.id===patientForm.id?updated:p):[...prev,updated]);
    setPatientForm(updated);
    setShowPatientForm(true);
    setMsg(patientForm.id?'患者情報を更新しました（デモ）':'患者を登録しました（デモ）');
    return;
  }

  if(patientForm.id){
    const {data,error}=await updatePatientSafely(patientForm.id,payload);
    if(error)return setMsg('エラー：'+error.message);
    const updated=(data||{...patientForm,...payload}) as Patient;
    setPatients(prev=>prev.map(p=>p.id===patientForm.id?updated:p));
    setPatientForm(updated);
    await load();
    setShowPatientForm(true);
    setMsg('患者情報を更新しました');
    return;
  }

  const {data,error}=await insertPatientSafely(payload);
  if(error)return setMsg('エラー：'+error.message);
  const created=data as Patient;
  setPatients(prev=>[...prev,created]);
  setPatientForm(created);
  await load();
  setShowPatientForm(true);
  setMsg('患者を登録しました');
}
async function deletePatient(id:string){if(!confirm('患者を削除しますか？'))return;const {error}=await supabase.from('patients').delete().eq('id',id);if(error)return setMsg('エラー：'+error.message);await load();setShowPatientForm(false)}
function editSchedule(s:Schedule,from:Tab='today'){
  setNextDraftInfo('');
  setReturnTab(from);
  setEditingScheduleId(s.id);
  setScheduleLocationType(s.facility_id?'facility':'home');setScheduleLocationType(s.facility_id?'facility':'home');setFacilityId(s.facility_id||'');
  setSelectedPatientIds(s.patient_ids||[]);
  setManualPatients(s.patient_ids?.length?'':(s.patient_names?.join('、')||''));
  setTreatment(s.treatment||treatmentOptions[0]);
  const d=new Date(s.start_at);
  setStartAt(new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16));
  setScheduleMemo(s.memo||'');
  setRouteNo(s.route_no||1);
  setTab('calendar');
  scrollToScheduleForm();
}
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
  setRouteNo(s.route_no||1);

  const ps=(s.patient_ids||[]).map(id=>getPatient(id)).filter(Boolean) as Patient[];
  const targetPatient=ps[displayIndex] || ps.find(p=>p.name===displayName) || patients.find(p=>p.name===displayName);
  const selectedIds=targetPatient ? [targetPatient.id] : (s.patient_ids||[]);
  const manualName=targetPatient ? '' : (displayName || (s.patient_ids?.length ? '' : (s.patient_names?.join('、')||'')));

  // 居宅患者の次回登録で、区分が施設・既定施設（例：オリーブ）に戻らないようにする。
  // 患者にfacility_idが無ければ必ず「居宅」、施設患者ならその患者の施設を優先。
  const nextLocationType=targetPatient ? (targetPatient.facility_id?'facility':'home') : (s.facility_id?'facility':'home');
  setScheduleLocationType(nextLocationType);
  setFacilityId(nextLocationType==='facility' ? (targetPatient?.facility_id || s.facility_id || '') : '');

  setSelectedPatientIds(selectedIds);
  setManualPatients(manualName);
  setSchedulePatientSearch(targetPatient?.name || '');

  const selectedTreatment=displayName ? treatmentFor(s,displayName,displayIndex) : (s.treatment||treatmentOptions[0]);
  setTreatment(selectedTreatment || treatmentOptions[0]);

  const frequency=targetPatient?.visit_frequency || ps[0]?.visit_frequency || '';
  const next=getNextDateByFrequency(new Date(s.start_at),frequency);

  setStartAt(new Date(next.getTime()-next.getTimezoneOffset()*60000).toISOString().slice(0,16));
  setScheduleMemo('');
  const locationLabel=nextLocationType==='home'?'居宅':(getFacility(targetPatient?.facility_id || s.facility_id)?.name || '');
  setNextDraftInfo(`${displayName || s.patient_names?.join('、')} / ${locationLabel} / 初期日付：訪問頻度から自動計算`);
  setTab('next');
  scrollToScheduleForm();
  setMsg('次回登録ページを開きました。居宅/施設区分を引き継ぎました');
}

function adjustNextDraftDays(days:number){
  if(!startAt)return;
  const d=new Date(startAt);
  d.setDate(d.getDate()+days);
  setStartAt(new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16));
}


function saveTreatmentOptions(next:string[]){
  const clean=Array.from(new Set(next.map(x=>String(x).trim()).filter(Boolean)));
  setTreatmentOptions(clean);
  if(typeof window!=='undefined')localStorage.setItem('frontier_treatments',JSON.stringify(clean));
  if(!clean.includes(treatment))setTreatment(clean[0]||'');
}
function addTreatmentOption(){
  const v=newTreatment.trim();
  if(!v)return setMsg('追加する処置内容を入力してください');
  if(treatmentOptions.includes(v))return setMsg('すでに登録されています');
  saveTreatmentOptions([...treatmentOptions,v]);
  setNewTreatment('');
  setMsg('処置内容を追加しました');
}
function removeTreatmentOption(v:string){
  if(!confirm(`${v} を削除しますか？`))return;
  saveTreatmentOptions(treatmentOptions.filter(x=>x!==v));
  setMsg('処置内容を削除しました');
}
function resetTreatmentOptions(){
  if(!confirm('処置内容を初期状態に戻しますか？'))return;
  saveTreatmentOptions(defaultTreatments);
  setMsg('処置内容を初期状態に戻しました');
}
function resetSchedule(){setNextDraftInfo('');setEditingScheduleId('');setScheduleLocationType('facility');setSelectedPatientIds([]);setManualPatients('');setSchedulePatientSearch('');setTreatment(treatmentOptions[0]);setStartAt('');setScheduleMemo('');setRouteNo(1)}
async function saveSchedule(){
  const names=patientNamesFromIds(selectedPatientIds);
  if(String(scheduleLocationType)==='facility'&&!facilityId)return setMsg('施設を選んでください');
  if(!names.length)return setMsg('患者名を選択してください');
  if(!startAt)return setMsg('日時を入力してください');

  const newStartAt=`${startAt}:00+09:00`;
  const normalizedFacilityId=String(scheduleLocationType)==='facility'?facilityId:'';
  const row={
    clinic_id:activeClinicId,
    facility_id:normalizedFacilityId||null,
    patient_ids:selectedPatientIds,
    patient_names:names,
    treatment,
    start_at:newStartAt,
    memo:scheduleMemo,
    route_no:routeNo,
    patient_treatments:Object.fromEntries(names.map((name,index)=>[selectedPatientIds[index]||name,treatment]))
  };

  const targetId=editingScheduleId;
  let savedId='';

  if(editingScheduleId){
    const res=await supabase.from('schedules').update(row).eq('id',editingScheduleId);
    if(res.error)return setMsg('エラー：'+res.error.message);
    savedId=editingScheduleId;
  }else{
    const targetDate=new Date(newStartAt);
    const targetYmd=`${targetDate.getFullYear()}-${String(targetDate.getMonth()+1).padStart(2,'0')}-${String(targetDate.getDate()).padStart(2,'0')}`;

    const existing=schedules.find(s=>{
      const d=new Date(s.start_at);
      const ymd=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      return !!normalizedFacilityId && ymd===targetYmd && s.facility_id===normalizedFacilityId && (s.route_no||1)===routeNo;
    });

    if(existing){
      const oldIds=existing.patient_ids||[];
      const oldNames=existing.patient_names||[];
      const oldTreatments=existing.patient_treatments||{};
      const mergedIds=[...oldIds];
      const mergedNames=[...oldNames];
      const mergedTreatments={...oldTreatments};

      names.forEach((name,index)=>{
        const id=selectedPatientIds[index]||'';
        const existsById=id && mergedIds.includes(id);
        const existsByName=mergedNames.some(n=>String(n).replace(/\s/g,'')===String(name).replace(/\s/g,''));
        if(!existsById && !existsByName){
          if(id)mergedIds.push(id);
          mergedNames.push(name);
        }
        mergedTreatments[id||name]=treatment;
      });

      const updateRow={
        patient_ids:mergedIds,
        patient_names:mergedNames,
        patient_treatments:mergedTreatments,
        memo:existing.memo || scheduleMemo,
        completed:false
      };

      const res=await supabase.from('schedules').update(updateRow).eq('id',existing.id);
      if(res.error)return setMsg('エラー：'+res.error.message);
      savedId=existing.id;
      setMsg('同じ日・同じ施設・同じルートの予定にまとめました');
    }else{
      const res=await supabase.from('schedules').insert(row).select('id').single();
      if(res.error)return setMsg('エラー：'+res.error.message);
      savedId=(res as any).data?.id || '';
    }
  }

  const back=returnTab;
  resetSchedule();
  await load();
  setTab(back);
  if(savedId){
    setTimeout(()=>scrollToElementId(`schedule-${savedId}`,'center'),260);
  }else if(back==='calendar'){
    setTimeout(()=>scrollToElementId('selected-date-route','start'),260);
  }
}
async function deleteSchedule(id:string){
  if(demoMode){setSchedules(prev=>prev.filter(s=>s.id!==id));setMsg('デモ予定を削除しました');return;}
  if(!confirm('この予定を削除しますか？\n同じ施設でまとめて登録した患者も一緒に削除されます。'))return;
  const {error}=await supabase.from('schedules').delete().eq('id',id);
  if(error)return setMsg('エラー：'+error.message);
  await load();
  setMsg('予定を削除しました');
} function patientKeyForCompletion(s:Schedule,name:string,index:number){
  return s.patient_ids?.[index] || name;
}
function patientTreatmentText(s:Schedule,name:string,index:number){
  return treatmentFor(s,name,index) || s.treatment || '';
}
function isNonCountTreatmentText(text?:string){
  const t=(text||'').replace(/\s/g,'');
  return t.includes('無料検診') || t.includes('担当者会議');
}
function patientKeyForCancel(s:Schedule,name:string,index:number){
  return patientKeyFor(s,name,index);
}
function isPatientCanceled(s:Schedule,name:string,index:number){
  const key=patientKeyForCancel(s,name,index);
  return !!s.canceled_patients?.[key];
}
function cancelReasonFor(s:Schedule,name:string,index:number){
  return s.cancel_reasons?.[patientKeyForCancel(s,name,index)] || '';
}
function isCountTarget(s:Schedule,name:string,index:number){
  if(isPatientCanceled(s,name,index))return false;
  if(isNonCountTreatmentText(patientTreatmentText(s,name,index)))return false;
  return true;
}
function isPatientCompleted(s:Schedule,name:string,index:number){
  const key=patientKeyForCompletion(s,name,index);
  return !!s.completed_patients?.[key] || !!s.completed;
}
function schedulePatientCount(s:Schedule){
  const names=s.patient_names&&s.patient_names.length?s.patient_names:[''];
  return names.filter((name,index)=>isCountTarget(s,name,index)).length;
}
function scheduleCompletedCount(s:Schedule){
  const names=s.patient_names&&s.patient_names.length?s.patient_names:[''];
  return names.filter((name,index)=>isCountTarget(s,name,index)&&isPatientCompleted(s,name,index)).length;
}
async function togglePatientComplete(s:Schedule,name:string,index:number){
  const key=patientKeyForCompletion(s,name,index);
  if(demoMode){
    setSchedules(prev=>prev.map(x=>{
      if(x.id!==s.id)return x;
      const next={...(x.completed_patients||{})};
      next[key]=!next[key];
      return {...x,completed_patients:next,completed:false};
    }));
    return;
  }
  const next={...(s.completed_patients||{})};
  next[key]=!next[key];
  const names=s.patient_names&&s.patient_names.length?s.patient_names:[''];
  const doneCount=names.filter((n,i)=>isCountTarget(s,n,i) && (i===index ? next[key] : !!next[patientKeyForCompletion(s,n,i)])).length;
  const targetCount=names.filter((n,i)=>isCountTarget(s,n,i)).length;
  const allDone=targetCount>0 && doneCount===targetCount;
  const {error}=await supabase.from('schedules').update({
    completed_patients:next,
    completed:allDone,
    completed_at:allDone?new Date().toISOString():null
  }).eq('id',s.id);
  if(error)return setMsg('エラー：'+error.message);
  setSchedules(prev=>prev.map(x=>x.id===s.id?{...x,completed_patients:next,completed:allDone}:x));
}
async function togglePatientCancel(s:Schedule,name:string,index:number){
  if(isPatientCanceled(s,name,index)){
    await confirmPatientCancel(s,name,index,'');
    return;
  }
  setCancelModal({s,name,index});
}

async function confirmPatientCancel(s:Schedule,name:string,index:number,reason:string){
  const key=patientKeyForCancel(s,name,index);
  const next={...(s.canceled_patients||{})};
  const reasons={...(s.cancel_reasons||{})};

  if(reason){
    next[key]=true;
    reasons[key]=reason;
  }else{
    next[key]=false;
    delete reasons[key];
  }

  if(demoMode){
    setSchedules(prev=>prev.map(x=>x.id===s.id?{...x,canceled_patients:next,cancel_reasons:reasons}:x));
    setCancelModal(null);
    return;
  }

  const {error}=await supabase.from('schedules').update({canceled_patients:next,cancel_reasons:reasons}).eq('id',s.id);
  if(error)return setMsg('エラー：'+error.message);
  setSchedules(prev=>prev.map(x=>x.id===s.id?{...x,canceled_patients:next,cancel_reasons:reasons}:x));
  setCancelModal(null);
  setMsg(reason?`${name} をキャンセルにしました`:`${name} のキャンセルを解除しました`);
}

async function updateCancelReason(s:Schedule,name:string,index:number,value:string){
  const key=patientKeyForCancel(s,name,index);
  const next={...(s.cancel_reasons||{}),[key]:value};
  if(demoMode){
    setSchedules(prev=>prev.map(x=>x.id===s.id?{...x,cancel_reasons:next}:x));
    return;
  }
  const {error}=await supabase.from('schedules').update({cancel_reasons:next}).eq('id',s.id);
  if(error)return setMsg('エラー：'+error.message);
  setSchedules(prev=>prev.map(x=>x.id===s.id?{...x,cancel_reasons:next}:x));
}

async function setAllPatientsComplete(s:Schedule,done:boolean){
  const names=s.patient_names&&s.patient_names.length?s.patient_names:[''];
  if(demoMode){
    const next:Record<string,boolean>={};
    names.forEach((name,index)=>{next[patientKeyForCompletion(s,name,index)]=done});
    setSchedules(prev=>prev.map(x=>x.id===s.id?{...x,completed_patients:next,completed:done}:x));
    return;
  }
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

async function saveFacility(){if(!facilityName.trim())return setMsg('施設名を入力してください');let lat=facilityLat?Number(facilityLat):null;let lng=facilityLng?Number(facilityLng):null;if((!lat||!lng)&&facilityAddress.trim()){const geo=await geocodeFacilityAddress();if(geo){lat=geo.lat;lng=geo.lng;}}const row={clinic_id:activeClinicId,name:facilityName.trim(),address:facilityAddress,phone:facilityPhone,fax_number:facilityFax,fax_schedule_type:facilityFaxType,latitude:lat,longitude:lng};const res=editingFacilityId?await supabase.from('facilities').update(row).eq('id',editingFacilityId):await supabase.from('facilities').insert(row);if(res.error)return setMsg('エラー：'+res.error.message);setEditingFacilityId('');setFacilityName('');setFacilityAddress('');setFacilityPhone('');setFacilityFax('');setFacilityFaxType('monthly');setFacilityLat('');setFacilityLng('');await load()} function editFacility(f:Facility){setEditingFacilityId(f.id);setFacilityName(f.name||'');setFacilityAddress(f.address||'');setFacilityPhone(f.phone||'');setFacilityFax(f.fax_number||'');setFacilityFaxType(f.fax_schedule_type||'monthly');setFacilityLat(f.latitude?String(f.latitude):'');setFacilityLng(f.longitude?String(f.longitude):'')} async function deleteFacility(id:string){if(!confirm('施設を削除しますか？'))return;const {error}=await supabase.from('facilities').delete().eq('id',id);if(error)return setMsg('エラー：'+error.message);await load()}
function isHomeFacility(f?:Facility){
  return (f?.name||'').includes('居宅');
}

function getPrimaryPatient(s?:Schedule){
  if(!s)return undefined;
  const ids=s.patient_ids||[];
  return ids.map(id=>getPatient(id)).find(Boolean);
}

function visitAddressForSchedule(s:Schedule){
  const f=getFacility(s.facility_id);
  const p=getPrimaryPatient(s);

  // 居宅は患者住所を最優先。患者住所が空欄の時だけキーパーソン住所。
  if(isHomeFacility(f)){
    return (p?.patient_address || p?.key_person_address || f?.address || '').trim();
  }

  // 施設は施設住所を最優先。
  return (f?.address || p?.patient_address || p?.key_person_address || '').trim();
}

function scheduleAddress(s:Schedule){return visitAddressForSchedule(s)}

function copyList(list:Schedule[],label:string){
  type Group = {
    key:string;
    timeText:string;
    facilityName:string;
    patients:{name:string;treatment:string;memo?:string}[];
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
        treatment: treatmentFor(s,name,index) || s.treatment || '',
        memo: memoFor(s,name,index)
      });
    });
  });

  const nl = String.fromCharCode(10);

  const blocks = groups.map(g=>{
    const header = `${g.timeText}　${g.facilityName}`;
    const patientsText = g.patients.map(p=>{
      return `・${p.name}${p.treatment ? `　　${p.treatment}` : ''}${p.memo ? `${String.fromCharCode(10)}　メモ：${p.memo}` : ''}`;
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
  const q=addPatientSearch.trim().toLowerCase();
  const addCandidates=patients.filter(p=>{
    if(p.facility_id!==s.facility_id)return false;
    if(s.patient_ids?.includes(p.id) || s.patient_names?.includes(p.name))return false;
    if(!q)return true;
    return [p.name,p.kana,p.room].some(v=>(v||'').toLowerCase().includes(q));
  });
  return <div className='facilityGroupHeader'>
    <div className='row'>
      <div>
        <div className='facilityGroupTime'>{time(s.start_at)}　{f?.name}</div>
        <div className='small'>同施設まとめ / {total}名</div>
      </div>
      <span className='badge'>{doneCount}/{total} 完了</span>
    </div>
    <div className='progressOuter'><div className='progressInner' style={{width:`${rate}%`}} /></div>
    <div className='grid3'>
      <button className='secondary done' onClick={()=>setAllPatientsComplete(s,true)}>全員完了</button>
      <button className='secondary' onClick={()=>setAllPatientsComplete(s,false)}>全員未完了</button>
      <button className='secondary addPatient' onClick={()=>startAddPatientToSchedule(s)}>患者追加</button>
      <button className='secondary danger' onClick={()=>deleteSchedule(s.id)}>予定削除</button>
    </div>
  </div>
}

function renderScheduleCards(list:Schedule[], options?:{showDate?:boolean;from?:Tab;allowComplete?:boolean}){
  return list.flatMap(s=>{
    const names=s.patient_names&&s.patient_names.length?s.patient_names:[''];
    const cardData=names
      .map((name,index)=>({
        name,
        index,
        sort:roomSortValue(name,index,s),
        done:isPatientCompleted(s,name,index) || isPatientCanceled(s,name,index)
      }))
      .sort((a,b)=>(Number(a.done)-Number(b.done)) || a.sort-b.sort);

    const cards=cardData.map(({name,index})=>(
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
  const p=getPrimaryPatient(s);

  // 居宅は患者座標を最優先。患者住所から取得した座標を使う。
  if(isHomeFacility(f)){
    if(p?.patient_latitude&&p?.patient_longitude){
      return {latitude:p.patient_latitude,longitude:p.patient_longitude,name:p.name};
    }
    if(f?.latitude&&f?.longitude){
      return {latitude:f.latitude,longitude:f.longitude,name:f.name};
    }
    return null;
  }

  // 施設は施設座標を最優先。
  if(f?.latitude&&f?.longitude){
    return {latitude:f.latitude,longitude:f.longitude,name:f.name};
  }
  if(p?.patient_latitude&&p?.patient_longitude){
    return {latitude:p.patient_latitude,longitude:p.patient_longitude,name:p.name};
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
    const address=(isHomeFacility(f)?(p.patient_address||p.key_person_address||f?.address||''):(f?.address||p.patient_address||p.key_person_address||'')).trim();
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
    const facility=getFacility(s.facility_id);
    const isHome=(facility?.name||'').includes('居宅');
    const facilityName=isHome ? (s.patient_names?.join('、') || '居宅') : (facility?.name || '');
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

function flashElement(el:HTMLElement|null){
  if(!el)return;
  el.classList.add('flashTarget');
  setTimeout(()=>el.classList.remove('flashTarget'),2200);
}

function scrollToElementId(id:string,block:ScrollLogicalPosition='center'){
  setTimeout(()=>{
    const el=document.getElementById(id);
    if(el){
      el.scrollIntoView({behavior:'smooth',block});
      flashElement(el as HTMLElement);
    }
  },180);
}

function scrollToSchedule(s:Schedule){
  scrollToElementId(`schedule-${s.id}`,'center');
}

function scrollToScheduleForm(){
  scrollToElementId('schedule-form','start');
}

function monthlyVisitNumberForSchedule(s:Schedule,name:string,index:number){
  const key=s.patient_ids?.[index] || name;
  const targetDate=new Date(s.start_at);
  const y=targetDate.getFullYear();
  const m=targetDate.getMonth();
  const targetTime=targetDate.getTime();

  const visits=schedules
    .filter(x=>{
      const d=new Date(x.start_at);
      if(d.getFullYear()!==y || d.getMonth()!==m)return false;
      if(d.getTime()>targetTime)return false;
      const names=x.patient_names&&x.patient_names.length?x.patient_names:[''];
      return names.some((n,i)=>((x.patient_ids?.[i]||n)===key || n===name) && isCountTarget(x,n,i));
    })
    .sort((a,b)=>new Date(a.start_at).getTime()-new Date(b.start_at).getTime());

  return Math.max(1,visits.length);
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

  function routePatientNames(g:any){
    const names:string[]=[];
    g.schedules.forEach((s:Schedule)=>{
      const list=s.patient_names&&s.patient_names.length?s.patient_names:[];
      list.forEach(name=>{
        if(name && !names.includes(name))names.push(name);
      });
    });
    return names;
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
        <button className={'routeItem routeItem'+(g.schedules[0].route_no||1)} onClick={()=>scrollToSchedule(g.schedules[0])}>
          <div>
            <b>{g.timeText}　{g.facilityName}</b>
            <div className='small'>{g.patientCount}名 / タップで予定へ移動</div>
            <div className='routeNameOnlyList'>
              {routePatientNames(g).map(name=><span key={name}>{name}</span>)}
            </div>
          </div>
          <span>▶</span>
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

function SplitRouteBox({list,title,count,id}:{list:Schedule[];title:string;count:number;id:string}){
  const route1=list.filter(s=>(s.route_no||1)===1);
  const route2=list.filter(s=>(s.route_no||1)===2);
  if(route2.length===0){
    return <RouteBox list={list} title={title} count={count} id={id}/>;
  }
  return <div id={id} className='routeSplitBox'>
    <RouteBox list={route1} title={`${title} ①`} count={cardCount(route1)} id={`${id}-1`}/>
    <RouteBox list={route2} title={`${title} ②`} count={cardCount(route2)} id={`${id}-2`}/>
  </div>
}

function TodayRoute(){
  return <SplitRouteBox list={todaySchedules} title='🚗 今日のルート' count={todayCardCount} id='today-route'/>;
}

function TomorrowRoute(){
  return <SplitRouteBox list={tomorrowSchedules} title='🚗 明日のルート' count={tomorrowCardCount} id='tomorrow-route'/>;
}

function UnifiedSchedulePage({title,list,count,routeTitle,routeId,copyLabel,from,allowComplete=true,showDate=false,children}:{title:string;list:Schedule[];count:number;routeTitle:string;routeId:string;copyLabel:string;from:Tab;allowComplete?:boolean;showDate?:boolean;children?:any}){
  return <div className='unifiedPage'>
    <div className='unifiedHeader'>
      <div>
        <h2>{title}</h2>
        <div className='small'>ルート・予定・詳細を同じ画面で確認できます</div>
      </div>
      <span className='badge'>{count}件</span>
    </div>
    {children}
    <SplitRouteBox list={list} title={routeTitle} count={count} id={routeId}/>
    <div className='grid2 actionRow'>
      <button className='primary' onClick={()=>copyList(list,copyLabel)}>予定コピー</button>
      <button className='primary' onClick={()=>copyList(list,copyLabel+' 日報')}>日報コピー</button>
    </div>
    {list.length===0&&<p className='small'>予定はありません。</p>}
    {renderScheduleCards(list,{showDate,from,allowComplete})}
  </div>
}

function ScheduleCard({s,showDate=false,from='today',allowComplete=true,displayName,displayIndex=0}:{s:Schedule;showDate?:boolean;from?:Tab;allowComplete?:boolean;displayName?:string;displayIndex?:number}){
  const f=getFacility(s.facility_id);
  const isHome=(f?.name||'').includes('居宅');
  const ps=(s.patient_ids||[]).map(id=>getPatient(id)).filter(Boolean) as Patient[];
  const cardPatient=ps[displayIndex] || ps.find(p=>p.name===displayName) || ps[0];
  const patientName=displayName || s.patient_names?.join('、') || '';
  const done=displayName?isPatientCompleted(s,patientName,displayIndex):!!s.completed;
  const canceled=displayName?isPatientCanceled(s,patientName,displayIndex):false;
  const total=schedulePatientCount(s);
  const doneCount=scheduleCompletedCount(s);
  const rate=total?Math.round((doneCount/total)*100):0;
  const roomText=cardPatient?.room ? `🏠 ${cardPatient.room}` : '';
  const treatmentText=displayName ? treatmentFor(s,displayName,displayIndex) : s.treatment;
  const monthlyCount=displayName ? monthlyVisitNumberForSchedule(s,displayName,displayIndex) : 1;
  const nonCount=displayName ? !isCountTarget(s,patientName,displayIndex) : isNonCountTreatmentText(treatmentText);

  return <div id={`schedule-${s.id}`} className={'item compactCard routeCard'+(s.route_no||1)+' '+(done?'completed ':'')+(canceled?'canceledCard ':'')+(nonCount?'nonCountCard ':'')}>
    <div className='compactTop'>
      <div>
        <div className='compactTime'>{showDate?fmt(s.start_at):time(s.start_at)}　{f?.name}</div>
        <div className='compactPatient'>{canceled?'キャンセル':(done?'✓':'○')} {patientName}{isNewPatientInfoFeeBillingDay(s,patientName,displayIndex)&&<span className='newPatientBadge'>🆕 新患</span>}</div>
        <div className='compactMeta'>{isNewPatientInfoFeeBillingDay(s,patientName,displayIndex)&&<span className='newPatientMetaBadge'>新患対応</span>}{!nonCount&&<span className='visitCountBadge cardVisitCount'>{monthlyCount}</span>}{nonCount&&<span className='nonCountBadge'>件数対象外</span>}<span className='routeNoBadge'>R{s.route_no||1}</span>{roomText} {roomText?' / ':''}🦷 {treatmentText}</div>
      </div>
      <div className='compactActions'>
        {allowComplete&&displayName&&isCountTarget(s,patientName,displayIndex)&&<button className={done?'circleDone on':'circleDone'} onClick={()=>togglePatientComplete(s,patientName,displayIndex)}>{done?'✓':'○'}</button>}
        <button className='nextAlways' onClick={()=>createNextSchedule(s,displayName,displayIndex)}>次回</button>
        {allowComplete&&displayName&&<button className={canceled?'cancelPatientBtn on':'cancelPatientBtn'} onClick={()=>togglePatientCancel(s,patientName,displayIndex)}>{canceled?'取消解除':'キャンセル'}</button>}
      </div>
    </div>

    <div className='compactProgress'>
      <span>{doneCount}/{total} 完了{nonCount&&' / 件数対象外'}</span>
      <div className='progressOuter'><div className='progressInner' style={{width:`${rate}%`}} /></div>
    </div>

    <details className='compactDetails'>
      <summary>開く ▼</summary>

      <div className='detailGrid'>
        <button className='secondary patientDetail' onClick={()=>openSchedulePatient(s,displayName,displayIndex)}>患者詳細</button>
        <button className='secondary editScheduleBtn' onClick={()=>editSchedule(s,from)}>日時を変更</button>
        <button className='secondary' onClick={()=>openMap(scheduleAddress(s),f?.name)}>ナビ</button>
        {displayName&&<button className='secondary danger' onClick={()=>removePatientFromSchedule(s,patientName,displayIndex)}>この予定から外す</button>}
        {from==='today'&&<button className='secondary routeBack' onClick={()=>scrollToTodayRoute()}>⬆ ルートへ戻る</button>}{from==='calendar'&&<button className='secondary routeBack' onClick={()=>{const el=document.getElementById('selected-date-route'); if(el)el.scrollIntoView({behavior:'smooth',block:'start'});}}>⬆ この日のルートへ戻る</button>}
      </div>

      {displayName&&<div className='treatmentEdit'>
        <label>診療内容</label>
        <select value={treatmentFor(s,displayName,displayIndex)} onChange={e=>updatePatientTreatment(s,displayName,displayIndex,e.target.value)}>
          {treatmentOptions.map(t=><option key={t} value={t}>{t}</option>)}
        </select>
      </div>}

      {displayName&&<div className='todayMemoBox'>
        <label>本日のメモ</label>
        <textarea
          defaultValue={memoFor(s,displayName,displayIndex)}
          onBlur={e=>updatePatientMemo(s,displayName,displayIndex,e.target.value)}
          placeholder='この日の患者メモを入力'
        />
        <div className='small'>入力後、欄の外をタップすると保存されます</div>
      </div>}

      {displayName&&canceled&&<div className='cancelReasonBox'>
        <label>キャンセル理由</label>
        <select defaultValue={cancelReasonFor(s,patientName,displayIndex)} onChange={e=>updateCancelReason(s,patientName,displayIndex,e.target.value)}>
          <option value=''>未入力</option>
          <option value='体調不良'>体調不良</option>
          <option value='入院'>入院</option>
          <option value='不在'>不在</option>
          <option value='家族都合'>家族都合</option>
          <option value='施設都合'>施設都合</option>
          <option value='その他'>その他</option>
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
function GuidedDemoPanel(){
  if(!guidedDemo)return null;
  const step=guidedDemoSteps[guidedStep];
  const last=guidedStep>=guidedDemoSteps.length-1;
  if(guidedCollapsed){
    return <button className='guidedPill' onClick={()=>setGuidedCollapsed(false)}>🎮 デモ {guidedStep+1}/{guidedDemoSteps.length}</button>;
  }
  return <div className='guidedDemoPanel improved'>
    <div className='guidedTop'>
      <div className='guidedBadge'>操作デモ {guidedStep+1}/{guidedDemoSteps.length}</div>
      <div className='guidedMiniButtons'>
        <button className='mini' onClick={()=>setGuidedCollapsed(true)}>小さく</button>
        <button className='mini' onClick={stopGuidedDemo}>終了</button>
      </div>
    </div>
    <h2>{step.title}</h2>
    <p>{step.body}</p>
    {step.target&&<div className='guidedTarget'>今やること：<b>{step.target}</b></div>}
    <div className='guidedProgress'>
      <div style={{width:`${Math.round(((guidedStep+1)/guidedDemoSteps.length)*100)}%`}} />
    </div>

    <div className='demoQuickActions'>
      <button type='button' onClick={demoOpenFirstDetail}>詳細を開く</button>
      <button type='button' onClick={demoCompleteFirstPatient}>完了を試す</button>
      <button type='button' onClick={demoOpenCalendarRoute}>予定へ移動</button>
      <button type='button' onClick={demoOpenAddPatient}>患者追加</button>
    </div>

    <div className='grid2'>
      <button className='secondary' disabled={guidedStep===0} onClick={()=>{const prev=Math.max(0,guidedStep-1);setGuidedStep(prev);moveGuidedTarget(prev);}}>戻る</button>
      <button className='primary' onClick={()=>last?stopGuidedDemo():nextGuidedStep()}>{last?'完了':'できた'}</button>
    </div>
    <button className='secondary tutorialSkip' onClick={()=>moveGuidedTarget()}>その場所へ移動</button>
  </div>
}

function BeginnerTutorial(){
  if(!showTutorial)return null;
  const step=tutorialSteps[tutorialStep];
  const last=tutorialStep>=tutorialSteps.length-1;

  function goTarget(){
    const t=step.target || '';
    if(t.includes('今日')){
      setTab('today');
      setTimeout(()=>{const el=document.getElementById('today-route');if(el)el.scrollIntoView({behavior:'smooth',block:'start'});},160);
    }
    if(t.includes('予定')){
      setTab('calendar');
    }
    if(t.includes('ルート')){
      setTab('today');
      setTimeout(()=>{const el=document.getElementById('today-route');if(el)el.scrollIntoView({behavior:'smooth',block:'start'});},160);
    }
  }

  if(tutorialMinimized){
    return <button className='tutorialPill' onClick={()=>setTutorialMinimized(false)}>使い方 {tutorialStep+1}/{tutorialSteps.length}</button>;
  }

  return <div className='tutorialFloatingCard'>
    <div className='tutorialTop'>
      <div className='tutorialBadge'>操作練習</div>
      <div className='tutorialMiniButtons'>
        <button className='mini' onClick={()=>setTutorialMinimized(true)}>小さく</button>
        <button className='mini' onClick={()=>closeTutorial(false)}>閉じる</button>
      </div>
    </div>
    <h2>{step.title}</h2>
    <p>{step.body}</p>
    {step.target&&<div className='tutorialTarget'>操作する場所：<b>{step.target}</b></div>}
    <div className='tutorialDots'>
      {tutorialSteps.map((_,i)=><span key={i} className={i===tutorialStep?'on':''}></span>)}
    </div>
    <div className='grid2'>
      <button className='secondary' disabled={tutorialStep===0} onClick={()=>setTutorialStep(v=>Math.max(0,v-1))}>戻る</button>
      <button className='primary' onClick={()=>last?closeTutorial(true):setTutorialStep(v=>v+1)}>できた</button>
    </div>
    <button className='secondary tutorialSkip' onClick={goTarget}>その場所へ移動</button>
    <div className='small'>このカード以外の画面はそのまま操作できます。邪魔な時は「小さく」を押してください。</div>
  </div>
}


function patientScheduleStatusForDate(p:Patient,ymd:string){
  const m=patientMonthCount(p,ymd);
  const w=patientWeekCount(p,ymd);
  const target=targetMonthlyCount(p);
  return {
    month:m,
    week:w,
    target,
    label:`今月${m}${target?`/${target}`:''}回・今週${w}回`,
    needsWeek:w===0,
    needsMonth:target>0 && m<target
  };
}
function sortPatientsForAddModal(list:Patient[],ymd:string){
  return [...list].sort((a,b)=>{
    const as=patientScheduleStatusForDate(a,ymd);
    const bs=patientScheduleStatusForDate(b,ymd);
    if(as.needsWeek!==bs.needsWeek)return as.needsWeek?-1:1;
    if(as.needsMonth!==bs.needsMonth)return as.needsMonth?-1:1;
    const ar=as.target?as.month/as.target:999;
    const br=bs.target?bs.month/bs.target:999;
    if(ar!==br)return ar-br;
    return (a.kana||a.name||'').localeCompare(b.kana||b.name||'','ja');
  });
}

function AddPatientModal(){
  const s=addPatientModalSchedule;
  if(!s)return null;

  const q=addPatientSearch.trim().toLowerCase();
  const modalYmd=String(s.start_at||'').slice(0,10) || localYmdValue();
  const addCandidates=sortPatientsForAddModal(patients.filter(p=>{
    if(p.facility_id!==s.facility_id)return false;
    if(s.patient_ids?.includes(p.id) || s.patient_names?.includes(p.name))return false;
    if(!q)return true;
    return [p.name,p.kana,p.room,p.visit_frequency,p.care_manager_company,p.care_manager_phone].some(v=>(v||'').toLowerCase().includes(q));
  }),modalYmd);

  function closeAddPatientModal(){
    setAddingScheduleId('');
    setAddPatientModalSchedule(null);
    setAddPatientSearch('');
    setAddPatientIds([]);
  }

  return <div className='modalBackdrop' onClick={e=>e.stopPropagation()} onTouchStart={e=>e.stopPropagation()}>
    <div className='addPatientModal' onClick={e=>e.stopPropagation()} onTouchStart={e=>e.stopPropagation()}>
      <div className='row'>
        <h2>患者追加</h2>
        <button type='button' className='mini' onClick={closeAddPatientModal}>閉じる</button>
      </div>

      <label>追加する患者を検索</label>
      <div className='searchRow'>
        <input
          id='add-patient-search-input'
          defaultValue={addPatientSearch}
          onClick={e=>e.stopPropagation()}
          onTouchStart={e=>e.stopPropagation()}
          onKeyDown={e=>{if(e.key==='Enter')e.preventDefault()}}
          placeholder='患者名・フリガナ・部屋番号'
        />
        <button type='button' className='secondary searchButton' onClick={()=>{
          const el=document.getElementById('add-patient-search-input') as HTMLInputElement | null;
          setAddPatientSearch(el?.value || '');
        }}>検索</button>
      </div>

      <div className='small'>今週入っていない患者を上位表示します。今月回数も確認できます。</div>

      <div className='checks addCandidates modalCandidates'>
        {addCandidates.map(p=>{
          const st=patientScheduleStatusForDate(p,modalYmd);
          return <label className={'checkrow '+(st.needsWeek?'needsSchedule':'')} key={p.id}>
            <input type='checkbox' checked={addPatientIds.includes(p.id)} onChange={e=>setAddPatientIds(prev=>e.target.checked?[...prev,p.id]:prev.filter(id=>id!==p.id))}/>
            <span>{p.room?`${p.room}　`:''}{p.name}</span>
            {st.needsWeek&&<span className='badge'>今週未予定</span>}
            {st.needsMonth&&<span className='badge'>今月不足</span>}
            {p.visit_frequency&&<span className='badge'>頻度：{p.visit_frequency}</span>}
            <span className='badge'>{st.label}</span>
          </label>
        })}
      </div>

      {addCandidates.length===0&&<div className='small'>候補がありません。デモでは「宇都宮」などで検索してみてください。</div>}

      <div className='grid2'>
        <button type='button' className='primary' onClick={()=>addSelectedPatientsToSchedule(s)}>選択した患者を追加</button>
        <button type='button' className='secondary' onClick={closeAddPatientModal}>キャンセル</button>
      </div>
    </div>
  </div>
}

function renderPatientForm(){const p=patientForm;const hist=history(p).slice(-6).reverse();return <div className='detail'><div className='row'><h2>{p.id?'👤 患者詳細':'➕ 患者登録'}</h2><button className='mini' onClick={()=>setShowPatientForm(false)}>閉じる</button></div>{p.id&&<div className='grid2'><div className='stat'><b>{monthCount(p)}</b>今月</div><div className='stat'><b>{hist.length}</b>履歴</div></div>}
{p.id&&<div className='patientInfoBox aiSummaryBox'>
  <h3>🤖 患者メモAI要約</h3>
  {(() => {
    const s=aiPatientSummary(p);
    return <div>
      <div className='infoLine'><span>注意点</span><b>{s.attention.join(' / ')}</b></div>
      <div className='infoLine'><span>義歯</span><b>{s.denture.join(' / ')}</b></div>
      <div className='infoLine'><span>次回</span><b>{s.next.join(' / ')}</b></div>
      {s.general.length>0&&<div className='small'>{s.general.join(' / ')}</div>}
    </div>
  })()}
</div>}
{p.id&&<div className='patientInfoBox'>
  <h3>連絡先</h3>
  <div className='infoLine'><span>ケアマネ</span><b>{p.care_manager||'未登録'}</b></div>
  <div className='infoLine'><span>事業所</span><b>{p.care_manager_company||'未登録'}</b></div>
  <div className='infoLine'><span>電話</span><b>{p.care_manager_phone||'未登録'}</b></div>
  {p.care_manager_phone&&<button type='button' className='secondary phone' onClick={()=>callPhone(p.care_manager_phone)}>📞 ケアマネへ電話</button>}
</div>}<div className='photoExtractBox'>
  <h3>画像・PDFから患者登録 <span className='versionBadge'>安定版 Sprint8.0</span></h3>
  <div className='small'>写真・スクリーンショット・LINE保存画像・PDFから、患者名・電話番号・施設・キーパーソン・ケアマネ情報を読み取ります。必ず確認してから保存してください。</div>
  <div className='photoUploadGrid'>
    <label className='photoUploadButton'>
      {photoExtracting?'読み取り中...':'📷 写真を撮る'}
      <input type='file' accept='image/*' capture='environment' onChange={e=>{const file=e.target.files?.[0]; if(file)extractPatientFromFile(file,'camera'); e.currentTarget.value='';}}/>
    </label>
    <label className='photoUploadButton'>
      {photoExtracting?'読み取り中...':'🖼️ 画像を選ぶ'}
      <input type='file' accept='image/*' onChange={e=>{const file=e.target.files?.[0]; if(file)extractPatientFromFile(file,'image'); e.currentTarget.value='';}}/>
    </label>
    <label className='photoUploadButton'>
      {photoExtracting?'読み取り中...':'📄 PDFを選ぶ（安定版）'}
      <input type='file' accept='application/pdf,image/*' onChange={e=>{const file=e.target.files?.[0]; if(file)extractPatientFromFile(file,file.type.includes('pdf')?'pdf':'image'); e.currentTarget.value='';}}/>
    </label>
  </div>
</div><label>区分</label>
<div className='segmentedChoice'>
  <button type='button' className={String(patientLocationType)==='facility'?'on':''} onClick={()=>{setPatientLocationType('facility'); if(!p.facility_id)setPatientField('facility_id',facilities[0]?.id||'')}}>施設</button>
  <button type='button' className={String(patientLocationType)==='home'?'on':''} onClick={()=>{setPatientLocationType('home'); setPatientField('facility_id','')}}>居宅</button>
</div>
{String(patientLocationType)==='facility'&&<><label>施設</label><select value={p.facility_id||''} onChange={e=>setPatientField('facility_id',e.target.value)}>{facilities.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}</select></>}<div className='grid2'><div><label>患者名</label><input value={p.name||''} onChange={e=>setPatientField('name',e.target.value)}/></div><div><label>フリガナ</label><input value={p.kana||''} onChange={e=>setPatientField('kana',e.target.value)}/></div></div><label>患者住所</label><textarea value={p.patient_address||''} onChange={e=>setPatientField('patient_address',e.target.value)}/><button className='secondary geoButton' onClick={geocodePatientAddress}>患者住所から座標を再取得</button><div className='small'>居宅は患者住所を優先します。患者住所を変更したら保存時に座標も更新されます。</div><label>部屋番号</label><input value={p.room||''} onChange={e=>setPatientField('room',e.target.value)}/>
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
<div className='frequencyHelp'>次回登録はこの訪問頻度を見て自動計算します。</div><label>キーパーソン</label><input value={p.key_person||''} onChange={e=>setPatientField('key_person',e.target.value)}/><label>電話</label><input value={p.phone||''} onChange={e=>setPatientField('phone',e.target.value)}/><label>キーパーソン住所</label><textarea value={p.key_person_address||''} onChange={e=>setPatientField('key_person_address',e.target.value)}/><div className='careManagerBox'>
  <h3>ケアマネ情報</h3>
  <label>ケアマネ</label>
  <input value={p.care_manager||''} onChange={e=>setPatientField('care_manager',e.target.value)} placeholder='担当ケアマネ名'/>
  <label>事業所名</label>
  <input value={p.care_manager_company||''} onChange={e=>setPatientField('care_manager_company',e.target.value)} placeholder='居宅介護支援事業所名'/>
  <label>ケアマネ電話番号</label>
  <div className='phoneInputRow'>
    <input value={p.care_manager_phone||''} onChange={e=>setPatientField('care_manager_phone',e.target.value)} placeholder='電話番号'/>
    {p.care_manager_phone&&<button type='button' className='secondary phoneMini' onClick={()=>callPhone(p.care_manager_phone)}>電話</button>}
  </div>
</div><label>既往症・注意すべき疾患</label><textarea value={p.medical_history||''} onChange={e=>setPatientField('medical_history',e.target.value)} placeholder='例：高血圧、糖尿病、脳梗塞既往、抗凝固薬、認知症、アレルギーなど'/><label>メモ</label><textarea value={p.memo||''} onChange={e=>setPatientField('memo',e.target.value)}/>{p.id&&<><h3>診療履歴</h3>{hist.map(h=><div className='item' key={h.id}><b>{dateOnly(h.start_at)}</b><div className='small'>{h.treatment} / {getFacility(h.facility_id)?.name}</div></div>)}</>}<div className='grid3'><button className='secondary' onClick={()=>callPhone(p.phone)}>電話</button><button className='secondary' onClick={()=>openMap(p.patient_address||p.key_person_address,p.name)}>地図</button><button className='secondary' onClick={()=>createPatientChartPdf(p)}>カルテPDF</button><button className='secondary danger' onClick={()=>deletePatient(p.id)}>削除</button></div><button className='primary' onClick={savePatient}>保存</button></div>}

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
  setTreatment(treatmentOptions[0]);
  setScheduleMemo('');
  setRouteNo(1);
  setStartAt(`${selectedDate}T10:00`);
  setTab('calendar');
  setMsg('選択した日付で新規予定を作成します');
  setTimeout(()=>{
    const el=document.getElementById('schedule-form');
    if(el)el.scrollIntoView({behavior:'smooth',block:'start'});
  },150);
}

function selectCalendarDateAndScroll(day:Date){
  setSelectedDate(toYmd(day));
  setTab('calendar');
  setTimeout(()=>{
    const el=document.getElementById('selected-date-route');
    if(el)el.scrollIntoView({behavior:'smooth',block:'start'});
  },180);
}


function routeSchedulesForList(list:Schedule[],route:number){
  return list.filter(s=>(s.route_no||1)===route);
}

function coordsForSchedule(s:Schedule){
  const f=getFacility(s.facility_id);
  if(f?.latitude&&f?.longitude)return {lat:f.latitude,lng:f.longitude};
  const p=getPrimaryPatient(s);
  if(p?.patient_latitude&&p?.patient_longitude)return {lat:p.patient_latitude,lng:p.patient_longitude};
  return null;
}
function distKm(a:{lat:number;lng:number},b:{lat:number;lng:number}){
  const R=6371;
  const dLat=(b.lat-a.lat)*Math.PI/180;
  const dLng=(b.lng-a.lng)*Math.PI/180;
  const la1=a.lat*Math.PI/180, la2=b.lat*Math.PI/180;
  const h=Math.sin(dLat/2)**2+Math.cos(la1)*Math.cos(la2)*Math.sin(dLng/2)**2;
  return 2*R*Math.asin(Math.sqrt(h));
}
function estimatedDriveMinutesByKm(km:number){
  const roadKm=km*1.35;
  return Math.max(10,Math.ceil((roadKm/22)*60));
}
function travelMinutesFromCoordToSchedule(start:{lat:number;lng:number}|null,s?:Schedule){
  if(!start||!s)return 0;
  const c=coordsForSchedule(s);
  if(!c)return 15;
  return estimatedDriveMinutesByKm(distKm(start,c));
}
function travelMinutesBetween(a?:Schedule,b?:Schedule){
  if(!a||!b)return 0;
  const ca=coordsForSchedule(a);
  const cb=coordsForSchedule(b);
  if(!ca||!cb)return 15;
  return estimatedDriveMinutesByKm(distKm(ca,cb));
}
function treatmentMinutesForSchedule(s?:Schedule){
  if(!s)return 0;
  const names=s.patient_names&&s.patient_names.length?s.patient_names:[''];
  const count=names.filter((name,index)=>!isPatientCanceled(s,name,index)&&isCountTarget(s,name,index)).length;
  return Math.max(20,count*20);
}
function previewTimePlan(list:Schedule[],baseStart:string){
  const result:{id:string;start:string;end:string;travel:number;treat:number}[]=[];
  let current=new Date(baseStart);
  list.forEach((s,index)=>{
    const travel=index===0?travelMinutesFromCoordToSchedule(activeClinicStartCoord(),s):travelMinutesBetween(list[index-1],s);
    if(index>0)current.setMinutes(current.getMinutes()+travel);
    const start=new Date(current);
    const treat=treatmentMinutesForSchedule(s);
    current.setMinutes(current.getMinutes()+treat);
    const end=new Date(current);
    const hhmm=(d:Date)=>`${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
    result.push({id:s.id,start:hhmm(start),end:hhmm(end),travel,treat});
  });
  return result;
}
function planStartIso(baseStart:string,list:Schedule[],index:number){
  const plan=previewTimePlan(list,baseStart);
  const p=plan[index];
  const base=new Date(baseStart);
  const [h,m]=(p?.start||'10:00').split(':').map(Number);
  base.setHours(h||0,m||0,0,0);
  return `${base.getFullYear()}-${String(base.getMonth()+1).padStart(2,'0')}-${String(base.getDate()).padStart(2,'0')}T${String(base.getHours()).padStart(2,'0')}:${String(base.getMinutes()).padStart(2,'0')}:00+09:00`;
}
function nearestRouteOrder(list:Schedule[]){
  const remaining=[...list].sort((a,b)=>new Date(a.start_at).getTime()-new Date(b.start_at).getTime());
  if(remaining.length<=1)return remaining;
  const start=activeClinicStartCoord();
  const ordered:Schedule[]=[];
  if(start){
    let bestIdx=0,best=Infinity;
    remaining.forEach((s,i)=>{
      const c=coordsForSchedule(s);
      const d=c?distKm(start,c):Infinity;
      if(d<best){best=d;bestIdx=i;}
    });
    ordered.push(remaining.splice(bestIdx,1)[0]);
  }else{
    ordered.push(remaining.shift() as Schedule);
  }
  while(remaining.length){
    const last=coordsForSchedule(ordered[ordered.length-1]);
    if(!last){ordered.push(remaining.shift() as Schedule);continue;}
    let bestIdx=0,best=Infinity;
    remaining.forEach((s,i)=>{
      const c=coordsForSchedule(s);
      const d=c?distKm(last,c):Infinity;
      if(d<best){best=d;bestIdx=i;}
    });
    ordered.push(remaining.splice(bestIdx,1)[0]);
  }
  return ordered;
}
function routeDistanceKm(list:Schedule[]){
  let total=0;
  const start=activeClinicStartCoord();
  const end=activeClinicEndCoord();
  if(start&&list[0]){
    const first=coordsForSchedule(list[0]);
    if(first)total+=distKm(start,first);
  }
  for(let i=1;i<list.length;i++){
    const a=coordsForSchedule(list[i-1]);
    const b=coordsForSchedule(list[i]);
    if(a&&b)total+=distKm(a,b);
  }
  if(end&&list.length){
    const last=coordsForSchedule(list[list.length-1]);
    if(last)total+=distKm(last,end);
  }
  return total;
}
function routeItemTitle(s:Schedule){
  const f=getFacility(s.facility_id);
  const names=(s.patient_names||[]).filter((name,index)=>!isPatientCanceled(s,name,index)).join('・');
  return `${time(s.start_at)} ${f?.name||'居宅'} ${names?` / ${names}`:''}`;
}
function previewSchedules(){
  return routePreview?routePreview.ids.map(id=>schedules.find(s=>s.id===id)).filter(Boolean) as Schedule[]:[];
}
function previewStartAt(index:number){
  if(!routePreview)return '';
  const list=previewSchedules();
  return previewTimePlan(list,routePreview.baseStart)[index]?.start || '';
}
function updatePreviewBaseTime(value:string){
  if(!routePreview)return;
  const base=new Date(routePreview.baseStart);
  const [h,m]=value.split(':').map(Number);
  base.setHours(h||0,m||0,0,0);
  const iso=`${base.getFullYear()}-${String(base.getMonth()+1).padStart(2,'0')}-${String(base.getDate()).padStart(2,'0')}T${String(base.getHours()).padStart(2,'0')}:${String(base.getMinutes()).padStart(2,'0')}:00+09:00`;
  setRoutePreview({...routePreview,baseStart:iso});
}
function moveRoutePreviewItem(from:number,to:number){
  if(!routePreview || from===to || to<0 || to>=routePreview.ids.length)return;
  const ids=[...routePreview.ids];
  const [item]=ids.splice(from,1);
  ids.splice(to,0,item);
  setRoutePreview({...routePreview,ids});
}
function openRouteOptimizationPreview(routeNo:1|2){
  const list=selectedDateSchedules().filter(s=>(s.route_no||1)===routeNo);
  if(list.length<2)return setMsg('最適化する予定がありません');
  const ordered=nearestRouteOrder(list);
  setRoutePreview({routeNo,ids:ordered.map(s=>s.id),baseStart:ordered[0]?.start_at||list[0].start_at});
}
async function applyRoutePreview(){
  if(!routePreview)return;
  const proposed=previewSchedules();
  const updates=routePreview.ids.map((id,i)=>({id,start_at:planStartIso(routePreview.baseStart,proposed,i)}));
  if(!confirm('このプレビューの順番と時間で予定を変更しますか？'))return;
  if(demoMode){
    setSchedules(prev=>prev.map(s=>{
      const u=updates.find(x=>x.id===s.id);
      return u?{...s,start_at:u.start_at}:s;
    }));
    setRoutePreview(null);
    return setMsg(`ルート${routePreview.routeNo}を変更しました（デモ）`);
  }
  for(const u of updates){
    const {error}=await supabase.from('schedules').update({start_at:u.start_at}).eq('id',u.id);
    if(error)return setMsg('エラー：'+error.message);
  }
  setRoutePreview(null);
  await load();
  setMsg(`ルート${routePreview.routeNo}を変更しました`);
}
function RouteOptimizationPreview(){
  if(!routePreview)return null;
  const current=selectedDateSchedules().filter(s=>(s.route_no||1)===routePreview.routeNo).sort((a,b)=>new Date(a.start_at).getTime()-new Date(b.start_at).getTime());
  const proposed=previewSchedules();
  const before=routeDistanceKm(current);
  const after=routeDistanceKm(proposed);
  const diff=before-after;
  return <div className='modalOverlay' onClick={()=>setRoutePreview(null)}>
    <div className='routePreviewModal' onClick={e=>e.stopPropagation()}>
      <div className='adminHeader'>
        <div><div className='easyLabel'>ルート最適化プレビュー</div><h2>ルート{routePreview.routeNo}</h2></div>
        <button className='mini' onClick={()=>setRoutePreview(null)}>閉じる</button>
      </div>
      <div className='adminStats'>
        <div><b>{before.toFixed(1)}km</b><span>現在</span></div>
        <div><b>{after.toFixed(1)}km</b><span>提案</span></div>
        <div><b>{diff>0?`${diff.toFixed(1)}km短縮`:'調整なし'}</b><span>目安</span></div>
        <div><b>{previewTimePlan(proposed,routePreview.baseStart).reduce((sum,x)=>sum+x.travel+x.treat,0)}分</b><span>移動＋診療</span></div>
      </div>
      <label>開始時間</label>
      <input type='time' value={previewStartAt(0)} onChange={e=>updatePreviewBaseTime(e.target.value)}/>
      <div className='small'>ドラッグで順番を変更できます。移動時間は座標から自動計算し、診療時間を足して開始時間を出します。</div>
      <div className='routePreviewList'>
        {proposed.map((s,index)=><div
          key={s.id}
          className='routePreviewItem'
          draggable
          onDragStart={()=>setDraggingRouteId(s.id)}
          onDragOver={e=>e.preventDefault()}
          onDrop={()=>{const from=proposed.findIndex(x=>x.id===draggingRouteId);moveRoutePreviewItem(from,index);setDraggingRouteId('')}}
        >
          <div className='routePreviewNo'>{index+1}</div>
          <div className='routePreviewMain'>
            <b>{previewStartAt(index)}　{getFacility(s.facility_id)?.name||'居宅'}</b>
            <div className='small'>{(s.patient_names||[]).filter((name,i)=>!isPatientCanceled(s,name,i)).join('・')}</div>
            <div className='small'>移動 {previewTimePlan(proposed,routePreview.baseStart)[index]?.travel||0}分 / 診療 {previewTimePlan(proposed,routePreview.baseStart)[index]?.treat||0}分 / 終了 {previewTimePlan(proposed,routePreview.baseStart)[index]?.end||''}</div>
          </div>
          <div className='routePreviewBtns'>
            <button className='mini' onClick={()=>moveRoutePreviewItem(index,index-1)}>↑</button>
            <button className='mini' onClick={()=>moveRoutePreviewItem(index,index+1)}>↓</button>
          </div>
        </div>)}
      </div>
      <div className='grid2 actionRow'>
        <button className='secondary' onClick={()=>setRoutePreview(null)}>現在のまま</button>
        <button className='primary' onClick={applyRoutePreview}>提案を採用</button>
      </div>
    </div>
  </div>
}

function RouteSplitSchedulePage({dateLabel,list,from}:{dateLabel:string;list:Schedule[];from:Tab}){
  const route1=routeSchedulesForList(list,1);
  const route2=routeSchedulesForList(list,2);
  const count1=cardCount(route1);
  const count2=cardCount(route2);
  const total=cardCount(list);
  useEffect(()=>{
    if(calendarActiveRoute===1 && count1===0 && count2>0)setCalendarActiveRoute(2);
  },[dateLabel,count1,count2]);
  const activeRoute=calendarActiveRoute;
  const activeList=activeRoute===1?route1:route2;
  const activeCount=activeRoute===1?count1:count2;

  function switchCalendarRoute(route:1|2){
    setCalendarActiveRoute(route);
    setTimeout(()=>{
      const el=document.getElementById('calendar-route-active');
      if(el)el.scrollIntoView({behavior:'smooth',block:'start'});
    },80);
  }

  return <div className='calendarRouteSplitPage' id='calendar-route-active'>
    <div className='unifiedHeader'>
      <div>
        <h2>📌 {dateLabel} の予定</h2>
        <div className='small'>ルート1・ルート2をワンタップで切り替えできます</div>
      </div>
      <span className='badge'>{total}件</span>
    </div>

    <div className='routeQuickSwitch'>
      <button className={activeRoute===1?'on r1':'r1'} onClick={()=>switchCalendarRoute(1)}>🔵 ルート1<br/><b>{count1}件</b></button>
      <button className={activeRoute===2?'on r2':'r2'} onClick={()=>switchCalendarRoute(2)}>🟢 ルート2<br/><b>{count2}件</b></button>
    </div>

    <div className='grid2 actionRow'><button className='primary' onClick={createScheduleForSelectedDate}>この日に予定を追加</button><button className='secondary' onClick={()=>openRouteOptimizationPreview(activeRoute as 1|2)}>🧭 ルート最適化</button></div>

    <div className={'calendarRouteColumn activeCalendarRoute '+(activeRoute===1?'route1Column':'route2Column')}>
      <div className='routeColumnHeader'>
        <h3>ルート{activeRoute}</h3>
        <span>{activeCount}件</span>
      </div>
      <StickyNextVisit list={activeList}/>
      <VisitCompletionSheet list={activeList} route={activeRoute}/>
      <RouteBox list={activeList} title={`🚗 この日のルート${activeRoute}`} count={activeCount} id={`selected-date-route-${activeRoute}`}/>
      <div className='grid2 actionRow'>
        <button className='primary' onClick={()=>copyList(activeList,`${dateLabel} ルート${activeRoute}`)}>ルート{activeRoute}コピー</button>
        <button className='secondary' onClick={()=>copyList(activeList,`${dateLabel} ルート${activeRoute} 日報`)}>日報</button>
      </div>
      {activeList.length===0&&<p className='small'>ルート{activeRoute}の予定はありません。</p>}
      {renderScheduleCards(activeList,{showDate:true,from,allowComplete:true})}
    </div>
  </div>
}



function withSama(name?:string){
  const n=(name||'').trim();
  if(!n)return '';
  return n.endsWith('様') ? n : `${n} 様`;
}
function withOnchu(name?:string){
  const n=(name||'').trim();
  if(!n)return '';
  return n.endsWith('御中') ? n : `${n} 御中`;
}
function getPeriodRange(type:string){
  const now=new Date();
  const start=new Date(now);
  const end=new Date(now);

  if(type==='today'){
    // 今日1日
  }else if(type==='tomorrow'){
    start.setDate(now.getDate()+1);
    end.setDate(now.getDate()+1);
  }else if(type==='weekly'){
    const day=now.getDay();
    start.setDate(now.getDate()-day);
    end.setDate(start.getDate()+6);
  }else if(type==='next_week'){
    const day=now.getDay();
    start.setDate(now.getDate()-day+7);
    end.setDate(start.getDate()+6);
  }else if(type==='current_month'){
    start.setDate(1);
    end.setMonth(now.getMonth()+1,0);
  }else{
    start.setMonth(now.getMonth()+1,1);
    end.setMonth(start.getMonth()+1,0);
  }

  start.setHours(0,0,0,0);
  end.setHours(23,59,59,999);

  const ymd=(d:Date)=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const jp=(d:Date)=>`${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日`;
  return {start,end,startText:ymd(start),endText:ymd(end),startJp:jp(start),endJp:jp(end),singleDay:ymd(start)===ymd(end)};
}
function schedulesForFacilityPeriod(facilityId:string,start:Date,end:Date){
  return sortedSchedules.filter(s=>{
    const d=new Date(s.start_at);
    return s.facility_id===facilityId && d>=start && d<=new Date(end.getFullYear(),end.getMonth(),end.getDate(),23,59,59);
  });
}
function createFacilityFaxPdf(f:Facility,type?:string){
  const scheduleType=type || f.fax_schedule_type || 'monthly';
  const range=getPeriodRange(scheduleType);
  const list=schedulesForFacilityPeriod(f.id,range.start,range.end);
  const title=`${withOnchu(f.name)} 訪問予定表`;
  const periodText=range.singleDay ? range.startJp : `${range.startJp}〜${range.endJp}`;
  const rows=list.map(s=>{
    const names=(s.patient_names||[]).map(n=>withSama(n)).join('<br/>');
    const d=new Date(s.start_at);
    const w=['日','月','火','水','木','金','土'][d.getDay()];
    const dayClass=d.getDay()===0?' sunday':d.getDay()===6?' saturday':'';
    return `<tr><td class="date${dayClass}">${dateOnly(s.start_at)}（${w}）</td><td class="time">${time(s.start_at)}</td><td class="names">${names}</td></tr>`;
  }).join('') || `<tr><td colspan="3" class="empty">予定はありません</td></tr>`;

  const html=`<!doctype html><html><head><meta charset="utf-8"/><title>${title}</title><style>
    @page{size:A4 portrait;margin:14mm}
    body{font-family:-apple-system,BlinkMacSystemFont,'Noto Sans JP','Hiragino Sans',sans-serif;color:#111;margin:0;padding:0}
    .sheet{padding:10px 14px}
    .to{font-size:24px;font-weight:800;margin-bottom:18px}
    h1{text-align:center;font-size:30px;margin:8px 0 14px;letter-spacing:.04em}
    .period{text-align:center;font-size:22px;font-weight:800;margin-bottom:18px}
    .meta{display:flex;justify-content:space-between;align-items:center;margin:14px 0 20px;font-size:17px}
    .sender{font-size:16px;text-align:right;line-height:1.7}
    table{width:100%;border-collapse:collapse;font-size:22px;table-layout:fixed}
    th,td{border:1.5px solid #111;padding:14px 12px;vertical-align:middle}
    th{background:#f1f5f9;font-size:18px}
    td.date{width:26%;font-weight:800;text-align:center}.date.sunday{color:#dc2626;background:#fff1f2}.date.saturday{color:#2563eb;background:#eff6ff}
    td.time{width:18%;font-weight:900;text-align:center;font-size:24px}
    td.names{width:56%;font-weight:800;line-height:1.7}
    .empty{text-align:center;font-size:22px;padding:28px}
    .note{margin-top:22px;font-size:15px;line-height:1.7}
    .actions{display:flex;gap:12px;margin-top:22px}.actions button{padding:12px 18px;font-size:16px;border-radius:10px;border:1px solid #333;background:white;font-weight:700}.backBtn{background:#f8fafc!important}.printBtn{background:#e0f7ff!important}
    @media print{button{display:none}.sheet{padding:0}}
  </style></head><body>
    <div class="sheet">
      <div class="to">${withOnchu(f.name)}</div>
      <h1>訪問予定表</h1>
      <div class="period">${periodText}</div>
      <div class="meta"><div>FAX：${f.fax_number||'未登録'}</div><div>作成日：${new Date().getFullYear()}年${new Date().getMonth()+1}月${new Date().getDate()}日</div></div>
      <table><thead><tr><th>日付</th><th>時間</th><th>患者名</th></tr></thead><tbody>${rows}</tbody></table>
      
      <div class="sender">${(activeClinic()?.faxSender||'アロハ歯科\n訪問担当').replace(/\n/g,'<br/>')}</div>
      <div class="actions"><button class="backBtn" onclick="window.close(); setTimeout(()=>history.back(),100)">← アプリへ戻る</button><button class="printBtn" onclick="window.print()">印刷 / PDF保存</button></div>
    </div>
  </body></html>`;
  const w=window.open('','_blank');
  if(!w){setMsg('ポップアップがブロックされました');return;}
  w.document.write(html);
  w.document.close();
}

function jpWeekdayFromYmd(ymd:string){
  const d=new Date(ymd+'T00:00:00');
  return ['日','月','火','水','木','金','土'][d.getDay()];
}
function jpLongDateFromYmd(ymd:string){
  const [y,m,d]=ymd.split('-').map(Number);
  return `${y}年${m}月${d}日${jpWeekdayFromYmd(ymd)}曜日`;
}
function dailyReportRowsForDate(ymd:string){
  const list=selectedDateSchedules();
  const rows:{timeText:string;patientName:string;treatmentText:string;nextText:string;memoText:string;facilityName:string}[]=[];
  list.forEach(s=>{
    const facilityName=getFacility(s.facility_id)?.name || '';
    const names=s.patient_names&&s.patient_names.length?s.patient_names:[''];
    let firstVisible=true;
    names.forEach((name,index)=>{
      if(isPatientCanceled(s,name,index))return;
      const key=patientKeyFor(s,name,index);
      const p=s.patient_ids?.[index]?getPatient(s.patient_ids[index]):undefined;
      const patientName=(p?.name || name || '').trim();
      if(!patientName)return;
      rows.push({
        timeText:firstVisible?time(s.start_at):'',
        patientName,
        treatmentText:treatmentFor(s,name,index)||'',
        nextText:'',
        memoText:s.patient_memos?.[key] || '',
        facilityName
      });
      firstVisible=false;
    });
  });
  return rows;
}
function createDailyReportPdf(){
  const rows=dailyReportRowsForDate(selectedDate);
  const minRows=15;
  const allRows=[...rows];
  while(allRows.length<minRows){
    allRows.push({timeText:'',patientName:'',treatmentText:'',nextText:'',memoText:'',facilityName:''});
  }
  const rowHtml=allRows.map((r,i)=>`
    <tr>
      <td class="center">${i+1}</td>
      <td></td>
      <td class="center">${r.timeText}</td>
      <td>${r.patientName?`${r.patientName}　様`:''}</td>
      <td>${r.treatmentText}</td>
      <td>${r.nextText}</td>
      <td>${r.memoText}</td>
      <td>${r.facilityName}</td>
    </tr>
  `).join('');
  const html=`<!doctype html><html><head><meta charset="utf-8"/><title>${selectedDate} 診療日報</title><style>
    @page{size:A4 landscape;margin:7mm}
    body{font-family:-apple-system,BlinkMacSystemFont,'Noto Sans JP','Yu Gothic',Meiryo,sans-serif;color:#111;margin:0}
    .sheet{width:100%}
    .top{display:grid;grid-template-columns:1fr 1.1fr .8fr 1fr;align-items:start;gap:12px;margin-bottom:8px}
    .clinic{font-size:15px;font-weight:900;margin-top:6px}
    h1{text-align:center;font-size:30px;letter-spacing:5px;margin:6px 0 0}
    .sign{border:1.3px solid #111;width:120px;height:44px;margin:0 auto;text-align:center;font-size:13px}
    .brand{text-align:center;font-size:14px;font-weight:900;line-height:1.45}
    .date{font-size:15px;font-weight:900;margin:4px 0 4px}
    table{border-collapse:collapse;width:100%;table-layout:fixed;font-size:13px}
    th,td{border:1.1px solid #111;padding:3px 4px;height:21px;vertical-align:middle;line-height:1.15}
    th{background:#f8fafc;font-weight:900;text-align:center}
    .center{text-align:center}
    .no{width:36px}.count{width:42px}.time{width:52px}.patient{width:150px}.treat{width:120px}.next{width:120px}.memo{width:230px}.facility{width:165px}
    .bottom{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:0}
    .box{border:1.1px solid #111;height:58px;padding:6px;font-size:13px}
    .boxTitle{font-weight:900;margin-bottom:4px}
    .actions{margin-top:12px;display:flex;gap:10px}
    .actions button{padding:10px 16px;font-size:15px;border:1px solid #111;border-radius:8px;background:white;font-weight:900}
    @media print{.actions{display:none}}
  </style></head><body>
    <div class="sheet">
      <div class="top">
        <div class="clinic">担当医院：　アロハ歯科・矯正歯科　御中</div>
        <h1>診療日報</h1>
        <div class="sign">医師署名</div>
        <div class="brand">訪問歯科支援センター<br/>フロンティア</div>
      </div>
      <div class="date">${jpLongDateFromYmd(selectedDate)}</div>
      <table>
        <thead>
          <tr>
            <th class="no">項目</th><th class="count">回数</th><th class="time">時間</th><th class="patient">患者名</th><th class="treat">今回診療内容</th><th class="next">次回診療内容</th><th class="memo">メモ</th><th class="facility">施設名</th>
          </tr>
        </thead>
        <tbody>${rowHtml}</tbody>
      </table>
      <div class="bottom">
        <div class="box"><div class="boxTitle">今回診療件数</div>${rows.filter(r=>!["無料検診","担当者会議"].includes(r.treatmentText)).length}件<br/><span style="font-size:11px">※無料検診・担当者会議除外</span></div>
        <div class="box"><div class="boxTitle">摘要</div></div>
      </div>
      <div class="actions"><button onclick="window.close(); setTimeout(()=>history.back(),100)">← アプリへ戻る</button><button onclick="window.print()">印刷 / PDF保存</button></div>
    </div>
  </body></html>`;
  const w=window.open('','_blank');
  if(!w){setMsg('ポップアップがブロックされました');return;}
  w.document.write(html);
  w.document.close();
}

function CalendarDayDetail(){
  const list=selectedDateSchedules();
  return <div className='dayDetail' id='selected-date-route'>
    <div className='adminQuickActions' style={{marginBottom:10}}>
      <button className='primary' onClick={createDailyReportPdf}>📄 日報PDF</button>
    </div>
    <div className='adminQuickActions' style={{marginBottom:10}}><button className='secondary' onClick={()=>{const el=document.getElementById('calendar-top'); if(el)el.scrollIntoView({behavior:'smooth',block:'start'});}}>📅 カレンダーへ戻る</button></div><RouteSplitSchedulePage dateLabel={selectedDate} list={list} from='calendar'/>
  </div>
}


function TomorrowRouteSplitPage(){
  const list=tomorrowSchedules;
  return <RouteSplitSchedulePage dateLabel='明日' list={list} from='tomorrow'/>;
}


function nthWeekdayOfMonth(year:number,monthIndex:number,weekday:number,n:number){
  const d=new Date(year,monthIndex,1);
  const add=(weekday-d.getDay()+7)%7;
  return new Date(year,monthIndex,1+add+(n-1)*7);
}
function springEquinoxDay(year:number){
  // 1980-2099 approximate Japanese calendar formula
  return Math.floor(20.8431+0.242194*(year-1980)-Math.floor((year-1980)/4));
}
function autumnEquinoxDay(year:number){
  // 1980-2099 approximate Japanese calendar formula
  return Math.floor(23.2488+0.242194*(year-1980)-Math.floor((year-1980)/4));
}
function ymdKeyDate(d:Date){
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function japaneseHolidaysForYear(year:number){
  const map:Record<string,string>={};
  const add=(d:Date,name:string)=>{map[ymdKeyDate(d)]=name;};

  add(new Date(year,0,1),'元日');
  add(nthWeekdayOfMonth(year,0,1,2),'成人の日');
  add(new Date(year,1,11),'建国記念の日');
  add(new Date(year,1,23),'天皇誕生日');
  add(new Date(year,2,springEquinoxDay(year)),'春分の日');
  add(new Date(year,3,29),'昭和の日');
  add(new Date(year,4,3),'憲法記念日');
  add(new Date(year,4,4),'みどりの日');
  add(new Date(year,4,5),'こどもの日');
  add(nthWeekdayOfMonth(year,6,1,3),'海の日');
  add(new Date(year,7,11),'山の日');
  add(nthWeekdayOfMonth(year,8,1,3),'敬老の日');
  add(new Date(year,8,autumnEquinoxDay(year)),'秋分の日');
  add(nthWeekdayOfMonth(year,9,1,2),'スポーツの日');
  add(new Date(year,10,3),'文化の日');
  add(new Date(year,10,23),'勤労感謝の日');

  // 振替休日: holiday on Sunday -> next non-holiday weekday
  const baseKeys=Object.keys(map).sort();
  baseKeys.forEach(k=>{
    const d=new Date(k+'T00:00:00');
    if(d.getDay()===0){
      const sub=new Date(d);
      do{sub.setDate(sub.getDate()+1);}while(map[ymdKeyDate(sub)]);
      map[ymdKeyDate(sub)]='振替休日';
    }
  });

  // 国民の休日: a weekday between two holidays
  const start=new Date(year,0,1), end=new Date(year,11,31);
  for(const d=new Date(start); d<=end; d.setDate(d.getDate()+1)){
    const key=ymdKeyDate(d);
    if(map[key]||d.getDay()===0||d.getDay()===6)continue;
    const prev=new Date(d); prev.setDate(prev.getDate()-1);
    const next=new Date(d); next.setDate(next.getDate()+1);
    if(map[ymdKeyDate(prev)]&&map[ymdKeyDate(next)])map[key]='国民の休日';
  }
  return map;
}
function japaneseHolidayName(d:Date){
  return japaneseHolidaysForYear(d.getFullYear())[ymdKeyDate(d)] || '';
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
      {['日','月','火','水','木','金','土'].map((w,idx)=><div key={w} style={{color:idx===0?'#dc2626':idx===6?'#2563eb':'inherit',fontWeight:900}}>{w}</div>)}
    </div>
    <div className='monthGrid'>
      {days.map((day,i)=>{
        if(!day) return <div key={i} className='dayCell empty'></div>;
        const list=schedulesForDate(day);
        const isToday=isSameYmd(day,new Date());
        const dow=day.getDay();
        const holiday=japaneseHolidayName(day);
        const isSunday=dow===0;
        const isSaturday=dow===6;
        const dayStyle={
          background:holiday?'#fff7ed':isSunday?'#fff1f2':isSaturday?'#eff6ff':undefined,
          borderColor:holiday?'#fb923c':isSunday?'#fda4af':isSaturday?'#93c5fd':undefined
        } as React.CSSProperties;
        const dayColor=holiday||isSunday?'#dc2626':isSaturday?'#2563eb':'inherit';
        return <button key={i} className={'dayCell '+(isToday?'todayCell ':'')+(holiday?'holidayCell ':'')+(isSunday?'sundayCell ':'')+(isSaturday?'saturdayCell ':'')} style={dayStyle} onClick={()=>selectCalendarDateAndScroll(day)}>
          <div className='dayNum' style={{color:dayColor,fontWeight:900}}>{day.getDate()}{holiday&&<span style={{marginLeft:4,fontSize:10,padding:'1px 4px',borderRadius:999,background:'#fed7aa',color:'#c2410c'}}>祝</span>}{isSunday&&!holiday&&<span style={{marginLeft:4,fontSize:10,color:'#dc2626'}}>日</span>}{isSaturday&&!holiday&&<span style={{marginLeft:4,fontSize:10,color:'#2563eb'}}>土</span>}</div>
          {holiday&&<div style={{fontSize:10,fontWeight:900,color:'#c2410c',marginBottom:2,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{holiday}</div>}
          {list.slice(0,3).map(s=><div key={s.id} className='daySchedule'>
            <span className={(s.route_no||1)===2?'miniRouteBadge r2':'miniRouteBadge r1'}>R{s.route_no||1}</span>{time(s.start_at)} {getFacility(s.facility_id)?.name || ''}
          </div>)}
          {list.length>3&&<div className='more'>+{list.length-3}件</div>}
        </button>
      })}
    </div>
  </div>
}


function nextVisitSchedule(){
  return todaySchedules.find(s=>schedulePatientCount(s)>scheduleCompletedCount(s)) || todaySchedules[0];
}
function nextVisitNames(s?:Schedule){
  if(!s)return '';
  const names=s.patient_names&&s.patient_names.length?s.patient_names:[];
  return names.slice(0,3).join('、') + (names.length>3?' ほか':'');
}
function scrollToNextVisit(){
  const s=nextVisitSchedule();
  if(!s)return;
  setTab('today');
  setTimeout(()=>scrollToSchedule(s),180);
}
function openEasyPatientSearch(){
  setTab('patients');
  setTimeout(()=>{const el=document.querySelector('input[placeholder*="検索"]') as HTMLElement | null; if(el)el.focus();},200);
}
function openPhotoPatientRegister(){
  setTab('patients');
  setPatientForm(emptyPatient);
  setShowPatientForm(true);
  setTimeout(()=>{const el=document.querySelector('.photoExtractBox') as HTMLElement | null; if(el)el.scrollIntoView({behavior:'smooth',block:'start'});},200);
}

function routeSchedules(route:number){
  return todaySchedules.filter(s=>(s.route_no||1)===route);
}
function routeCount(route:number){
  return cardCount(routeSchedules(route));
}
function routeCompleted(route:number){
  return routeSchedules(route).reduce((sum,s)=>sum+scheduleCompletedCount(s),0);
}
function routeRemaining(route:number){
  return Math.max(0,routeCount(route)-routeCompleted(route));
}
function nextRouteVisit(route:number){
  const list=routeSchedules(route);
  return list.find(s=>schedulePatientCount(s)>scheduleCompletedCount(s)) || list[0];
}
function openRoute(route:number){
  setTab(route===2?'route2':'route1');
}

function scheduleAllDone(s:Schedule){
  const names=s.patient_names&&s.patient_names.length?s.patient_names:[''];
  const targets=names.filter((name,index)=>isCountTarget(s,name,index));
  if(targets.length===0)return false;
  return names.every((name,index)=>!isCountTarget(s,name,index)||isPatientCompleted(s,name,index));
}

async function completeAllForSchedule(s:Schedule){
  const names=s.patient_names&&s.patient_names.length?s.patient_names:[''];
  const next:Record<string,boolean>={...(s.completed_patients||{})};
  names.forEach((name,index)=>{
    if(isCountTarget(s,name,index)){
      next[patientKeyForCompletion(s,name,index)]=true;
    }
  });
  if(demoMode){
    setSchedules(prev=>prev.map(x=>x.id===s.id?{...x,completed_patients:next,completed:true}:x));
    return;
  }
  const {error}=await supabase.from('schedules').update({
    completed_patients:next,
    completed:true,
    completed_at:new Date().toISOString()
  }).eq('id',s.id);
  if(error)return setMsg('エラー：'+error.message);
  setSchedules(prev=>prev.map(x=>x.id===s.id?{...x,completed_patients:next,completed:true}:x));
  setMsg('全員完了にしました');
}

function VisitCompletionSheet({list,route}:{list:Schedule[];route:number}){
  if(!list.length)return <div className='visitSheet emptySheet'>ルート{route}の予定はありません。</div>;
  const next=list.find(s=>!scheduleAllDone(s));
  return <div className='visitSheet'>
    <div className='visitSheetHeader'>
      <div>
        <div className='easyLabel'>訪問完了シート</div>
        <h2>ルート{route}</h2>
      </div>
      <span className='badge'>{cardCount(list)}件</span>
    </div>
    {next&&<div className='nextFacilityBanner'>
      次に行く施設：<b>{time(next.start_at)}　{getFacility(next.facility_id)?.name}</b>
    </div>}
    {list.map(s=>{
      const f=getFacility(s.facility_id);
      const names=s.patient_names&&s.patient_names.length?s.patient_names:[''];
      const allDone=scheduleAllDone(s);
      return <div key={s.id} className={'facilitySheet '+(allDone?'sheetDone':'')}>
        <div className='facilitySheetTop' onClick={()=>scrollToSchedule(s)}>
          <div>
            <b>{time(s.start_at)}　{f?.name}</b>
            <div className='small'>R{s.route_no||1} / {scheduleCompletedCount(s)}/{schedulePatientCount(s)} 完了</div>
          </div>
          <button className='mini' onClick={(e)=>{e.stopPropagation();scrollToSchedule(s);}}>開く</button>
        </div>

        <div className='patientChecklist'>
          {names.map((name,index)=>{
            const done=isPatientCompleted(s,name,index);
            const canceled=isPatientCanceled(s,name,index);
            const nonCount=!isCountTarget(s,name,index);
            const treatment=patientTreatmentText(s,name,index);
            return <div key={`${name}-${index}`} className={'checkRow '+(done?'done ':'')+(canceled?'canceled ':'')+(nonCount?'nonCount ':'')}>
              <button className='checkMain' disabled={nonCount||canceled} onClick={()=>togglePatientComplete(s,name,index)}>
                <span>{canceled?'×':done?'✓':nonCount?'—':'○'}</span>
                <b>{name}</b>
              </button>
              <div className='checkTreatment'>{treatment}{nonCount&&<em>対象外</em>}</div>
              <div className='checkActions'>
                <button className='mini' onClick={()=>togglePatientCancel(s,name,index)}>{canceled?'解除':'取消'}</button>
                <button className='mini' onClick={()=>createNextSchedule(s,name,index)}>次回</button>
              </div>
            </div>
          })}
        </div>

        <button className='primary fullDoneBtn' disabled={allDone} onClick={()=>completeAllForSchedule(s)}>
          {allDone?'完了済み':'この施設を全員完了'}
        </button>
      </div>
    })}
  </div>
}


function StickyNextVisit({list}:{list:Schedule[]}){
  const next=list.find(s=>schedulePatientCount(s)>scheduleCompletedCount(s)) || list[0];
  if(!next)return null;
  const f=getFacility(next.facility_id);
  return <div className='stickyNextVisit'>
    <div>
      <span>次の訪問</span>
      <b>{time(next.start_at)}　{f?.name}</b>
    </div>
    <button className='mini' onClick={()=>scrollToSchedule(next)}>開く</button>
  </div>
}

function RouteDashboard({route}:{route:number}){
  const list=routeSchedules(route);
  const count=routeCount(route);
  const done=routeCompleted(route);
  const rest=routeRemaining(route);
  const next=nextRouteVisit(route);
  return <div className={'routeOnlyPage routeOnly'+route}>
    <div className='routeOnlyHeader'>
      <div>
        <div className='easyLabel'>本日</div>
        <h2>ルート{route}</h2>
        <div className='small'>このルートだけを表示しています</div>
      </div>
      <button className='mini' onClick={()=>setTab('home')}>ホーム</button>
    </div>
    <div className='easyStats'>
      <div><b>{count}</b><span>件</span></div>
      <div><b>{done}</b><span>完了</span></div>
      <div><b>{rest}</b><span>残り</span></div>
    </div>
    <StickyNextVisit list={list}/>
    <VisitCompletionSheet list={list} route={route}/>
    {next&&<div className='nextVisitBox routeNextBox'>
      <div className='easyLabel'>次の訪問</div>
      <h3>{time(next.start_at)}　{getFacility(next.facility_id)?.name}</h3>
      <div className='nextNames'>{nextVisitNames(next)}</div>
      <button className='primary bigAction' onClick={()=>scrollToSchedule(next)}>この予定を開く</button>
    </div>}
    <RouteBox list={list} title={`🚗 ルート${route}`} count={count} id={`route-${route}-only`}/>
    <div className='grid2 actionRow'>
      <button className='primary' onClick={()=>copyList(list,`本日のルート${route}`)}>ルート{route}をコピー</button>
      <button className='secondary' onClick={()=>setTab(route===1?'route2':'route1')}>ルート{route===1?'2':'1'}を見る</button>
    </div>
    {renderScheduleCards(list,{from:route===1?'route1':'route2'})}
  </div>
}

function CancelReasonModal(){
  if(!cancelModal)return null;
  const {s,name,index}=cancelModal;
  const reasons=['体調不良','入院','不在','家族都合','施設都合','その他'];
  return <div className='modalBackdrop' onClick={()=>setCancelModal(null)}>
    <div className='cancelModalBox' onClick={e=>e.stopPropagation()}>
      <h2>キャンセル理由</h2>
      <div className='small'>{name} 様</div>
      <div className='cancelReasonGrid'>
        {reasons.map(r=><button key={r} className='secondary' onClick={()=>confirmPatientCancel(s,name,index,r)}>{r}</button>)}
      </div>
      <button className='secondary' onClick={()=>setCancelModal(null)}>閉じる</button>
    </div>
  </div>
}

function adminMonthSchedules(){
  const now=new Date();
  return schedules.filter(s=>{
    const d=new Date(s.start_at);
    return d.getFullYear()===now.getFullYear() && d.getMonth()===now.getMonth();
  });
}
function adminCountTargets(list:Schedule[]){
  return list.reduce((sum,s)=>sum+schedulePatientCount(s),0);
}
function adminCompletedTargets(list:Schedule[]){
  return list.reduce((sum,s)=>sum+scheduleCompletedCount(s),0);
}
function adminCancelCount(list:Schedule[]){
  return list.reduce((sum,s)=>{
    const names=s.patient_names&&s.patient_names.length?s.patient_names:[''];
    return sum+names.filter((name,index)=>isPatientCanceled(s,name,index)).length;
  },0);
}
function adminFreeCheckCount(list:Schedule[]){
  return list.reduce((sum,s)=>{
    const names=s.patient_names&&s.patient_names.length?s.patient_names:[''];
    return sum+names.filter((name,index)=>isNonCountTreatmentText(patientTreatmentText(s,name,index))).length;
  },0);
}
function unlockAdmin(){
  const expected=(typeof window!=='undefined' && localStorage.getItem('frontier_admin_pin')) || '1234';
  const input=typeof document!=='undefined' ? document.getElementById('admin-pin-input') as HTMLInputElement | null : null;
  const value=input?.value || '';
  if(value===expected){
    setAdminUnlocked(true);
    if(input)input.value='';
    setMsg('管理者モードを開きました');
  }else{
    setMsg('PINが違います');
  }
}
function AdminGate({children}:{children:any}){
  if(clinicUnlocked)return <div className='adminGate'><h2>管理画面は利用できません</h2><div className='small'>医院ログイン中は、患者・施設・予定の閲覧編集のみ利用できます。</div><button className='secondary' onClick={()=>setTab('home')}>戻る</button></div>;
  if(adminUnlocked)return children;
  return <div className='adminGate'>
    <h2>管理者モード</h2>
    <div className='small'>管理者PINを入力してください。初期PINは 1234 です。</div>
    <input id='admin-pin-input' type='password' inputMode='numeric' autoComplete='one-time-code' placeholder='PIN' onKeyDown={e=>{if(e.key==='Enter')unlockAdmin()}}/>
    <button className='primary' onClick={unlockAdmin}>開く</button>
    <button className='secondary' onClick={()=>setTab('home')}>戻る</button>
  </div>
}

function unlockClinicPortal(){
  const loginEl=document.getElementById('clinic-login-id-field') as HTMLInputElement | null;
  const passEl=document.getElementById('clinic-login-password-field') as HTMLInputElement | null;
  const legacyPinEl=document.getElementById('clinic-login-pin-field') as HTMLInputElement | null;
  const login=(loginEl?.value || clinicLoginInput || '').trim().toLowerCase();
  const pass=(passEl?.value || clinicPasswordInput || legacyPinEl?.value || clinicPinInput || '').trim();
  const matched=clinics.find(c=>
    [c.id,c.shortName,c.portalLoginId].filter(Boolean).map(x=>String(x).toLowerCase()).includes(login)
    && pass===(c.portalPassword||c.portalPin||'2026')
  );
  if(matched){
    saveClinicsLocal(clinics,matched.id);
    setFacilities([]);
    setPatients([]);
    setSchedules([]);
    load(matched.id);
    setClinicUnlocked(true);
    if(loginEl)loginEl.value='';
    if(passEl)passEl.value='';
    if(legacyPinEl)legacyPinEl.value='';
    setClinicLoginInput('');
    setClinicPasswordInput('');
    setClinicPinInput('');
    setTab('home');
    setMsg(`${matched.name} としてログインしました`);
  }else{
    setMsg('IDまたはパスワードが違います');
  }
}
function saveClinicPortalPin(){
  if(!clinicPortalPin.trim())return setMsg('医院用PINを入力してください');
  localStorage.setItem('frontier_clinic_portal_pin',clinicPortalPin.trim());
  setMsg('医院用PINを保存しました');
}
function clinicDateSchedules(){
  const [y,m,day]=selectedDate.split('-').map(Number);
  return sortedSchedules.filter(s=>{
    const d=new Date(s.start_at);
    return d.getFullYear()===y && d.getMonth()+1===m && d.getDate()===day;
  });
}
function ClinicScheduleReadOnly({list}:{list:Schedule[]}){
  return <div className='adminCard'>
    <h3>{selectedDate} の予定</h3>
    {list.length===0&&<div className='small'>予定はありません。</div>}
    {list.map(s=>{
      const f=getFacility(s.facility_id);
      const names=s.patient_names&&s.patient_names.length?s.patient_names:[''];
      return <div className='item' key={s.id}>
        <b>{time(s.start_at)}　{f?.name||'居宅'}</b>
        <div className='small'>ルート{s.route_no||1}</div>
        <div>{names.map((name,index)=>{
          if(isPatientCanceled(s,name,index))return null;
          return <div key={`${s.id}-${index}`}>・{name} 様　{treatmentFor(s,name,index)}</div>
        })}</div>
        {s.memo&&<div className='small'>メモ：{s.memo}</div>}
      </div>
    })}
  </div>
}
function ClinicPortal(){
  if(!clinicUnlocked){
    return <main className='wrap'>
      <section className='head appHeader'>
        <div className='brandHeader'><img src='/apple-touch-icon.png' alt='FRONTIER OS' className='headerAppIcon'/><h1>医院専用ログイン</h1></div>
      </section>
      <section className='card'>
        <h2>医院専用ログイン</h2>
        <div className='small'>医院ごとのIDとパスワードでログインできます。ログイン後は患者・施設・予定を閲覧編集できます。管理画面は表示されません。</div>
        <label>医院ID</label>
        <input id='clinic-login-id-field' defaultValue='' autoComplete='username' placeholder='例：takata' onKeyDown={e=>{if(e.key==='Enter')unlockClinicPortal()}}/>
        <label>パスワード</label>
        <input id='clinic-login-password-field' type='password' defaultValue='' autoComplete='current-password' placeholder='パスワード' onKeyDown={e=>{if(e.key==='Enter')unlockClinicPortal()}}/>
        <button className='primary' onClick={unlockClinicPortal}>ログイン</button>
        <button className='secondary' onClick={()=>setTab('home')}>戻る</button>
      </section>
    </main>
  }
  return <main className='wrap'>
    <section className='head appHeader'>
      <div className='brandHeader'><img src='/apple-touch-icon.png' alt='FRONTIER OS' className='headerAppIcon'/><h1>医院ログイン中</h1></div>
      <button className='mini' onClick={()=>{setClinicUnlocked(false);setTab('clinicPortal')}}>ログアウト</button>
    </section>
    <section className='card'>
      <h2>{activeClinic()?.name||'医院'} でログイン中</h2>
      <div className='small'>通常画面で患者・施設・予定を閲覧編集できます。管理画面は利用できません。</div>
      <button className='primary' onClick={()=>setTab('home')}>通常画面へ進む</button>
    </section>
  </main>
}

function AdminMenu(){
  return <div className='adminMenu'>
    <button onClick={()=>setTab('admin')}>📊 ダッシュボード</button>
    <button onClick={()=>setTab('adminBilling')}>💰 請求</button>
    <button onClick={()=>setTab('adminBillingSettings')}>①② 設定</button>
    <button onClick={()=>setTab('adminStaff')}>👥 スタッフ</button>
    <button onClick={()=>setTab('adminFax')}>📠 FAX</button>
    <button onClick={()=>setTab('adminReports')}>📈 レポート</button>
    <button onClick={()=>setTab('adminAI')}>🤖 AIチェック</button>
    <button onClick={()=>setTab('adminClinics')}>🏥 医院管理</button>
    <button onClick={()=>setTab('clinicPortal')}>🏥 医院ログイン</button>
    <button onClick={()=>setTab('adminSettings')}>⚙️ 設定</button>
  </div>
}
function AdminDashboard(){
  const month=adminMonthSchedules();
  const todayList=todaySchedules;
  return <AdminGate>
    <div className='adminPage'>
      <div className='adminHeader'><div><div className='easyLabel'>ADMIN</div><h2>管理者ダッシュボード</h2></div><button className='mini' onClick={()=>setTab('home')}>スタッフ画面</button></div>
      <AdminMenu/>
      <div className='adminQuickGrid'>
        <button className='primary' onClick={()=>setTab('adminBilling')}>💰 請求管理へ</button>
        <button className='secondary' onClick={()=>setTab('adminBillingSettings')}>①②設定へ</button><button className='secondary' onClick={()=>setTab('adminReports')}>📈 売上分析へ</button><button className='secondary' onClick={()=>setTab('adminClinics')}>🏥 医院管理へ</button>
      </div>
      <div className='adminStats'>
        <div><b>{adminCountTargets(todayList)}</b><span>本日件数</span></div>
        <div><b>{adminCompletedTargets(todayList)}</b><span>本日完了</span></div>
        <div><b>{adminCountTargets(month)}</b><span>今月件数</span></div>
        <div><b>{patients.length}</b><span>患者数</span></div>
        <div><b>{facilities.length}</b><span>施設数</span></div>
        <div><b>{adminCancelCount(month)}</b><span>今月キャンセル</span></div>
      </div>
      <div className='adminCard'>
        <h3>予定入れ忘れチェック</h3>
        <div className='small'>訪問頻度に対して、今月の予定が不足している患者を表示します。無料検診・担当者会議・キャンセルは除外します。</div>
        <div className='billingRows'>
          {missedSchedulePatientsForMonth().slice(0,12).map(p=><div key={p.id}><span>{p.name} <small>{getFacility(p.facility_id)?.name||'居宅'}</small></span><b>{patientScheduleStatusLabel(p)}</b></div>)}
          {missedSchedulePatientsForMonth().length===0&&<div><span>不足患者なし</span><b>OK</b></div>}
        </div>
      </div>
      <div className='adminCard'>
        <h3>月末請求の準備</h3>
        <div className='small'>訪問件数①②・オペレーションチャージ①②・新規情報提供料・消費税を反映した請求書を作成できます。</div>
        <button className='primary' onClick={()=>setTab('adminBilling')}>請求画面へ</button>
      </div>
      <div className='adminCard'>
        <h3>Ver.1.1 完成チェック</h3>
        <div className='billingRows'>
          <div><span>予定管理</span><b>完了</b></div>
          <div><span>日報PDF</span><b>完了</b></div>
          <div><span>請求書PDF</span><b>完了</b></div>
          <div><span>①②設定</span><b>完了</b></div>
          <div><span>新患請求ON/OFF</span><b>完了</b></div>
          <div><span>バックアップ</span><b>完了</b></div>
        </div>
      </div>
    </div>
  </AdminGate>
}
function AdminBilling(){
  const month=adminMonthSchedules();
  const count=adminCountTargets(month);
  const free=adminFreeCheckCount(month);
  const cancel=adminCancelCount(month);
  return <AdminGate>
    <div className='adminPage'>
      <div className='adminHeader'><h2>💰 請求</h2><button className='mini' onClick={()=>setTab('admin')}>戻る</button></div>
      <AdminMenu/>
      <div className='adminCard'>
        <h3>今月の請求集計</h3>
        <div className='billingRows'>
          <div><span>訪問件数</span><b>{count}</b></div>
          <div><span>無料検診・担当者会議</span><b>{free}</b></div>
          <div><span>キャンセル</span><b>{cancel}</b></div>
        </div>
        <div className='small'>次Sprintで訪問件数①/訪問件数②/オペレーションチャージ①/オペレーションチャージ②の単価設定と請求書PDF出力を追加します。</div>
      </div>
    </div>
  </AdminGate>
}
function AdminStaff(){
  return <AdminGate><div className='adminPage'><div className='adminHeader'><h2>👥 スタッフ</h2><button className='mini' onClick={()=>setTab('admin')}>戻る</button></div><AdminMenu/><div className='adminCard'>スタッフ別件数・給与計算をここに追加予定です。</div></div></AdminGate>
}
function AdminFax(){
  return <AdminGate><div className='adminPage'><div className='adminHeader'><h2>📠 FAX管理</h2><button className='mini' onClick={()=>setTab('admin')}>戻る</button></div><AdminMenu/><div className='adminCard'>施設別FAX設定・送信履歴をここにまとめます。</div></div></AdminGate>
}
function createPatientChartPdf(p:Patient){
  const hist=sortedSchedules.filter(s=>(s.patient_ids||[]).includes(p.id)||(s.patient_names||[]).includes(p.name)).slice(-20).reverse();
  const rows=hist.map(s=>`<tr><td>${fmt(s.start_at)}</td><td>${getFacility(s.facility_id)?.name||''}</td><td>${s.treatment||''}</td><td>${s.memo||''}</td></tr>`).join('');
  const html=`<!doctype html><html><head><meta charset="utf-8"/><title>${p.name} カルテ</title><style>
    @page{size:A4;margin:12mm}
    body{font-family:-apple-system,BlinkMacSystemFont,'Noto Sans JP',Meiryo,sans-serif;color:#111}
    h1{text-align:center}
    table{width:100%;border-collapse:collapse}
    td,th{border:1px solid #111;padding:6px;font-size:13px}
    .box{border:1px solid #111;padding:10px;margin:8px 0}
    .actions{margin:14px 0;display:flex;gap:10px}
    .actions button{padding:10px 16px;font-size:15px;border:1px solid #111;border-radius:8px;background:white;font-weight:900}
    @media print{.actions{display:none}}
  </style></head><body>
    <div class="actions">
      <button onclick="window.close(); setTimeout(()=>history.back(),100)">← アプリへ戻る</button>
      <button onclick="window.print()">印刷 / PDF保存</button>
    </div>
    <h1>患者カルテ</h1>
    <div class="box"><b>${p.name} 様</b><br/>施設：${getFacility(p.facility_id)?.name||'居宅'}<br/>電話：${p.phone||''}<br/>ケアマネ：${p.care_manager||''}</div>
    <div class="box"><b>既往症・注意すべき疾患</b><br/>${p.medical_history||''}</div>
    <div class="box"><b>注意事項・メモ</b><br/>${p.memo||''}</div>
    <table><thead><tr><th>日付</th><th>施設</th><th>処置</th><th>メモ</th></tr></thead><tbody>${rows}</tbody></table>
  </body></html>`;
  const w=window.open('','_blank');
  if(!w){setMsg('ポップアップがブロックされました');return;}
  w.document.write(html);
  w.document.close();
}

function AdminReports(){
  const month=adminMonthSchedules();
  const b=calculateBilling();
  const subtotal=b.amount;
  const tax=Math.round(subtotal*0.1);
  const total=subtotal+tax;
  const byFacility=facilities.map(f=>{
    const list=month.filter(s=>s.facility_id===f.id);
    return {name:f.name,count:adminCountTargets(list),schedule:list.length};
  }).filter(x=>x.schedule||x.count).sort((a,b)=>b.count-a.count).slice(0,12);
  const byTreatment:Record<string,number>={};
  month.forEach(s=>{
    const names=s.patient_names&&s.patient_names.length?s.patient_names:[''];
    names.forEach((name,index)=>{
      if(!isCountTarget(s,name,index)||isPatientCanceled(s,name,index))return;
      const t=treatmentFor(s,name,index)||s.treatment||'未設定';
      byTreatment[t]=(byTreatment[t]||0)+1;
    });
  });
  const treatments=Object.entries(byTreatment).sort((a,b)=>b[1]-a[1]).slice(0,10);
  return <AdminGate><div className='adminPage'>
    <div className='adminHeader'><h2>📈 売上・分析レポート</h2><button className='mini' onClick={()=>setTab('admin')}>戻る</button></div>
    <AdminMenu/>
    <div className='adminStats'>
      <div><b>{month.length}</b><span>今月予定</span></div>
      <div><b>{adminCountTargets(month)}</b><span>診療対象</span></div>
      <div><b>{yen(subtotal)}</b><span>税抜売上</span></div>
      <div><b>{yen(tax)}</b><span>消費税</span></div>
      <div><b>{yen(total)}</b><span>税込売上</span></div>
      <div><b>{adminCancelCount(month)}</b><span>キャンセル</span></div>
    </div>
    <div className='adminCard'>
      <h3>施設別件数</h3>
      <div className='billingRows'>{byFacility.map(x=><div key={x.name}><span>{x.name}</span><b>{x.count}件</b></div>)}</div>
    </div>
    <div className='adminCard'>
      <h3>診療内容ランキング</h3>
      <div className='billingRows'>{treatments.map(([name,count])=><div key={name}><span>{name}</span><b>{count}件</b></div>)}</div>
    </div>
  </div></AdminGate>
}
function AdminAI(){
  const suggestions=aiScheduleSuggestions();
  return <AdminGate><div className='adminPage'>
    <div className='adminHeader'><h2>🤖 AIチェック</h2><button className='mini' onClick={()=>setTab('admin')}>戻る</button></div>
    <AdminMenu/>
    <div className='adminCard'>
      <h3>予定入れ忘れAIチェック</h3>
      <div className='small'>訪問頻度・今月回数・今週回数・前回訪問から、予定追加が必要そうな患者を理由付きで表示します。</div>
      <div className='billingRows'>
        {suggestions.slice(0,30).map(x=><div key={x.p.id}>
          <span><b>{x.level==='高'?'🔴':x.level==='中'?'🟡':'⚪'} {x.p.name}</b><br/><small>{getFacility(x.p.facility_id)?.name||'居宅'} / {x.reason}</small></span>
          <button className='mini' onClick={()=>{openPatient(x.p);setTab('patients')}}>確認</button>
        </div>)}
        {suggestions.length===0&&<div><span>大きな予定不足はありません</span><b>OK</b></div>}
      </div>
    </div>
    <div className='adminCard'>
      <h3>患者メモAI要約の使い方</h3>
      <div className='small'>患者詳細を開くと、既往症・過去メモ・診療履歴から「注意点」「義歯」「次回やること」を自動要約します。</div>
    </div>
  </div></AdminGate>
}

function exportFrontierBackup(){
  const data={
    version:FRONTIER_VERSION,
    build:FRONTIER_BUILD,
    exported_at:new Date().toISOString(),
    facilities,
    patients,
    schedules,
    settings:{
      treatments:treatmentOptions,
      adminUnitPrices,
      billingFacilityTypes,
      billingPatientTypes,
      newPatientInfoFeePrice,
      newPatientInfoFeeEnabled
    }
  };
  const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;
  a.download=`frontier_aloha_backup_${new Date().toISOString().slice(0,10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  setMsg('バックアップJSONを作成しました');
}
function importFrontierLocalSettings(file:File){
  const reader=new FileReader();
  reader.onload=()=>{
    try{
      const data=JSON.parse(String(reader.result||'{}'));
      const s=data.settings||{};
      if(Array.isArray(s.treatments)){setTreatmentOptions(s.treatments);localStorage.setItem('frontier_treatments',JSON.stringify(s.treatments));}
      if(s.adminUnitPrices){setAdminUnitPrices(s.adminUnitPrices);localStorage.setItem('frontier_admin_prices',JSON.stringify({...s.adminUnitPrices,infoFee:s.newPatientInfoFeePrice||newPatientInfoFeePrice}));}
      if(s.billingFacilityTypes){setBillingFacilityTypes(s.billingFacilityTypes);localStorage.setItem('frontier_billing_facility_types',JSON.stringify(s.billingFacilityTypes));}
      if(s.billingPatientTypes){setBillingPatientTypes(s.billingPatientTypes);localStorage.setItem('frontier_billing_patient_types',JSON.stringify(s.billingPatientTypes));}
      if(typeof s.newPatientInfoFeePrice==='number')setNewPatientInfoFeePrice(s.newPatientInfoFeePrice);
      if(s.newPatientInfoFeeEnabled){setNewPatientInfoFeeEnabled(s.newPatientInfoFeeEnabled);localStorage.setItem('frontier_new_patient_info_fee_enabled',JSON.stringify(s.newPatientInfoFeeEnabled));}
      setMsg('ローカル設定を復元しました');
    }catch(e){
      setMsg('復元に失敗しました');
    }
  };
  reader.readAsText(file);
}

async function geocodeClinicInput(inputId:string,latId:string,lngId:string){
  const addressEl=document.getElementById(inputId) as HTMLInputElement | HTMLTextAreaElement | null;
  const latEl=document.getElementById(latId) as HTMLInputElement | null;
  const lngEl=document.getElementById(lngId) as HTMLInputElement | null;
  const address=(addressEl?.value||'').trim();
  if(!address)return setMsg('住所を入力してください');
  const loc=await geocodeAddress(address);
  if(!loc)return;
  if(latEl)latEl.value=String(loc.lat);
  if(lngEl)lngEl.value=String(loc.lng);
  setMsg('出発/終了地点の座標を取得しました');
}

function AdminClinics(){
  function resetClinicForm(){
    setClinicForm({id:'',name:'',shortName:'',color:'#0284c7',invoiceRecipient:'',faxSender:'',portalPin:'2026',portalLoginId:'',portalPassword:'',startAddress:'',endAddress:''});
  }
  function editClinic(c:Clinic){
    setClinicForm(c);
    setMsg(`${c.name} を編集中です`);
  }
  function valueOf(id:string){
    const el=document.getElementById(id) as HTMLInputElement | HTMLTextAreaElement | null;
    return (el?.value||'').trim();
  }
  function saveClinicFromDom(){
    const name=valueOf('clinic-name-input');
    if(!name)return setMsg('医院名を入力してください');
    const oldId=clinicForm.id;
    const shortName=valueOf('clinic-short-input') || name;
    const id=oldId || safeClinicId(shortName||name);
    const nextClinic:Clinic={
      id,
      name,
      shortName,
      color:valueOf('clinic-color-input') || '#0284c7',
      invoiceRecipient:valueOf('clinic-invoice-input') || `${name}　御中`,
      faxSender:valueOf('clinic-fax-input') || `${name}\n訪問担当`,
      portalPin:valueOf('clinic-pin-input') || '2026',
      portalLoginId:valueOf('clinic-login-id-input') || id,
      portalPassword:valueOf('clinic-password-input') || valueOf('clinic-pin-input') || '2026',
      startAddress:valueOf('clinic-start-address-input'),
      startLat:Number(valueOf('clinic-start-lat-input')||0)||undefined,
      startLng:Number(valueOf('clinic-start-lng-input')||0)||undefined,
      endAddress:valueOf('clinic-end-address-input'),
      endLat:Number(valueOf('clinic-end-lat-input')||0)||undefined,
      endLng:Number(valueOf('clinic-end-lng-input')||0)||undefined,
      memo:valueOf('clinic-memo-input')
    };
    const exists=clinics.some(c=>c.id===id);
    const next=exists?clinics.map(c=>c.id===id?nextClinic:c):[...clinics,nextClinic];
    saveClinicsLocal(next,id);
    resetClinicForm();
    setMsg('医院設定を保存しました');
  }
  function removeClinic(id:string){
    if(id==='aloha')return setMsg('アロハ歯科は削除できません');
    if(!confirm('この医院設定を削除しますか？患者データは削除されません。'))return;
    const next=clinics.filter(c=>c.id!==id);
    saveClinicsLocal(next,next[0]?.id||'aloha');
    setMsg('医院設定を削除しました');
  }
  function clinicCounts(id:string){
    return {
      patients:patients.filter(p=>(p.clinic_id||'aloha')===id).length,
      facilities:facilities.filter(f=>(f.clinic_id||'aloha')===id).length,
      schedules:schedules.filter(s=>(s.clinic_id||'aloha')===id).length
    };
  }
  const formKey=clinicForm.id || 'new-clinic-form';
  return <AdminGate><div className='adminPage'>
    <div className='adminHeader'><h2>🏥 医院管理</h2><button className='mini' onClick={()=>setTab('admin')}>戻る</button></div>
    <AdminMenu/>
    <div className='adminCard'>
      <h3>現在の医院</h3>
      <label>医院切替</label>
      <select value={activeClinicId} onChange={e=>switchClinic(e.target.value)}>
        {clinics.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      <div className='small'>患者・施設・予定は選択中の医院だけ表示します。</div>
    </div>
    <div className='adminCard' key={formKey}>
      <h3>{clinicForm.id?'医院を編集':'医院を追加'}</h3>
      <label>医院名</label><input id='clinic-name-input' defaultValue={clinicForm.name||''} placeholder='例：たかた歯科医院'/>
      <label>短縮名</label><input id='clinic-short-input' defaultValue={clinicForm.shortName||''} placeholder='例：TAKATA'/>
      <label>テーマカラー</label><input id='clinic-color-input' defaultValue={clinicForm.color||'#0284c7'} placeholder='#0284c7'/>
      <label>請求書宛名</label><input id='clinic-invoice-input' defaultValue={clinicForm.invoiceRecipient||''} placeholder='例：たかた歯科医院　御中'/>
      <label>FAX送信名義</label><textarea id='clinic-fax-input' defaultValue={clinicForm.faxSender||''} placeholder={'例：たかた歯科医院\n訪問担当'}/>
      <label>医院ログインID</label><input id='clinic-login-id-input' defaultValue={clinicForm.portalLoginId||clinicForm.id||''} placeholder='例：takata'/>
      <label>医院ログインパスワード</label><input id='clinic-password-input' type='password' defaultValue={clinicForm.portalPassword||clinicForm.portalPin||'2026'}/>
      <label>医院ログインPIN（旧方式）</label><input id='clinic-pin-input' type='password' inputMode='numeric' defaultValue={clinicForm.portalPin||'2026'}/>
      <label>出発地点住所</label><textarea id='clinic-start-address-input' defaultValue={clinicForm.startAddress||''} placeholder='例：たかた歯科医院の住所'/>
      <div className='grid3'><input id='clinic-start-lat-input' defaultValue={clinicForm.startLat?String(clinicForm.startLat):''} placeholder='出発 緯度'/><input id='clinic-start-lng-input' defaultValue={clinicForm.startLng?String(clinicForm.startLng):''} placeholder='出発 経度'/><button type='button' className='secondary' onClick={()=>geocodeClinicInput('clinic-start-address-input','clinic-start-lat-input','clinic-start-lng-input')}>座標取得</button></div>
      <label>終了地点住所（任意）</label><textarea id='clinic-end-address-input' defaultValue={clinicForm.endAddress||''} placeholder='空欄なら出発地点に戻る扱い'/>
      <div className='grid3'><input id='clinic-end-lat-input' defaultValue={clinicForm.endLat?String(clinicForm.endLat):''} placeholder='終了 緯度'/><input id='clinic-end-lng-input' defaultValue={clinicForm.endLng?String(clinicForm.endLng):''} placeholder='終了 経度'/><button type='button' className='secondary' onClick={()=>geocodeClinicInput('clinic-end-address-input','clinic-end-lat-input','clinic-end-lng-input')}>座標取得</button></div>
      <label>メモ</label><textarea id='clinic-memo-input' defaultValue={clinicForm.memo||''} placeholder='医院別の注意点など'/>
      <div className='grid2 actionRow'><button className='primary' onClick={saveClinicFromDom}>保存</button><button className='secondary' onClick={resetClinicForm}>クリア</button></div>
      <div className='small'>入力中にキーボードが閉じないよう、保存時だけ内容を反映します。</div>
    </div>
    <div className='adminCard'>
      <h3>登録医院</h3>
      <div className='billingRows'>
        {clinics.map(c=>{
          const cnt=clinicCounts(c.id);
          return <div key={c.id}>
            <span><b>{c.name}</b><br/><small>{c.shortName} / ID:{c.portalLoginId||c.id} / 出発:{c.startAddress||'未設定'} / 患者{cnt.patients}・施設{cnt.facilities}・予定{cnt.schedules}</small></span>
            <span><button className='mini' onClick={()=>editClinic(c)}>編集</button> <button className='mini' onClick={()=>removeClinic(c.id)}>削除</button></span>
          </div>
        })}
      </div>
    </div>
  </div></AdminGate>
}

function AdminSettings(){
  function savePin(){
    const input=typeof document!=='undefined' ? document.getElementById('admin-pin-change-input') as HTMLInputElement | null : null;
    const value=(input?.value||'').trim();
    if(!value)return setMsg('新しいPINを入力してください');
    localStorage.setItem('frontier_admin_pin',value);
    if(input)input.value='';
    setMsg('管理者PINを変更しました');
  }
  return <AdminGate><div className='adminPage'><div className='adminHeader'><h2>⚙️ 管理設定</h2><button className='mini' onClick={()=>setTab('admin')}>戻る</button></div><AdminMenu/><div className='adminCard'><h3>バージョン固定 / バックアップ</h3><div className='small'>{FRONTIER_VERSION}（{FRONTIER_BUILD}）</div><button className='primary' onClick={exportFrontierBackup}>バックアップJSONを保存</button><label>ローカル設定を復元</label><input type='file' accept='application/json' onChange={e=>{const f=e.target.files?.[0];if(f)importFrontierLocalSettings(f)}}/><div className='small'>※患者・施設・予定はSupabaseのデータです。JSONは控え用として保存できます。復元は単価・①②設定・新患ON/OFFなどのローカル設定のみ反映します。</div></div><div className='adminCard'><h3>医院専用ログイン設定</h3><label>医院用PIN</label><input type='password' inputMode='numeric' value={clinicPortalPin} onChange={e=>setClinicPortalPin(e.target.value)} placeholder='医院用PIN'/><button className='primary' onClick={saveClinicPortalPin}>医院用PINを保存</button><div className='small'>医院側は /clinic からログインできます。表示内容は予定確認と日報PDFのみです。</div></div><div className='adminCard'><label>管理者PIN変更</label><input id='admin-pin-change-input' type='password' inputMode='numeric' autoComplete='new-password' placeholder='新しいPIN' onKeyDown={e=>{if(e.key==='Enter')savePin()}}/><button className='primary' onClick={savePin}>保存</button></div></div></AdminGate>
}


function schedulesForBillingMonth(){
  return schedules.filter(s=>String(s.start_at||'').startsWith(billingMonth));
}
function billingTargetNames(s:Schedule){
  const names=s.patient_names&&s.patient_names.length?s.patient_names:[''];
  return names.filter((name,index)=>isCountTarget(s,name,index)&&!isPatientCanceled(s,name,index));
}


function billingTypeFor(s:Schedule,name:string,index:number){
  // 施設は施設ごとの①②設定、居宅は患者ごとの①②設定。
  // 訪問件数①②・オペレーションチャージ①②・日別明細・請求書はすべてこの値を使う。
  if(s.facility_id)return billingFacilityTypes[s.facility_id] || 'unset';
  const pid=s.patient_ids?.[index] || '';
  return billingPatientTypes[pid || name] || 'unset';
}
function saveBillingFacilityType(id:string,value:string){
  const next={...billingFacilityTypes,[id]:value};
  setBillingFacilityTypes(next);
  localStorage.setItem('frontier_billing_facility_types',JSON.stringify(next));
}
function saveBillingPatientType(id:string,value:string){
  const next={...billingPatientTypes,[id]:value};
  setBillingPatientTypes(next);
  localStorage.setItem('frontier_billing_patient_types',JSON.stringify(next));
}
function billingSettingRows(){
  const month=schedulesForBillingMonth();
  const facilityIds=Array.from(new Set(month.filter(s=>s.facility_id).map(s=>s.facility_id as string)));
  const patientMap=new Map<string,string>();
  month.filter(s=>!s.facility_id).forEach(s=>{
    const names=s.patient_names&&s.patient_names.length?s.patient_names:[''];
    names.forEach((name,index)=>{
      if(!isCountTarget(s,name,index)||isPatientCanceled(s,name,index))return;
      patientMap.set(s.patient_ids?.[index] || name,name);
    });
  });
  return {facilityIds,homePatients:Array.from(patientMap.entries()).map(([id,name])=>({id,name}))};
}


type BillingLine = {
  day:string;
  placeKey:string;
  isHome:boolean;
  type:string;
  patientName:string;
  patientKey:string;
};

function placeKeyForBillingPatient(s:Schedule,name:string,index:number){
  if(s.facility_id)return `facility_${s.facility_id}`;
  // 居宅は患者ごとではなく「同じ予定＝同じ訪問先」としてまとめる
  return `home_schedule_${s.id}`;
}
function getBillingLines(list:Schedule[]):BillingLine[]{
  const lines:BillingLine[]=[];
  list.forEach(s=>{
    const day=String(s.start_at||'').slice(0,10);
    const names=s.patient_names&&s.patient_names.length?s.patient_names:[''];
    names.forEach((name,index)=>{
      if(isPatientCanceled(s,name,index))return;
      if(!isCountTarget(s,name,index))return;
      const type=billingTypeFor(s,name,index);
      const patientKey=s.patient_ids?.[index] || name;
      lines.push({
        day,
        placeKey:placeKeyForBillingPatient(s,name,index),
        isHome:!s.facility_id,
        type,
        patientName:name,
        patientKey
      });
    });
  });
  return lines;
}
function shouldChargeOperation(isHome:boolean,count:number){
  if(count<=0)return false;
  if(isHome)return true;   // 居宅は同じ訪問先で1人以上なら1件
  return count===1;        // 施設は診療対象が1人だけなら1件
}
function operationTypeForLines(lines:BillingLine[]){
  // オペ①②は訪問①②と同じ設定に連動
  const first=lines.find(x=>x.type==='1'||x.type==='2');
  return first?.type || 'unset';
}
function getUnchargedInfoFeeKeys(lines:BillingLine[]){
  return Array.from(new Set(lines.map(x=>x.patientKey).filter(Boolean))).filter(key=>!!newPatientInfoFeeEnabled[key]);
}
function calculateBillingFromSchedules(list:Schedule[], infoFeeKeysOverride?:Set<string>){
  const lines=getBillingLines(list);
  let visit1=0,visit2=0,ope1=0,ope2=0,unset=0;

  lines.forEach(line=>{
    if(line.type==='1')visit1+=1;
    else if(line.type==='2')visit2+=1;
    else unset+=1;
  });

  const groups:Record<string,BillingLine[]>={};
  lines.forEach(line=>{
    const key=`${line.day}_${line.placeKey}`;
    groups[key]=groups[key]||[];
    groups[key].push(line);
  });

  Object.values(groups).forEach(group=>{
    if(!group.length)return;
    if(!shouldChargeOperation(group[0].isHome,group.length))return;
    const type=operationTypeForLines(group);
    if(type==='1')ope1+=1;
    else if(type==='2')ope2+=1;
    else unset+=1;
  });

  const infoFee=infoFeeKeysOverride ? infoFeeKeysOverride.size : getUnchargedInfoFeeKeys(lines).length;

  const amount=
    visit1*adminUnitPrices.visit1+
    visit2*adminUnitPrices.visit2+
    ope1*adminUnitPrices.ope1+
    ope2*adminUnitPrices.ope2+
    infoFee*newPatientInfoFeePrice;

  return {visit1,visit2,ope1,ope2,infoFee,unset,totalPatients:lines.length,amount};
}
function calculateBilling(){
  const list=schedulesForBillingMonth();
  let free=0,cancel=0;

  list.forEach(s=>{
    const names=s.patient_names&&s.patient_names.length?s.patient_names:[''];
    names.forEach((name,index)=>{
      if(isPatientCanceled(s,name,index)){cancel++;return;}
      if(!isCountTarget(s,name,index)){free++;return;}
    });
  });

  const base=calculateBillingFromSchedules(list);
  return {...base,free,cancel};
}
function calculateBillingDailyDetails(){
  const list=schedulesForBillingMonth();
  const allLines=getBillingLines(list);
  const firstDayByPatient:Record<string,string>={};

  allLines.forEach(line=>{
    if(!line.patientKey || !newPatientInfoFeeEnabled[line.patientKey])return;
    if(!firstDayByPatient[line.patientKey] || line.day<firstDayByPatient[line.patientKey]){
      firstDayByPatient[line.patientKey]=line.day;
    }
  });

  const byDay:Record<string,Schedule[]>={};
  list.forEach(s=>{
    const day=String(s.start_at||'').slice(0,10);
    byDay[day]=byDay[day]||[];
    byDay[day].push(s);
  });

  return Object.entries(byDay).sort(([a],[b])=>a.localeCompare(b)).map(([day,daySchedules])=>{
    const dayLines=getBillingLines(daySchedules);
    const infoFeeKeys=new Set(dayLines.map(x=>x.patientKey).filter(key=>firstDayByPatient[key]===day));
    const base=calculateBillingFromSchedules(daySchedules,infoFeeKeys);
    return {day,...base,subtotal:base.amount};
  }).filter(x=>x.visit1||x.visit2||x.ope1||x.ope2||x.infoFee||x.unset);
}

function billingShortLineItems(d:{visit1:number;visit2:number;ope1:number;ope2:number;infoFee?:number;subtotal?:number}){
  return [
    {label:'訪①', count:d.visit1, amount:d.visit1*adminUnitPrices.visit1},
    {label:'訪②', count:d.visit2, amount:d.visit2*adminUnitPrices.visit2},
    {label:'オペ①', count:d.ope1, amount:d.ope1*adminUnitPrices.ope1},
    {label:'オペ②', count:d.ope2, amount:d.ope2*adminUnitPrices.ope2},
    {label:'新規情報', count:d.infoFee||0, amount:(d.infoFee||0)*newPatientInfoFeePrice}
  ].filter(x=>x.count>0);
}

function billingLineItems(d:{visit1:number;visit2:number;ope1:number;ope2:number;infoFee?:number;subtotal?:number}){
  return [
    {label:'訪問件数①', count:d.visit1, unit:adminUnitPrices.visit1, amount:d.visit1*adminUnitPrices.visit1},
    {label:'訪問件数②', count:d.visit2, unit:adminUnitPrices.visit2, amount:d.visit2*adminUnitPrices.visit2},
    {label:'オペレーションチャージ①', count:d.ope1, unit:adminUnitPrices.ope1, amount:d.ope1*adminUnitPrices.ope1},
    {label:'オペレーションチャージ②', count:d.ope2, unit:adminUnitPrices.ope2, amount:d.ope2*adminUnitPrices.ope2},
    {label:'新規情報提供料', count:d.infoFee||0, unit:newPatientInfoFeePrice, amount:(d.infoFee||0)*newPatientInfoFeePrice}
  ].filter(x=>x.count>0);
}

function saveAdminPrices(){
  localStorage.setItem('frontier_admin_prices',JSON.stringify({...adminUnitPrices,infoFee:newPatientInfoFeePrice}));
  setMsg('単価を保存しました');
}

function eligibleInfoFeeLinesForMonth(month:string){
  const monthSchedules=schedules.filter(s=>String(s.start_at||'').startsWith(month));
  return getBillingLines(monthSchedules).filter(line=>!!newPatientInfoFeeEnabled[line.patientKey]);
}
function firstInfoFeeDayMap(month:string){
  const map:Record<string,string>={};
  eligibleInfoFeeLinesForMonth(month).forEach(line=>{
    if(!map[line.patientKey] || line.day<map[line.patientKey])map[line.patientKey]=line.day;
  });
  return map;
}
function isNewPatientInfoFeeBillingDay(s:Schedule,name:string,index:number){
  const key=s.patient_ids?.[index] || name;
  if(!key || !newPatientInfoFeeEnabled[key])return false;
  if(isPatientCanceled(s,name,index))return false;
  if(!isCountTarget(s,name,index))return false;
  const month=String(s.start_at||'').slice(0,7);
  const day=String(s.start_at||'').slice(0,10);
  const firstMap=firstInfoFeeDayMap(month);
  return firstMap[key]===day;
}
function patientCreatedTime(p:Patient){
  const raw=(p as any).created_at || (p as any).createdAt || '';
  const t=raw ? new Date(raw).getTime() : 0;
  return Number.isFinite(t)?t:0;
}
function sortedPatientsNewestFirst(list:Patient[]=patients){
  return [...list].sort((a,b)=>{
    const tb=patientCreatedTime(b), ta=patientCreatedTime(a);
    if(tb!==ta)return tb-ta;
    return String(b.id||'').localeCompare(String(a.id||''));
  });
}

function isNewPatientInfoFeeOn(key?:string){
  return !!(key && newPatientInfoFeeEnabled[key]);
}
function setNewPatientInfoFeeOn(key:string,on:boolean){
  const next={...newPatientInfoFeeEnabled};
  if(on)next[key]=true;
  else delete next[key];
  setNewPatientInfoFeeEnabled(next);
  localStorage.setItem('frontier_new_patient_info_fee_enabled',JSON.stringify(next));
}
function toggleNewPatientInfoFee(key:string){
  setNewPatientInfoFeeOn(key,!newPatientInfoFeeEnabled[key]);
}

function markCurrentMonthInfoFeeCharged(){
  const keys=getUnchargedInfoFeeKeys(getBillingLines(schedulesForBillingMonth()));
  if(!keys.length)return setMsg('新規情報提供料がONの患者はいません');
  if(!confirm(`${keys.length}名分の新規情報提供料をOFFにしますか？`))return;
  const next={...newPatientInfoFeeEnabled};
  keys.forEach(key=>{delete next[key];});
  setNewPatientInfoFeeEnabled(next);
  localStorage.setItem('frontier_new_patient_info_fee_enabled',JSON.stringify(next));
  setMsg('新規情報提供料をOFFにしました');
}

function yen(n:number){
  return Number(n||0).toLocaleString('ja-JP')+'円';
}

function jpDayLabel(day:string){
  const d=new Date(day+'T00:00:00');
  return `${d.getMonth()+1}/${d.getDate()}`;
}

function createInvoicePreview(){
  const b=calculateBilling();
  const daily=calculateBillingDailyDetails();

  const dailyRows=daily.map(d=>{
    const lines=billingLineItems(d).map(item=>`
      <div class="dailyLine">
        <span>${item.label}</span>
        <span>${item.count}件</span>
        <span>${yen(item.amount)}</span>
      </div>
    `).join('');

    const unsetLine=d.unset?`<div class="dailyLine unset"><span>未設定</span><span>${d.unset}件</span><span>請求対象外</span></div>`:'';

    return `<tr>
      <td class="day">${jpDayLabel(d.day)}</td>
      <td class="detail">${lines}${unsetLine}</td>
    </tr>`;
  }).join('');

  const summaryRows=billingLineItems(b).map(item=>`
    <tr>
      <td>${item.label}</td>
      <td>${item.count}件</td>
      <td>${yen(item.unit)}</td>
      <td>${yen(item.amount)}</td>
    </tr>
  `).join('');

  const html=`<!doctype html><html><head><meta charset="utf-8"/><title>${billingMonth.replace("-", "年")}月請求書</title><style>
    body{font-family:-apple-system,BlinkMacSystemFont,'Noto Sans JP',sans-serif;padding:32px;color:#111}
    h1{text-align:center;font-size:34px;letter-spacing:12px;margin:14px 0 24px}.issueDate{text-align:right;font-size:16px}.invoiceTo{font-size:24px;font-weight:900;border-bottom:2px solid #111;padding-bottom:8px;margin-top:8px}.invoiceMonth{font-size:22px;font-weight:900;margin:16px 0}.topInfo{display:flex;justify-content:space-between;align-items:flex-start;margin:26px 0 28px}.billAmount{font-size:24px;font-weight:900;border-bottom:2px solid #111;padding:0 28px 8px 0}.issuer{font-size:16px;line-height:1.7}
    .totalTop{font-size:28px;font-weight:900;text-align:right;margin:8px 0 18px}
    .meta{display:flex;justify-content:space-between;margin:18px 0 24px}
    table{width:100%;border-collapse:collapse;font-size:16px;margin-top:16px}
    th,td{border:1px solid #333;padding:10px;vertical-align:top}
    th{background:#f1f5f9}
    .day{width:18%;font-weight:900;text-align:center;font-size:18px}
    .detail{width:82%;line-height:1.8;font-weight:700}
    .dailyLine{display:grid;grid-template-columns:1fr 70px 120px;gap:8px}
    .dailyLine span:nth-child(2),.dailyLine span:nth-child(3){text-align:right}
    .dailyLine.unset{color:#b45309}
    .daySubtotal{font-weight:900;text-align:right;border-top:1px solid #999;margin-top:8px;padding-top:8px;font-size:18px}
    .summary td{text-align:right}
    .summary td:first-child{text-align:left;font-weight:900}
    .sectionTitle{font-size:20px;font-weight:900;margin-top:26px}
    .total{font-size:26px;font-weight:900;text-align:right;margin-top:18px}
    .actions{display:flex;gap:10px;margin-top:24px}.actions button{padding:12px 18px;font-size:16px;border-radius:10px;border:1px solid #333;background:white;font-weight:700}
    @media print{button{display:none}}
  </style></head><body>
    <div class="issueDate">${new Date().toLocaleDateString("ja-JP")}</div><h1>請　求　書</h1>
    <div class="invoiceTo">アロハ歯科小児・矯正歯科　御中</div>
    <div class="invoiceMonth">${billingMonth.replace('-', '年')}月請求書</div>
    <div class="topInfo">
      <div class="billAmount">御請求金額　${yen(b.amount+Math.round(b.amount*0.1))}</div>
      <div class="issuer">
        <b>訪問歯科支援センターフロンティア</b><br/>
        福岡県久留米市津福本町266-1<br/>
        ＴＥＬ：0942-44-2678
      </div>
    </div>

    <div class="sectionTitle">日別明細</div>
    <table>
      <thead><tr><th>日付</th><th>明細</th></tr></thead>
      <tbody>${dailyRows || '<tr><td colspan="2">対象明細はありません</td></tr>'}</tbody>
    </table>

    <div class="sectionTitle">集計</div>
    <table class="summary"><thead><tr><th>項目</th><th>数量</th><th>単価</th><th>金額</th></tr></thead><tbody>
      ${summaryRows || '<tr><td colspan="4">対象明細はありません</td></tr>'}
    </tbody></table>
    <div class="sectionTitle">請求金額</div>
    <table class="summary">
      <tr><td>小計（税抜）</td><td></td><td></td><td>${yen(b.amount)}</td></tr>
      <tr><td>消費税（10%）</td><td></td><td></td><td>${yen(Math.round(b.amount*0.1))}</td></tr>
      <tr><td><b>合計（税込）</b></td><td></td><td></td><td><b>${yen(b.amount+Math.round(b.amount*0.1))}</b></td></tr>
    </table>
    <div class="actions"><button onclick="window.close(); setTimeout(()=>history.back(),100)">← 元画面へ戻る</button><button onclick="window.print()">印刷 / PDF保存</button></div>
  </body></html>`;
  const w=window.open('','_blank');
  if(!w){setMsg('ポップアップがブロックされました');return;}
  w.document.write(html);
  w.document.close();
}
function AdminBillingSettings(){
  return <div className='adminPage'>
    <div className='adminHeader'>
      <div><div className='easyLabel'>ADMIN</div><h2>①② 設定</h2></div>
      <button className='mini' onClick={()=>setTab('admin')}>管理画面へ</button>
    </div>
    <AdminMenu/>
    <div className='adminCard'>
      <h3>①/② 設定</h3><div className='operationRuleBox'><b>オペチャージ判定ルール</b><br/>施設：診療対象が1人だけの場合のみ1件請求。2人以上は請求なし。<br/>居宅：同じ予定内で診療対象が1人以上なら人数に関係なく1件請求。<br/>①②は訪問件数と同じ設定に連動します。①の場所はオペ①、②の場所はオペ②に入ります。</div>
      <div className='small'>施設は施設ごと、居宅は患者ごとに①/②を選択します。訪問件数①②・オペレーションチャージ①②・請求書はすべて同じ①②設定に連動します。①の患者/施設がオペ②に入ることはありません。未設定は請求金額に含めず、確認用に表示します。</div>
      <div className='billingTypeList'>
        {billingSettingRows().facilityIds.map(id=>{const f=getFacility(id);return <div className='billingTypeRow' key={id}><b>施設：{f?.name||id}</b><select value={billingFacilityTypes[id]||'unset'} onChange={e=>saveBillingFacilityType(id,e.target.value)}><option value='unset'>未設定</option><option value='1'>①</option><option value='2'>②</option></select></div>})}
        {billingSettingRows().homePatients.map(p=><div className='billingTypeRow home' key={p.id}><b>居宅：{p.name}</b><select value={billingPatientTypes[p.id]||'unset'} onChange={e=>saveBillingPatientType(p.id,e.target.value)}><option value='unset'>未設定</option><option value='1'>①</option><option value='2'>②</option></select></div>)}
      </div>
    </div>
    <div className='adminCard'>
      <h3>新規情報提供料 ON/OFF</h3>
      <div className='small'>デフォルトはOFFです。新患として請求したい患者だけONにしてください。患者一覧は登録が新しい順です。キャンセル・無料検診・担当者会議は新規情報提供料対象外です。請求後に「この月の新規情報提供料をOFFにする」を押すと自動でOFFになります。</div>
      <div className='billingTypeList'>
        {sortedPatientsNewestFirst().map(p=><div className='billingTypeRow home' key={p.id}>
          <b>{p.name}</b>
          <button className={isNewPatientInfoFeeOn(p.id)?'primary':'secondary'} onClick={()=>toggleNewPatientInfoFee(p.id)}>
            {isNewPatientInfoFeeOn(p.id)?'ON（新患）':'OFF'}
          </button>
        </div>)}
      </div>
    </div>
  </div>
}

function AdminBillingEnhanced(){
  const b=calculateBilling();
  return <div className='adminPage'>
    <div className='adminHeader'>
      <div><div className='easyLabel'>ADMIN</div><h2>請求画面</h2></div>
      <button className='mini' onClick={()=>setTab('home')}>スタッフ画面</button>
    </div>
    <AdminMenu/>
    <div className='adminCard'>
      <div className='adminQuickActions'><button className='secondary' onClick={()=>setTab('adminBillingSettings')}>①②設定へ</button></div>
      <label>対象月</label>
      <input type='month' value={billingMonth} onChange={e=>setBillingMonth(e.target.value)}/>
    </div>
    <div className='adminStats'>
      <div><b>{b.totalPatients}</b><span>診療対象</span></div>
      <div><b>{b.free}</b><span>無料/会議</span></div>
      <div><b>{b.cancel}</b><span>キャンセル</span></div>
      <div><b>{b.visit1}</b><span>訪問件数①</span></div>
      <div><b>{b.visit2}</b><span>訪問件数②</span></div>
      <div><b>{b.infoFee}</b><span>新規情報</span></div>
      <div><b>{b.unset}</b><span>未設定</span></div>
      <div><b>{yen(b.amount)}</b><span>概算合計</span></div>
    </div>
    <div className='adminCard'>
      <h3>単価設定</h3>
      <div className='priceGrid'>
        <label>訪問件数①<input type='number' value={adminUnitPrices.visit1} onChange={e=>setAdminUnitPrices(p=>({...p,visit1:Number(e.target.value)}))}/></label>
        <label>訪問件数②<input type='number' value={adminUnitPrices.visit2} onChange={e=>setAdminUnitPrices(p=>({...p,visit2:Number(e.target.value)}))}/></label>
        <label>オペレーションチャージ①<input type='number' value={adminUnitPrices.ope1} onChange={e=>setAdminUnitPrices(p=>({...p,ope1:Number(e.target.value)}))}/></label>
        <label>オペレーションチャージ②<input type='number' value={adminUnitPrices.ope2} onChange={e=>setAdminUnitPrices(p=>({...p,ope2:Number(e.target.value)}))}/></label>
        <label>新規情報提供料<input type='number' value={newPatientInfoFeePrice} onChange={e=>setNewPatientInfoFeePrice(Number(e.target.value))}/></label>
      </div>
      <button className='primary' onClick={saveAdminPrices}>単価を保存</button>
    </div>
    <div className='adminCard'>
      <h3>請求書プレビュー</h3>
      <div className='billingRows'>
        <div><span>訪問件数①</span><b>{b.visit1}件 / {yen(b.visit1*adminUnitPrices.visit1)}</b></div>
        <div><span>訪問件数②</span><b>{b.visit2}件 / {yen(b.visit2*adminUnitPrices.visit2)}</b></div>
        <div><span>オペレーションチャージ①</span><b>{b.ope1}件 / {yen(b.ope1*adminUnitPrices.ope1)}</b></div>
        <div><span>オペレーションチャージ②</span><b>{b.ope2}件 / {yen(b.ope2*adminUnitPrices.ope2)}</b></div>
        <div><span>新規情報提供料</span><b>{b.infoFee}件 / {yen(b.infoFee*newPatientInfoFeePrice)}</b></div>
      </div>
      <div className='dailyPreviewBox'>
        <h4>日別明細プレビュー</h4>
        {calculateBillingDailyDetails().slice(0,8).map(d=><div className='dailyPreviewRow dailyPreviewRowSimple' key={d.day}>
          <b>{jpDayLabel(d.day)}</b>
          <div className='dailyPreviewLines'>
            {billingShortLineItems(d).map(item=><div className='dailyPreviewLine' key={item.label}>
              <span>{item.label}</span>
              <span>{item.count}件</span>
              <strong>{yen(item.amount)}</strong>
            </div>)}
            {d.unset>0&&<div className='dailyPreviewLine unset'>
              <span>未設定</span>
              <span>{d.unset}件</span>
              <strong>対象外</strong>
            </div>}
            <div className='dailyPreviewLine dailyTotal'>
              <span>合計</span>
              <span></span>
              <strong>{yen(d.subtotal)}</strong>
            </div>
          </div>
        </div>)}
      </div>
      <button className='primary' onClick={createInvoicePreview}>請求書プレビュー作成</button>
      <button className='secondary' onClick={markCurrentMonthInfoFeeCharged}>この月の新規情報提供料をOFFにする</button>
      <div className='small'>※現時点では概算集計です。</div>
    </div>
  </div>
}


const calendarJumpCss=`
.calendarBackFloating{
  position:fixed;
  right:14px;
  bottom:92px;
  z-index:9998;
  border:0;
  border-radius:999px;
  padding:12px 15px;
  background:#0284c7;
  color:#fff;
  font-weight:900;
  font-size:14px;
  box-shadow:0 8px 22px rgba(2,132,199,.32);
}
.calendarBackFloating:active{transform:scale(.98)}
@media print{.calendarBackFloating{display:none}}
`;
const CalendarBackFloatingButton=()=>{
  const show=['calendar','today','route1','route2','tomorrow'].includes(tab);
  if(!show)return null;
  return <button type='button' className='calendarBackFloating' onClick={()=>{
    setTab('calendar');
    setTimeout(()=>{
      const el=document.getElementById('calendar-top');
      if(el)el.scrollIntoView({behavior:'smooth',block:'start'});
      else window.scrollTo({top:0,behavior:'smooth'});
    },80);
  }}>📅 カレンダー</button>;
};

if(tab==='clinicPortal' && !clinicUnlocked)return <ClinicPortal/>;

return <main className='wrap'><style>{calendarJumpCss}</style><CalendarBackFloatingButton/><section className='head appHeader'><div className='brandHeader'><img src='/apple-touch-icon.png' alt='FRONTIER OS' className='headerAppIcon'/><h1>{activeClinic()?.name||'FRONTIER OS'}</h1><span className='versionBadge'>{FRONTIER_VERSION}</span>{clinicUnlocked&&<span className='versionBadge'>医院ログイン中</span>}{clinicUnlocked&&<button className='mini' onClick={()=>{setClinicUnlocked(false);setTab('clinicPortal')}}>ログアウト</button>}</div>{demoMode&&<div className='demoBanner'>デモモード中：本番データは変更されません</div>}{demoMode&&<div className='demoMiniControls'><button onClick={()=>setTab('today')}>今日</button><button onClick={demoOpenFirstDetail}>詳細</button><button onClick={demoOpenCalendarRoute}>予定</button><button onClick={exitDemoMode}>終了</button></div>}</section><RouteOptimizationPreview/><section className='card'>{tab==='home'&&<div className={easyMode?'easyHome':'standardHome'}>
  <div className='easyHero'>
    <div>
      <div className='easyLabel'>かんたんモード</div>
      <h2>今日やること</h2>
      <div className='small'>迷ったら上から順番に押してください</div>
    </div>
    <button className='mini' onClick={()=>setEasyMode(!easyMode)}>{easyMode?'通常表示':'かんたん表示'}</button>
  </div>

  {easyMode&&<div>
    <div className='easyStats'>
      <div><b>{todayCardCount}</b><span>本日</span></div>
      <div><b>{remaining}</b><span>残り</span></div>
      <div><b>{completed}</b><span>完了</span></div>
    </div>

    {nextVisitSchedule()?<div className='nextVisitBox'>
      <div className='easyLabel'>次の訪問</div>
      <h3>{time(nextVisitSchedule()!.start_at)}　{getFacility(nextVisitSchedule()!.facility_id)?.name}</h3>
      <div className='nextNames'>{nextVisitNames(nextVisitSchedule())}</div>
      <button className='primary bigAction' onClick={scrollToNextVisit}>訪問を開始する</button>
    </div>:<div className='nextVisitBox'><h3>本日の予定はありません</h3></div>}

    <div className='easyActions'>
      <button className='easyAction primaryEasy' onClick={()=>setTab('today')}><span>🦷</span><b>今日の訪問を見る</b><small>全体表示</small></button><button className='easyAction routeOne' onClick={()=>openRoute(1)}><span>①</span><b>ルート1</b><small>{routeCount(1)}件 / 青ルート</small></button><a className='routePageLink routePageLink1' href='/route1'>ルート1専用ページ</a><button className='easyAction routeTwo' onClick={()=>openRoute(2)}><span>②</span><b>ルート2</b><small>{routeCount(2)}件 / 緑ルート</small></button><a className='routePageLink routePageLink2' href='/route2'>ルート2専用ページ</a>
      <button className='easyAction' onClick={openEasyPatientSearch}><span>👤</span><b>患者を探す</b><small>名前・施設で検索</small></button>
      <button className='easyAction' onClick={openPhotoPatientRegister}><span>📷</span><b>写真から登録</b><small>画像・PDFから患者登録</small></button>
    </div>

    <details className='advancedMenu'>
      <summary>詳しいメニューを開く</summary>
      <div className='menu'><button onClick={openTutorial}>❓ 使い方</button><button onClick={startDemoMode}>🧪 デモ画面</button><button onClick={startGuidedDemo}>🎮 操作デモ</button>{demoMode&&<button onClick={exitDemoMode}>本番に戻る</button>}<button onClick={()=>setTab('tomorrow')}>📅 明日</button><button onClick={()=>setTab('facilities')}>🏢 施設</button><button onClick={()=>setTab('calendar')}>📅 予定登録</button><button onClick={()=>setTab('admin')}>🔐 管理者</button></div>
    </details>

    <div className='sectionTitleRow'><h3>今日の訪問</h3><button className='mini' onClick={()=>setTab('today')}>すべて</button></div>
    {renderScheduleCards(todaySchedules.slice(0,3),{from:'today'})}
  </div>}

  {!easyMode&&<div><h2>ダッシュボード</h2><div className='grid3'><div className='stat'><b>{todayCardCount}</b>本日</div><div className='stat'><b>{completed}</b>完了</div><div className='stat'><b>{remaining}</b>残り</div></div><div className='grid2'><div className='stat'><b>{tomorrowCardCount}</b>明日</div><div className='stat'><b>{patients.length}</b>患者</div></div><div className='menu'><button onClick={openTutorial}>❓ 使い方</button><button onClick={startDemoMode}>🧪 デモ画面</button><button onClick={startGuidedDemo}>🎮 操作デモ</button>{demoMode&&<button onClick={exitDemoMode}>本番に戻る</button>}<button onClick={()=>setTab('today')}>🚗 今日/明日</button><button onClick={()=>setTab('route1')}>① ルート1</button><button onClick={()=>setTab('route2')}>② ルート2</button><button onClick={()=>setTab('patients')}>👤 患者</button><button onClick={()=>setTab('facilities')}>🏢 施設</button><button onClick={()=>setTab('calendar')}>📅 予定登録</button><button onClick={()=>setTab('admin')}>🔐 管理者</button></div><TodayRoute/><h3>🚗 今日の訪問</h3>{renderScheduleCards(todaySchedules.slice(0,3),{from:'today'})}<button className='secondary' onClick={()=>setTab('today')}>今日の訪問をすべて見る</button><div className='tomorrowBox'><div className='tomorrowHead'><div><h3>📅 明日の訪問</h3><div className='small'>今日とは別画面で確認できます</div></div><div className='tomorrowCount'>{tomorrowCardCount}件</div></div><button className='primary' onClick={()=>setTab('tomorrow')}>明日の訪問を開く</button><button className='secondary' onClick={()=>copyList(tomorrowSchedules,'明日の予定')}>明日の予定をコピー</button></div></div>}
</div>}{tab==='route1'&&<RouteDashboard route={1}/>} {tab==='route2'&&<RouteDashboard route={2}/>}{tab==='today'&&<UnifiedSchedulePage title='🚗 今日の訪問' list={todaySchedules} count={todayCardCount} routeTitle='🚗 今日のルート' routeId='today-route' copyLabel='本日の予定' from='today'><div className='grid3'><div className='stat'><b>{todayCardCount}</b>予定</div><div className='stat'><b>{completed}</b>完了</div><div className='stat'><b>{remaining}</b>残り</div></div></UnifiedSchedulePage>}{tab==='tomorrow'&&<UnifiedSchedulePage title='📅 明日の訪問' list={tomorrowSchedules} count={tomorrowCardCount} routeTitle='🚗 明日のルート' routeId='tomorrow-route' copyLabel='明日の予定' from='tomorrow' allowComplete={false}/>}{tab==='next'&&<div className='nextPageBox'><div className='row'><h2>📅 次回登録</h2><button className='mini' onClick={()=>setTab(returnTab)}>戻る</button></div>{nextDraftInfo&&<div className='nextSummary'><b>対象</b><div className='small'>{nextDraftInfo}</div></div>}<label>区分</label>
<div className='segmentedChoice'>
  <button type='button' className={String(scheduleLocationType)==='facility'?'on':''} onClick={()=>{setScheduleLocationType('facility');setFacilityId(facilities[0]?.id||'');setSelectedPatientIds([]);setSchedulePatientSearch('')}}>施設</button>
  <button type='button' className={String(scheduleLocationType)==='home'?'on':''} onClick={()=>{setScheduleLocationType('home');setFacilityId('');setSelectedPatientIds([]);setSchedulePatientSearch('')}}>居宅</button>
</div>
{String(scheduleLocationType)==='facility'&&<><label>区分</label>
<div className='segmentedChoice'>
  <button type='button' className={String(scheduleLocationType)==='facility'?'on':''} onClick={()=>{setScheduleLocationType('facility');setFacilityId(facilities[0]?.id||'');setSelectedPatientIds([]);setSchedulePatientSearch('')}}>施設</button>
  <button type='button' className={String(scheduleLocationType)==='home'?'on':''} onClick={()=>{setScheduleLocationType('home');setFacilityId('');setSelectedPatientIds([]);setSchedulePatientSearch('')}}>居宅</button>
</div>
{String(scheduleLocationType)==='facility'&&<><label>施設</label><select value={facilityId} onChange={e=>{setFacilityId(e.target.value);setSelectedPatientIds([]);setSchedulePatientSearch('')}}>{facilities.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}</select></>}</>}<div className='aiScheduleBox'>
  <h3>🤖 予定作成AI</h3>
  <div className='small' style={{whiteSpace:'pre-line'}}>{aiScheduleCreateReason()}</div>
  <div className='grid2 actionRow'>
    <button type='button' className='secondary' onClick={()=>aiApplyTopSchedulePatients(3)}>AI候補を3名選択</button>
    <button type='button' className='secondary' onClick={aiSuggestScheduleTime}>空き時間を提案</button>
  </div>
</div><label>患者検索</label><input value={schedulePatientSearch} onChange={e=>setSchedulePatientSearch(e.target.value)} placeholder='患者名・フリガナ・部屋番号で検索'/><label>患者</label><div className='checks'>{filteredFacilityPatients.map(p=><label className={'checkrow '+(patientWeekCount(p)===0?'needsSchedule':'')} key={p.id}><input type='checkbox' checked={selectedPatientIds.includes(p.id)} onChange={e=>setSelectedPatientIds(prev=>e.target.checked?[...prev,p.id]:prev.filter(x=>x!==p.id))}/><span>{p.room?`${p.room}　`:''}{p.name}</span>{patientWeekCount(p)===0&&<span className='badge'>今週未予定</span>}{p.visit_frequency&&<span className='badge'>頻度：{p.visit_frequency}</span>}<span className='badge'>{patientScheduleStatusLabel(p)}</span></label>)}</div><label>次回日時</label><input type='datetime-local' value={startAt} onChange={e=>setStartAt(e.target.value)}/><div className='grid3'><button className='secondary' onClick={()=>adjustNextDraftDays(7)}>+1週</button><button className='secondary' onClick={()=>adjustNextDraftDays(14)}>+2週</button><button className='secondary' onClick={()=>adjustNextDraftDays(28)}>+4週</button></div><label>診療内容</label><select value={treatment} onChange={e=>setTreatment(e.target.value)}>{treatmentOptions.map(t=><option key={t}>{t}</option>)}</select><label>備考</label><textarea value={scheduleMemo} onChange={e=>setScheduleMemo(e.target.value)} placeholder='次回メモ・注意事項'/><button className='primary' onClick={saveSchedule}>次回予定を保存</button></div>}{tab==='patients'&&<div><div className='row'><h2>👤 患者</h2><button className='mini' onClick={newPatient}>新規</button></div>{showPatientForm&&renderPatientForm()}<label>検索</label><input className='search' value={patientSearch} onChange={e=>setPatientSearch(e.target.value)} placeholder='患者名・施設・電話・住所'/>{filteredPatients.map(p=>{const f=getFacility(p.facility_id);const n=nextSchedule(p);return <div className='item' key={p.id} onClick={()=>openPatient(p)}><div className='row'><b>{p.name}</b><button className='mini'>開く</button></div><div className='small'>{f?.name} {p.room?'/ '+p.room:''}</div><span className='badge'>今月 {monthCount(p)}回</span>{n&&<span className='badge'>次回 {fmt(n.start_at)}</span>}</div>})}</div>}{tab==='facilities'&&<div><h2>🏢 施設</h2><div className='bulkBox'><button className='secondary geoButton' onClick={bulkGeocodeFacilities}>施設座標を一括取得</button><button className='secondary geoButton' onClick={bulkGeocodePatients}>患者/居宅座標を一括取得</button><div className='small'>患者住所がある場合は患者住所、なければ施設住所から取得します。</div></div><label>施設名</label><input value={facilityName} onChange={e=>setFacilityName(e.target.value)}/><label>住所</label><input value={facilityAddress} onChange={e=>setFacilityAddress(e.target.value)}/><label>電話</label><input value={facilityPhone} onChange={e=>setFacilityPhone(e.target.value)}/><div className='faxSettingBox'><h3>FAX設定</h3><label>FAX番号</label><input value={facilityFax} onChange={e=>setFacilityFax(e.target.value)} placeholder='092-000-0000'/><label>送信単位</label><select value={facilityFaxType} onChange={e=>setFacilityFaxType(e.target.value)}><option value='monthly'>月ごと</option><option value='weekly'>週ごと</option><option value='custom'>都度指定</option></select><div className='small'>まずはPDF作成・プレビューまで対応。送信は確認後に手動で行えます。</div></div><div className='grid2'><div><label>緯度</label><input value={facilityLat} onChange={e=>setFacilityLat(e.target.value)} placeholder='33.5902'/></div><div><label>経度</label><input value={facilityLng} onChange={e=>setFacilityLng(e.target.value)} placeholder='130.4017'/></div></div><div className='small'>住所保存時に座標を自動取得します。取得できない場合は下のボタンで再取得してください。</div><button className='secondary geoButton' onClick={geocodeFacilityAddress}>住所から座標を取得</button><button className='primary' onClick={saveFacility}>{editingFacilityId?'更新':'登録'}</button><label>検索</label><input className='search' value={facilitySearch} onChange={e=>setFacilitySearch(e.target.value)}/>{filteredFacilities.map(f=><div className='item' key={f.id}><b>{f.name}</b><div className='small faxAddressName'>FAX宛名：{withOnchu(f.name)}</div><div className='small'>{f.address} {f.phone}</div><div className='small'>FAX：{f.fax_number||'未登録'} / {f.fax_schedule_type==='weekly'?'週ごと':f.fax_schedule_type==='custom'?'都度指定':'月ごと'}</div><div className='small'>{f.latitude&&f.longitude?`座標：${f.latitude}, ${f.longitude}`:'座標未登録'}</div><div className='faxButtons faxButtons6'><button className='secondary' onClick={()=>createFacilityFaxPdf(f,'today')}>今日PDF</button><button className='secondary' onClick={()=>createFacilityFaxPdf(f,'tomorrow')}>明日PDF</button><button className='secondary' onClick={()=>createFacilityFaxPdf(f,'weekly')}>今週PDF</button><button className='secondary' onClick={()=>createFacilityFaxPdf(f,'next_week')}>来週PDF</button><button className='secondary' onClick={()=>createFacilityFaxPdf(f,'current_month')}>今月PDF</button><button className='secondary' onClick={()=>createFacilityFaxPdf(f,'monthly')}>来月PDF</button></div><div className='grid3'><button className='secondary' onClick={()=>editFacility(f)}>編集</button><button className='secondary' onClick={()=>openMap(f.address,f.name)}>地図</button><button className='secondary danger' onClick={()=>deleteFacility(f.id)}>削除</button></div></div>)}</div>}{tab==='calendar'&&<div><CalendarMonth/><CalendarDayDetail/><h2 id='schedule-form'>{nextDraftInfo?'📅 次回予定の確認・編集':(editingScheduleId?'✏️ 予定編集':'📅 予定登録')}</h2>{nextDraftInfo&&<div className='nextDraftBox'><b>次回登録中</b><div className='small'>{nextDraftInfo}</div><div className='grid3'><button className='secondary' onClick={()=>adjustNextDraftDays(7)}>+1週</button><button className='secondary' onClick={()=>adjustNextDraftDays(14)}>+2週</button><button className='secondary' onClick={()=>adjustNextDraftDays(28)}>+4週</button></div><div className='small'>下の「日時」「診療内容」を確認して、最後に保存してください。</div></div>}<label>区分</label>
<div className='segmentedChoice'>
  <button type='button' className={String(scheduleLocationType)==='facility'?'on':''} onClick={()=>{setScheduleLocationType('facility');setFacilityId(facilities[0]?.id||'');setSelectedPatientIds([]);setSchedulePatientSearch('')}}>施設</button>
  <button type='button' className={String(scheduleLocationType)==='home'?'on':''} onClick={()=>{setScheduleLocationType('home');setFacilityId('');setSelectedPatientIds([]);setSchedulePatientSearch('')}}>居宅</button>
</div>
{String(scheduleLocationType)==='facility'&&<><label>区分</label>
<div className='segmentedChoice'>
  <button type='button' className={String(scheduleLocationType)==='facility'?'on':''} onClick={()=>{setScheduleLocationType('facility');setFacilityId(facilities[0]?.id||'');setSelectedPatientIds([]);setSchedulePatientSearch('')}}>施設</button>
  <button type='button' className={String(scheduleLocationType)==='home'?'on':''} onClick={()=>{setScheduleLocationType('home');setFacilityId('');setSelectedPatientIds([]);setSchedulePatientSearch('')}}>居宅</button>
</div>
{String(scheduleLocationType)==='facility'&&<><label>施設</label><select value={facilityId} onChange={e=>{setFacilityId(e.target.value);setSelectedPatientIds([]);setSchedulePatientSearch('')}}>{facilities.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}</select></>}</>}<label>患者検索</label><input value={schedulePatientSearch} onChange={e=>setSchedulePatientSearch(e.target.value)} placeholder='患者名・フリガナ・部屋番号で検索'/><label>患者</label><div className='checks'>{filteredFacilityPatients.map(p=><label className={'checkrow '+(patientWeekCount(p)===0?'needsSchedule':'')} key={p.id}><input type='checkbox' checked={selectedPatientIds.includes(p.id)} onChange={e=>setSelectedPatientIds(prev=>e.target.checked?[...prev,p.id]:prev.filter(x=>x!==p.id))}/><span>{p.room?`${p.room}　`:''}{p.name}</span>{patientWeekCount(p)===0&&<span className='badge'>今週未予定</span>}<span className='badge'>{patientScheduleStatusLabel(p)}</span></label>)}</div><label>処置</label><select value={treatment} onChange={e=>setTreatment(e.target.value)}>{treatmentOptions.map(t=><option key={t}>{t}</option>)}</select>
<details className='treatmentMasterBox'>
  <summary>処置内容を編集</summary>
  <div className='treatmentAddRow'>
    <input value={newTreatment} onChange={e=>setNewTreatment(e.target.value)} placeholder='例：義歯BITE'/>
    <button type='button' className='secondary' onClick={addTreatmentOption}>追加</button>
  </div>
  <div className='treatmentChipList'>
    {treatmentOptions.map(t=><span className='treatmentChip' key={t}>{t}<button type='button' onClick={()=>removeTreatmentOption(t)}>×</button></span>)}
  </div>
  <button type='button' className='secondary' onClick={resetTreatmentOptions}>初期状態に戻す</button>
  <div className='small'>この端末のアプリ内に保存されます。よく使う処置内容を自由に追加できます。</div>
</details>
<label>ルート</label><select value={routeNo} onChange={e=>setRouteNo(Number(e.target.value))}><option value={1}>🔵 ルート1</option><option value={2}>🟢 ルート2</option></select><label>日付</label><input type='date' value={scheduleDatePart()} onChange={e=>setScheduleDatePart(e.target.value)}/>
<label>時間</label><div className='timeSelectRow'>
  <select value={scheduleTimePart()} onChange={e=>setScheduleTimePart(e.target.value)}>
    {timeOptions.map(t=><option key={t} value={t}>{t}</option>)}
  </select>
  <button type='button' className='secondary timeMini' onClick={()=>moveScheduleTime(-15)}>-15分</button>
  <button type='button' className='secondary timeMini' onClick={()=>moveScheduleTime(15)}>+15分</button>
</div><label>備考</label><textarea value={scheduleMemo} onChange={e=>setScheduleMemo(e.target.value)}/><button className='primary' onClick={saveSchedule}>{nextDraftInfo?'次回予定を保存':(editingScheduleId?'予定を更新':'保存')}</button><h3>全予定</h3>{renderScheduleCards(sortedSchedules,{showDate:true,from:'calendar'})}</div>}{tab==='admin'&&<AdminDashboard/>}{tab==='adminStaff'&&<AdminStaff/>}{tab==='adminFax'&&<AdminFax/>}{tab==='adminReports'&&<AdminReports/>}{tab==='adminAI'&&<AdminAI/>}{tab==='adminClinics'&&<AdminClinics/>}{tab==='adminSettings'&&<AdminSettings/>}{tab==='adminBilling'&&<AdminBillingEnhanced/>}{tab==='adminBillingSettings'&&<AdminBillingSettings/>}<AddPatientModal/><BeginnerTutorial/><GuidedDemoPanel/><CancelReasonModal/>{msg&&<div className='msg'>{msg}</div>}</section><nav className='bottom'>
  <button className={tab==='home'?'on':''} onClick={()=>setTab('home')}>🏠<br/>ホーム</button>
  <button className={tab==='today'?'on':''} onClick={()=>setTab('today')}>🚗<br/>今日</button>
  <button className={tab==='route1'?'on':''} onClick={()=>setTab('route1')}>①<br/>R1</button>
  <button className={tab==='route2'?'on':''} onClick={()=>setTab('route2')}>②<br/>R2</button>
  <button className={tab==='tomorrow'?'on':''} onClick={()=>setTab('tomorrow')}>📅<br/>明日</button>
  <button className={tab==='patients'?'on':''} onClick={()=>setTab('patients')}>👤<br/>患者</button>
  <button className={tab==='facilities'?'on':''} onClick={()=>setTab('facilities')}>🏢<br/>施設</button>
  {clinicUnlocked ? null : <button className={tab.startsWith('admin')?'on':''} onClick={()=>setTab('admin')}>⚙️<br/>管理</button>}
  <button className={tab==='calendar'?'on':''} onClick={()=>setTab('calendar')}>📅<br/>予定</button>
</nav></main>
}


/* === Sprint12.7 NOTE ===
オペレーションチャージ計算ルール
施設: 同日・同施設・同ルートで1名のみ→1件請求
施設: 2名以上→請求なし
居宅: 同日・同住所・同ルートで1〜2名→1件請求
居宅: 3名以上→請求なし
実際のcalculateBillingへこのルールを適用してください。
*/


/*
Sprint12.8.2 CSS（globals.cssに追加推奨）
.dailyPreviewRowSimple{
  display:grid;
  grid-template-columns:52px 1fr;
  gap:10px;
  align-items:start;
}
.dailyPreviewLines{
  display:flex;
  flex-direction:column;
  gap:4px;
}
.dailyPreviewLine{
  display:grid;
  grid-template-columns:56px 52px 1fr;
  gap:6px;
  align-items:center;
  font-size:13px;
}
.dailyPreviewLine strong{
  text-align:right;
  color:#075985;
}
.dailyPreviewLine.unset{
  color:#b45309;
}
*/


/*
Sprint12.8.3 CSS（globals.cssに追加推奨）
.dailyPreviewLine.dailyTotal{
  border-top:1px solid #cbd5e1;
  margin-top:4px;
  padding-top:6px;
  font-weight:900;
}
.dailyPreviewLine.dailyTotal span,
.dailyPreviewLine.dailyTotal strong{
  color:#075985;
}
*/

/*
CSS追加推奨:
.newPatientBadge{
  display:inline-block;
  margin-left:8px;
  padding:3px 7px;
  border-radius:999px;
  background:#fff7ed;
  color:#c2410c;
  border:1px solid #fed7aa;
  font-size:12px;
  font-weight:900;
}
*/

/*
CSS追加推奨:
.newPatientBadge{
  display:inline-block;
  margin-left:8px;
  padding:3px 7px;
  border-radius:999px;
  background:#fff7ed;
  color:#c2410c;
  border:1px solid #fed7aa;
  font-size:12px;
  font-weight:900;
}
*/


/*
CSS追加推奨：予定欄の新患表示を目立たせる
.newPatientBadge{
  display:inline-flex;
  align-items:center;
  gap:4px;
  margin-left:8px;
  padding:4px 10px;
  border-radius:999px;
  background:#f97316;
  color:#fff;
  border:2px solid #fb923c;
  font-size:13px;
  font-weight:900;
  box-shadow:0 2px 8px rgba(249,115,22,.25);
}
.newPatientMetaBadge{
  display:inline-block;
  padding:3px 8px;
  border-radius:999px;
  background:#fff7ed;
  color:#c2410c;
  border:1px solid #fed7aa;
  font-size:12px;
  font-weight:900;
  margin-right:6px;
}
*/

/*
CSS追加推奨:
.versionBadge{
  display:inline-block;
  margin-left:8px;
  padding:4px 8px;
  border-radius:999px;
  background:#ecfeff;
  color:#0e7490;
  border:1px solid #a5f3fc;
  font-size:12px;
  font-weight:900;
}
*/

/*
CSS追加推奨:
.medicalHistoryNotice{
  margin-top:8px;
  padding:8px 10px;
  border-radius:12px;
  background:#fff1f2;
  color:#be123c;
  border:1px solid #fecdd3;
  font-weight:900;
  font-size:13px;
}
*/

/*
CSS追加推奨:
.modalOverlay{position:fixed;inset:0;background:rgba(15,23,42,.55);z-index:9999;display:flex;align-items:flex-end;justify-content:center;padding:12px}
.routePreviewModal{background:#fff;border-radius:22px 22px 0 0;max-height:88vh;overflow:auto;width:min(760px,100%);padding:18px;box-shadow:0 -12px 36px rgba(15,23,42,.25)}
.routePreviewList{display:flex;flex-direction:column;gap:10px;margin-top:12px}
.routePreviewItem{display:flex;align-items:center;gap:10px;border:1px solid #bae6fd;background:#f0f9ff;border-radius:16px;padding:10px}
.routePreviewNo{width:34px;height:34px;border-radius:999px;background:#0284c7;color:#fff;display:grid;place-items:center;font-weight:900}
.routePreviewMain{flex:1}
.routePreviewBtns{display:flex;gap:6px}
*/

/*
CSS追加推奨:
.checkrow.needsSchedule{
  border-color:#f97316;
  background:#fff7ed;
}
*/

/*
CSS追加推奨:
.checkrow.needsSchedule{
  border-color:#f97316;
  background:#fff7ed;
}
*/

/*
CSS追加推奨:
.aiSummaryBox{
  background:#f8fafc;
  border:1px solid #bae6fd;
}
.aiSummaryBox .infoLine b{
  text-align:left;
  line-height:1.45;
}
*/

/*
CSS追加推奨:
.aiScheduleBox{
  border:1px solid #bae6fd;
  background:#f0f9ff;
  border-radius:16px;
  padding:12px;
  margin:10px 0;
}
.aiScheduleBox h3{
  margin:0 0 8px;
}
*/
