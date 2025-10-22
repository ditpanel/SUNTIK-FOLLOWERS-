const STORAGE_BAL = 'admin_balance_v1'
const STORAGE_TXN = 'admin_txns_v1'

const API_ENDPOINT = 'https://example.com/api/transaction'; // ganti dengan API asli

const SERVICES = [
  {id:'svc_youtube', title:'Youtube', price:2000},
  {id:'svc_suntik', title:'Suntik Manual', price:5000},
  {id:'svc_smm1', title:'SMM Panel 1', price:3000},
  {id:'svc_view', title:'View TT Only', price:1500},
  {id:'svc_game', title:'Game', price:4000},
  {id:'svc_unban', title:'Ban & UnBan', price:6000},
  {id:'svc_vps', title:'VPS', price:25000},
  {id:'svc_nokos', title:'Nokos', price:12000}
]

const fmt = n => 'Rp' + Number(n).toLocaleString('id-ID')
function getBalance(){return Number(localStorage.getItem(STORAGE_BAL) || 0)}
function setBalance(v){localStorage.setItem(STORAGE_BAL, String(v)); renderBalance();}
function getTxns(){return JSON.parse(localStorage.getItem(STORAGE_TXN) || '[]')}
function addTxn(tx){const arr = getTxns(); arr.unshift(tx); localStorage.setItem(STORAGE_TXN, JSON.stringify(arr)); renderTxnCount();}

function renderBalance(){ document.getElementById('balance').textContent = fmt(getBalance()) }
function renderTxnCount(){ document.getElementById('txnCount').textContent = getTxns().length }
function renderServices(){
  const grid = document.getElementById('serviceGrid')
  grid.innerHTML=''
  SERVICES.forEach(s => {
    const el = document.createElement('div'); el.className='service-card';
    el.innerHTML = `
      <div class="icon">💠</div>
      <div class="title">${s.title}</div>
      <div class="small">${fmt(s.price)}</div>
    `
    el.addEventListener('click', ()=> openPurchase(s))
    grid.appendChild(el)
  })
}

const modal = document.getElementById('modal')
const modalContent = document.getElementById('modalContent')
function openModal(html){ modalContent.innerHTML = html; modal.setAttribute('aria-hidden','false') }
function closeModal(){ modal.setAttribute('aria-hidden','true'); modalContent.innerHTML = '' }

function openTopup(){
  openModal(`
    <h3>Isi Saldo</h3>
    <input id="topupAmt" class="input" type="number" placeholder="Masukkan nominal (Rp)" />
    <div style="display:flex;gap:8px;margin-top:8px">
      <button class="btn" id="doTopup">Topup</button>
      <button class="btn" id="doTopup10">+10.000</button>
    </div>
  `)
  document.getElementById('doTopup').onclick = ()=>{
    const v = Number(document.getElementById('topupAmt').value || 0)
    if(v<=0){alert('Masukkan nominal valid');return}
    const bal = getBalance()+v
    setBalance(bal)
    addTxn({type:'topup',amount:v,ts:Date.now()})
    closeModal()
  }
  document.getElementById('doTopup10').onclick = ()=>{
    const v = 10000
    setBalance(getBalance()+v)
    addTxn({type:'topup',amount:v,ts:Date.now()})
    closeModal()
  }
}

function openPurchase(service){
  openModal(`
    <h3>Beli: ${service.title}</h3>
    <div class="small">Harga: ${fmt(service.price)}</div>
    <input id="inputTarget" class="input" placeholder="Masukkan target/username" />
    <div style="display:flex;gap:8px;margin-top:8px">
      <button class="btn" id="confirmBuy">Beli Sekarang</button>
      <button class="btn" id="cancelBuy">Batal</button>
    </div>
  `)
  document.getElementById('cancelBuy').onclick = closeModal
  document.getElementById('confirmBuy').onclick = async ()=>{
    const target = document.getElementById('inputTarget').value.trim() || '-' 
    const price = service.price
    if(getBalance() < price){ alert('Saldo tidak cukup! Silakan isi saldo.'); return }
    setBalance(getBalance() - price)
    const txn = {type:'purchase', service:service.title, price, target, ts:Date.now(), id: 'TX'+Math.random().toString(36).slice(2,9)}
    addTxn(txn)

    // kirim data ke API
    try {
      const res = await fetch(API_ENDPOINT, {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify(txn)
      });
      if(res.ok) alert('Transaksi berhasil dan dikirim ke server!')
      else alert('Transaksi lokal berhasil tapi gagal kirim ke server.')
    } catch(e){
      alert('Server tidak merespon (offline demo).')
    }
    closeModal()
  }
}

function openMutasi(){
  const txns = getTxns()
  openModal(`
    <h3>Mutasi Saldo</h3>
    <div class="txn-list">
      ${txns.map(t=>`<div class="txn-item"><div><strong>${t.type.toUpperCase()}</strong><div class="small">${t.service?t.service:''} ${t.target?'- '+t.target:''}</div></div><div>${t.type==='topup'?fmt(t.amount):fmt(t.price)}<div class="small">${new Date(t.ts).toLocaleString()}</div></div></div>`).join('')}
    </div>
    <button class="btn" id="exportCSV" style="margin-top:10px">Export CSV</button>
  `)
  document.getElementById('exportCSV').onclick = exportCSV
}

function openRedeem(){
  openModal(`
    <h3>Redeem</h3>
    <input id="redeemCode" class="input" placeholder="Masukkan kode redeem" />
    <div style="display:flex;gap:8px;margin-top:8px">
      <button class="btn" id="doRedeem">Gunakan</button>
    </div>
  `)
  document.getElementById('doRedeem').onclick = ()=>{
    const code = document.getElementById('redeemCode').value.trim()
    if(!code){alert('Masukkan kode');return}
    if(code.toUpperCase()==='BONUS10'){
      setBalance(getBalance()+10000)
      addTxn({type:'redeem',amount:10000,code,ts:Date.now()})
      alert('Redeem berhasil +'+fmt(10000))
      closeModal()
    } else alert('Kode tidak valid')
  }
}

function exportCSV(){
  const txns = getTxns();
  if(txns.length===0){alert('Tidak ada data transaksi');return;}
  const header = ['ID','Tipe','Layanan','Target','Jumlah','Tanggal']
  const rows = txns.map(t=>[
    t.id||'-',
    t.type,
    t.service||'-',
    t.target||'-',
    t.amount||t.price||0,
    new Date(t.ts).toLocaleString()
  ])
  const csv = [header,...rows].map(r=>r.join(',')).join('\n')
  const blob = new Blob([csv],{type:'text/csv'})
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'transaksi.csv'
  a.click()
  URL.revokeObjectURL(url)
}

function init(){
  if(localStorage.getItem(STORAGE_BAL)===null) localStorage.setItem(STORAGE_BAL,'1449')
  renderBalance(); renderTxnCount(); renderServices();
  document.getElementById('btnTopup').onclick = openTopup
  document.getElementById('btnMutasi').onclick = openMutasi
  document.getElementById('btnRedeem').onclick = openRedeem
  document.getElementById('modalClose').onclick = closeModal
  document.getElementById('btnHelp').onclick = ()=> alert('Hubungi admin: +62 8123xxx (simulasi)')
  setInterval(()=> document.getElementById('datetime').textContent = new Date().toLocaleString('id-ID'),1000)
}
init()