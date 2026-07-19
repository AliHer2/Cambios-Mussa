/* ==========================================================
   CAMBIOS MUSSA v2.0 — script.js
   Módulos: Calculadora (ganancia dual), Historial (CRUD +
   filtro de fechas), Config (localStorage), Generador de
   imagen publicitaria (Canvas 2D, tema oscuro).
   ========================================================== */

// ─────────────────────────────────────────────────────────
//  STATE
// ─────────────────────────────────────────────────────────
let config = { usdCop: 4200, usdVes: 1000, margin: 5 };
let currentMode = 'COP_TO_VES'; // or 'VES_TO_COP'
let history = [];

/** Holds results of the most recent calculation (for registering) */
let lastCalc = {
    amountIn: 0, amountOut: 0,
    profitVes: 0, profitCop: 0,
    appliedRate: 0, baseRate: 0
};

// ─────────────────────────────────────────────────────────
//  DOM REFERENCES
// ─────────────────────────────────────────────────────────
const tabBtns    = document.querySelectorAll('.tab-btn');
const tabPanels  = document.querySelectorAll('.tab-content');

// Calculator
const btnCopVes     = document.getElementById('btn-cop-ves');
const btnVesCop     = document.getElementById('btn-ves-cop');
const inputAmountIn = document.getElementById('amount-in');
const labelIn       = document.getElementById('label-in');
const symbolIn      = document.getElementById('symbol-in');
const amountOutEl   = document.getElementById('amount-out');
const labelOut      = document.getElementById('label-out');
const symbolOut     = document.getElementById('symbol-out');
const appliedRateEl = document.getElementById('applied-rate');
const baseRateEl    = document.getElementById('base-rate');
const profitVesEl   = document.getElementById('profit-ves');
const profitCopEl   = document.getElementById('profit-cop');
const btnRegister   = document.getElementById('btn-register');
const btnGoPublicity= document.getElementById('btn-go-publicity');

// History
const filterFromEl        = document.getElementById('filter-from');
const filterToEl          = document.getElementById('filter-to');
const btnFilter           = document.getElementById('btn-filter');
const btnClearAll         = document.getElementById('btn-clear-all');
const historyListEl       = document.getElementById('history-list');
const summaryCountEl      = document.getElementById('summary-count');
const summaryProfitVesEl  = document.getElementById('summary-profit-ves');
const summaryProfitCopEl  = document.getElementById('summary-profit-cop');

// Config
const inputUsdCop   = document.getElementById('usd-cop');
const inputUsdVes   = document.getElementById('usd-ves');
const inputMargin   = document.getElementById('margin-profit');
const btnSaveConfig = document.getElementById('btn-save-config');
const previewBase   = document.getElementById('preview-base');
const previewApplied= document.getElementById('preview-applied');

// Publicity
const pubPhoneEl     = document.getElementById('pub-phone');
const pubAmountsEl   = document.getElementById('pub-amounts');
const pubPreviewRate = document.getElementById('pub-preview-rate');
const btnGenerateImg = document.getElementById('btn-generate-img');
const canvasWrapper  = document.getElementById('canvas-wrapper');
const pubCanvas      = document.getElementById('pub-canvas');
const btnDownloadImg = document.getElementById('btn-download-img');

// Misc
const todayDateEl = document.getElementById('today-date');
const toastEl     = document.getElementById('toast');

// ─────────────────────────────────────────────────────────
//  INIT
// ─────────────────────────────────────────────────────────
function init() {
    loadData();
    setTodayDate();
    setDefaultFilterDates();
    setupEventListeners();
    updateCalculatorUI();
    renderHistory();
    updatePublicityRatePreview();
}

function setTodayDate() {
    todayDateEl.textContent = new Date().toLocaleDateString('es-VE', {
        day: 'numeric', month: 'short', year: 'numeric'
    });
}

function setDefaultFilterDates() {
    const today = new Date();
    const first = new Date(today.getFullYear(), today.getMonth(), 1);
    filterFromEl.value = toDateInputValue(first);
    filterToEl.value   = toDateInputValue(today);
}

function toDateInputValue(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

// ─────────────────────────────────────────────────────────
//  PERSISTENCE
// ─────────────────────────────────────────────────────────
function loadData() {
    try {
        const cfg = localStorage.getItem('casaCambioConfig_v2');
        if (cfg) config = JSON.parse(cfg);

        const hist = localStorage.getItem('casaCambioHistory_v2');
        if (hist) history = JSON.parse(hist);
    } catch(e) { console.warn('loadData error:', e); }

    // Populate config form
    inputUsdCop.value = config.usdCop;
    inputUsdVes.value = config.usdVes;
    inputMargin.value = config.margin;
}

function saveData() {
    localStorage.setItem('casaCambioConfig_v2',  JSON.stringify(config));
    localStorage.setItem('casaCambioHistory_v2', JSON.stringify(history));
}

// ─────────────────────────────────────────────────────────
//  EVENT LISTENERS
// ─────────────────────────────────────────────────────────
function setupEventListeners() {
    // Tab navigation
    tabBtns.forEach(btn => btn.addEventListener('click', () => switchTab(btn.dataset.tab)));

    // Calculator
    btnCopVes.addEventListener('click', () => setMode('COP_TO_VES'));
    btnVesCop.addEventListener('click', () => setMode('VES_TO_COP'));
    inputAmountIn.addEventListener('input', calculate);
    btnRegister.addEventListener('click', registerTransaction);
    btnGoPublicity.addEventListener('click', () => switchTab('publicity'));

    // History
    btnFilter.addEventListener('click', renderHistory);
    btnClearAll.addEventListener('click', clearAllHistory);

    // Config
    [inputUsdCop, inputUsdVes, inputMargin].forEach(el =>
        el.addEventListener('input', updateRatePreview)
    );
    btnSaveConfig.addEventListener('click', saveConfig);

    // Publicity
    btnGenerateImg.addEventListener('click', generateImage);
    btnDownloadImg.addEventListener('click', downloadImage);
}

// ─────────────────────────────────────────────────────────
//  TAB NAVIGATION
// ─────────────────────────────────────────────────────────
function switchTab(tabId) {
    tabBtns.forEach(btn => {
        const active = btn.dataset.tab === tabId;
        btn.classList.toggle('active', active);
        btn.setAttribute('aria-selected', active);
    });
    tabPanels.forEach(panel => {
        panel.classList.toggle('active', panel.id === `tab-content-${tabId}`);
    });

    // Side effects
    if (tabId === 'history')   renderHistory();
    if (tabId === 'config')    updateRatePreview();
    if (tabId === 'publicity') updatePublicityRatePreview();
}

// ─────────────────────────────────────────────────────────
//  CALCULATOR
// ─────────────────────────────────────────────────────────
function setMode(mode) {
    currentMode = mode;
    btnCopVes.classList.toggle('active', mode === 'COP_TO_VES');
    btnVesCop.classList.toggle('active', mode === 'VES_TO_COP');

    if (mode === 'COP_TO_VES') {
        labelIn.textContent  = 'Recibes (Pesos COP)';
        symbolIn.textContent = '$';
        labelOut.textContent = 'Entregas (Bolívares VES)';
        symbolOut.textContent= 'Bs.';
    } else {
        labelIn.textContent  = 'Recibes (Bolívares VES)';
        symbolIn.textContent = 'Bs.';
        labelOut.textContent = 'Entregas (Pesos COP)';
        symbolOut.textContent= '$';
    }

    if (inputAmountIn.value && parseFloat(inputAmountIn.value) > 0) {
        calculate();
    } else {
        updateCalculatorUI();
    }
}

/**
 * Core calculation.
 * baseRate  = COP per 1 VES  (usdCop / usdVes)
 * appliedRate:
 *   COP→VES: higher COP/VES = client gets fewer VES → profit in VES
 *   VES→COP: lower  COP/VES = client gets fewer COP → profit in COP
 * Profit is always shown in BOTH currencies.
 */
function calculate() {
    const raw = inputAmountIn.value;
    if (!raw || isNaN(raw) || parseFloat(raw) <= 0) {
        amountOutEl.textContent = '0.00';
        lastCalc = { amountIn:0, amountOut:0, profitVes:0, profitCop:0, appliedRate:0, baseRate:0 };
        updateCalculatorUI();
        return;
    }

    const amount      = parseFloat(raw);
    const marginRatio = config.margin / 100;
    const baseRate    = config.usdCop / config.usdVes;  // COP per VES

    let result = 0, effectiveRate = 0, profitVes = 0, profitCop = 0;

    if (currentMode === 'COP_TO_VES') {
        // Client gives COP, receives VES.
        // We sell VES at a higher COP price → effectiveRate > baseRate
        effectiveRate = baseRate * (1 + marginRatio);
        result        = amount / effectiveRate;

        const fairVES = amount / baseRate;   // what client WOULD get at fair rate
        profitVes = fairVES - result;        // VES we keep
        profitCop = profitVes * baseRate;    // equivalent in COP
    } else {
        // Client gives VES, receives COP.
        // We buy VES at a lower COP price → effectiveRate < baseRate
        effectiveRate = baseRate * (1 - marginRatio);
        result        = amount * effectiveRate;

        const fairCOP = amount * baseRate;   // what client WOULD get at fair rate
        profitCop = fairCOP - result;        // COP we keep
        profitVes = profitCop / baseRate;    // equivalent in VES
    }

    lastCalc = { amountIn: amount, amountOut: result, profitVes, profitCop, appliedRate: effectiveRate, baseRate };

    amountOutEl.textContent  = fmt(result);
    appliedRateEl.textContent= effectiveRate.toFixed(4);
    baseRateEl.textContent   = baseRate.toFixed(4);
    profitVesEl.textContent  = 'Bs. ' + fmt(profitVes);
    profitCopEl.textContent  = '$ '   + fmt(profitCop);
}

/** Updates rate displays without re-running a calculation */
function updateCalculatorUI() {
    if (!config.usdVes) return;
    const baseRate    = config.usdCop / config.usdVes;
    const marginRatio = config.margin / 100;

    baseRateEl.textContent = baseRate.toFixed(4);

    if (currentMode === 'COP_TO_VES') {
        appliedRateEl.textContent = (baseRate * (1 + marginRatio)).toFixed(4);
    } else {
        appliedRateEl.textContent = (baseRate * (1 - marginRatio)).toFixed(4);
    }

    if (!inputAmountIn.value || parseFloat(inputAmountIn.value) <= 0) {
        profitVesEl.textContent = 'Bs. 0.00';
        profitCopEl.textContent = '$ 0.00';
    }
}

// ─────────────────────────────────────────────────────────
//  REGISTER TRANSACTION
// ─────────────────────────────────────────────────────────
function registerTransaction() {
    if (lastCalc.amountIn <= 0) {
        showToast('⚠️ Ingresa un monto primero');
        return;
    }

    const symbolInText  = currentMode === 'COP_TO_VES' ? 'COP' : 'VES';
    const symbolOutText = currentMode === 'COP_TO_VES' ? 'VES' : 'COP';

    const record = {
        id:           Date.now(),
        timestamp:    new Date().toISOString(),
        mode:         currentMode,
        amountIn:     lastCalc.amountIn,
        amountOut:    lastCalc.amountOut,
        appliedRate:  lastCalc.appliedRate,
        baseRate:     lastCalc.baseRate,
        profitVes:    lastCalc.profitVes,
        profitCop:    lastCalc.profitCop,
        symbolIn:     symbolInText,
        symbolOut:    symbolOutText
    };

    history.unshift(record);
    saveData();
    showToast('✓ Cambio registrado');

    // Reset calculator
    inputAmountIn.value  = '';
    lastCalc = { amountIn:0, amountOut:0, profitVes:0, profitCop:0, appliedRate:0, baseRate:0 };
    amountOutEl.textContent = '0.00';
    updateCalculatorUI();
}

// ─────────────────────────────────────────────────────────
//  HISTORY
// ─────────────────────────────────────────────────────────
function renderHistory() {
    const from = filterFromEl.value ? new Date(filterFromEl.value + 'T00:00:00') : null;
    const to   = filterToEl.value   ? new Date(filterToEl.value   + 'T23:59:59') : null;

    const filtered = history.filter(item => {
        const d = new Date(item.timestamp);
        if (from && d < from) return false;
        if (to   && d > to)   return false;
        return true;
    });

    // Totals
    let totalVes = 0, totalCop = 0;
    filtered.forEach(item => { totalVes += item.profitVes; totalCop += item.profitCop; });

    summaryCountEl.textContent     = filtered.length;
    summaryProfitVesEl.textContent = fmt(totalVes) + ' Bs';
    summaryProfitCopEl.textContent = '$ ' + fmt(totalCop);

    if (filtered.length === 0) {
        historyListEl.innerHTML = `
            <div class="empty-state">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>
                <p>No hay registros en este período.<br>Ajusta las fechas o registra un cambio.</p>
            </div>`;
        return;
    }

    historyListEl.innerHTML = filtered.map(item => {
        const d    = new Date(item.timestamp);
        const date = d.toLocaleDateString('es-VE', { day:'numeric', month:'short', year:'numeric' });
        const time = d.toLocaleTimeString('es-VE', { hour:'2-digit', minute:'2-digit' });
        const modeLabel = item.mode === 'COP_TO_VES' ? '🇨🇴 → 🇻🇪 COP→VES' : '🇻🇪 → 🇨🇴 VES→COP';
        const inSym  = item.symbolIn  === 'COP' ? '$'   : 'Bs.';
        const outSym = item.symbolOut === 'VES' ? 'Bs.' : '$';

        return `
        <div class="history-item" data-id="${item.id}">
            <div class="history-item-header">
                <span class="history-item-mode">${modeLabel}</span>
                <span class="history-item-date">${date} ${time}</span>
            </div>
            <div class="history-item-amounts">
                <span>${inSym} ${fmt(item.amountIn)} ${item.symbolIn}</span>
                <span class="arrow">→</span>
                <span>${outSym} ${fmt(item.amountOut)} ${item.symbolOut}</span>
            </div>
            <div class="history-item-profits">
                <span class="history-profit-pill pill-ves">Bs. ${fmt(item.profitVes)}</span>
                <span class="history-profit-pill pill-cop">$ ${fmt(item.profitCop)} COP</span>
            </div>
            <button class="history-item-delete" onclick="deleteRecord(${item.id})" title="Eliminar registro" aria-label="Eliminar registro">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
            </button>
        </div>`;
    }).join('');
}

function deleteRecord(id) {
    history = history.filter(item => item.id !== id);
    saveData();
    renderHistory();
    showToast('Registro eliminado');
}

function clearAllHistory() {
    if (!confirm('¿Eliminar todos los registros del historial?')) return;
    history = [];
    saveData();
    renderHistory();
    showToast('Historial limpiado');
}

// ─────────────────────────────────────────────────────────
//  CONFIG
// ─────────────────────────────────────────────────────────
function updateRatePreview() {
    const cop = parseFloat(inputUsdCop.value);
    const ves = parseFloat(inputUsdVes.value);
    const m   = parseFloat(inputMargin.value);

    if (!cop || !ves || cop <= 0 || ves <= 0) {
        previewBase.textContent    = '—';
        previewApplied.textContent = '—';
        return;
    }

    const base   = cop / ves;
    const margin = isNaN(m) ? 0 : m / 100;
    previewBase.textContent    = base.toFixed(4) + ' COP/VES';
    previewApplied.textContent = (base * (1 + margin)).toFixed(4) + ' COP/VES';
}

function saveConfig() {
    const cop = parseFloat(inputUsdCop.value);
    const ves = parseFloat(inputUsdVes.value);
    const m   = parseFloat(inputMargin.value);

    if (!cop || !ves || isNaN(m) || cop <= 0 || ves <= 0) {
        showToast('⚠️ Valores inválidos, verifica los datos');
        return;
    }

    config = { usdCop: cop, usdVes: ves, margin: m };
    saveData();
    showToast('✓ Configuración guardada');
    updateCalculatorUI();
    calculate();
    updatePublicityRatePreview();
}

// ─────────────────────────────────────────────────────────
//  PUBLICITY — Image Generator
// ─────────────────────────────────────────────────────────
function updatePublicityRatePreview() {
    if (!config.usdVes) return;
    const baseRate    = config.usdCop / config.usdVes;
    const marginRatio = config.margin / 100;
    const applied     = baseRate * (1 + marginRatio);
    pubPreviewRate.textContent = applied.toFixed(2) + ' COP/Bs';
}

function generateImage() {
    const baseRate    = config.usdCop / config.usdVes;
    const marginRatio = config.margin / 100;
    // Tasa aplicada COP/VES (cuántos COP vale 1 VES, con ganancia)
    const appliedRate = baseRate * (1 + marginRatio);

    const phone      = pubPhoneEl.value.trim()  || '314 3329002';
    const amountsRaw = pubAmountsEl.value.trim() || '10000,30000,50000,70000,100000,150000';
    const amounts    = amountsRaw.split(',')
        .map(s => parseFloat(s.trim()))
        .filter(n => !isNaN(n) && n > 0);

    if (amounts.length === 0) { showToast('⚠️ Ingresa al menos un monto'); return; }

    // Canvas size — portrait 9:16 style
    const W   = 600;
    const ROW = 54;
    const H   = 530 + amounts.length * ROW + 60;

    pubCanvas.width  = W;
    pubCanvas.height = H;

    const ctx = pubCanvas.getContext('2d');
    ctx.clearRect(0, 0, W, H);

    // ──── BACKGROUND ────────────────────────────────────
    const bgGrad = ctx.createLinearGradient(0, 0, W, H);
    bgGrad.addColorStop(0,   '#080d1a');
    bgGrad.addColorStop(0.45,'#0d1b30');
    bgGrad.addColorStop(1,   '#060b16');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // Ambient glow — top right
    const glowTR = ctx.createRadialGradient(W * 0.95, 0, 0, W * 0.95, 0, W * 0.7);
    glowTR.addColorStop(0, 'rgba(16,185,129,0.14)');
    glowTR.addColorStop(1, 'transparent');
    ctx.fillStyle = glowTR;
    ctx.fillRect(0, 0, W, H);

    // Ambient glow — bottom left
    const glowBL = ctx.createRadialGradient(0, H, 0, 0, H, W * 0.65);
    glowBL.addColorStop(0, 'rgba(59,130,246,0.12)');
    glowBL.addColorStop(1, 'transparent');
    ctx.fillStyle = glowBL;
    ctx.fillRect(0, 0, W, H);

    // Decorative dot grid — top area
    ctx.fillStyle = 'rgba(255,255,255,0.025)';
    for (let dx = 18; dx < W * 0.3; dx += 18) {
        for (let dy = 18; dy < 140; dy += 18) {
            ctx.beginPath();
            ctx.arc(dx, dy, 1.8, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    // Dot grid — bottom right
    for (let dx = W - 10; dx > W * 0.7; dx -= 18) {
        for (let dy = H - 130; dy < H - 10; dy += 18) {
            ctx.beginPath();
            ctx.arc(dx, dy, 1.8, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // ──── TOP STRIPE ────────────────────────────────────
    ctx.fillStyle = 'rgba(16,185,129,0.06)';
    ctx.fillRect(0, 0, W, 5);

    // ──── LOGO CIRCLE ───────────────────────────────────
    const logoX = W / 2, logoY = 72, logoR = 52;
    const logoGrad = ctx.createRadialGradient(logoX - 10, logoY - 10, 5, logoX, logoY, logoR);
    logoGrad.addColorStop(0, '#1de9a4');
    logoGrad.addColorStop(1, '#059669');
    ctx.beginPath();
    ctx.arc(logoX, logoY, logoR, 0, Math.PI * 2);
    ctx.fillStyle = logoGrad;
    ctx.fill();

    // Glow ring around logo
    ctx.shadowColor  = 'rgba(16,185,129,0.5)';
    ctx.shadowBlur   = 24;
    ctx.strokeStyle  = 'rgba(16,185,129,0.4)';
    ctx.lineWidth    = 2;
    ctx.stroke();
    ctx.shadowBlur   = 0;

    // Dollar sign inside logo
    ctx.fillStyle    = '#ffffff';
    ctx.font         = 'bold 44px Inter, Arial, sans-serif';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('$', logoX, logoY + 2);

    // ──── BRAND NAME ────────────────────────────────────
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle    = '#ffffff';
    ctx.font         = '800 32px Inter, Arial, sans-serif';
    ctx.letterSpacing = '1px';
    ctx.fillText('CAMBIOS', W / 2, 158);

    ctx.fillStyle = '#10b981';
    ctx.font      = '900 34px Inter, Arial, sans-serif';
    ctx.fillText('MUSSA', W / 2, 196);

    // Thin separator line under brand
    ctx.strokeStyle = 'rgba(16,185,129,0.25)';
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.moveTo(W / 2 - 80, 210);
    ctx.lineTo(W / 2 + 80, 210);
    ctx.stroke();

    // ──── TASA DEL DÍA ──────────────────────────────────
    ctx.fillStyle = '#ffffff';
    ctx.font      = '900 46px Inter, Arial, sans-serif';
    ctx.fillText('TASA DEL DÍA', W / 2, 268);

    // Date subtitle
    const today = new Date();
    const dateStr = today.toLocaleDateString('es-VE', { day: 'numeric', month: 'long', year: 'numeric' });
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font      = '500 16px Inter, Arial, sans-serif';
    ctx.fillText(dateStr, W / 2, 292);

    // ──── COLOMBIA – VENEZUELA BANNER ───────────────────
    const bX = 40, bY = 310, bW = W - 80, bH = 46;
    ctx.save();
    roundRectPath(ctx, bX, bY, bW, bH, 23);
    const bannerG = ctx.createLinearGradient(bX, bY, bX + bW, bY);
    bannerG.addColorStop(0,   '#b91c1c');
    bannerG.addColorStop(0.5, '#dc2626');
    bannerG.addColorStop(1,   '#b91c1c');
    ctx.fillStyle = bannerG;
    ctx.fill();
    ctx.restore();

    ctx.fillStyle    = '#ffffff';
    ctx.font         = '800 20px Inter, Arial, sans-serif';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('COLOMBIA  ─  VENEZUELA', W / 2, bY + bH / 2);
    ctx.textBaseline = 'alphabetic';

    // ──── FLAGS + RATE ───────────────────────────────────
    const rateY = 418;

    // Flags
    ctx.font      = '48px serif';
    ctx.textAlign = 'center';
    ctx.fillText('🇨🇴', W / 2 - 140, rateY - 4);
    ctx.fillText('🇻🇪', W / 2 + 140, rateY - 4);

    // Rate number — large and highlighted
    const rateStr = appliedRate.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    ctx.fillStyle    = '#10b981';
    ctx.font         = '900 72px Inter, Arial, sans-serif';
    ctx.textAlign    = 'center';

    // Subtle glow behind rate
    ctx.shadowColor  = 'rgba(16,185,129,0.5)';
    ctx.shadowBlur   = 20;
    ctx.fillText(rateStr, W / 2, rateY);
    ctx.shadowBlur   = 0;

    // Caption under rate
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.font      = '500 14px Inter, Arial, sans-serif';
    ctx.fillText('COP por cada Bolívar (Bs)', W / 2, rateY + 24);

    // ──── TABLE ──────────────────────────────────────────
    const tX   = 30;
    const tY   = rateY + 55;
    const tW   = W - 60;
    const midX = tX + tW / 2;
    const colL = tX + tW / 4;
    const colR = tX + (tW * 3) / 4;

    // Table header row
    ctx.fillStyle = 'rgba(16,185,129,0.12)';
    roundRectPath(ctx, tX, tY, tW, 40, [8, 8, 0, 0]);
    ctx.fill();

    ctx.strokeStyle = 'rgba(16,185,129,0.2)';
    ctx.lineWidth   = 1;
    roundRectPath(ctx, tX, tY, tW, 40, [8, 8, 0, 0]);
    ctx.stroke();

    ctx.fillStyle    = 'rgba(255,255,255,0.55)';
    ctx.font         = '700 13px Inter, Arial, sans-serif';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('💰 PESOS (COP)', colL, tY + 20);
    ctx.fillText('🏦 BOLÍVARES (VES)', colR, tY + 20);

    // Center divider line
    ctx.strokeStyle = 'rgba(255,255,255,0.07)';
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.moveTo(midX, tY);
    ctx.lineTo(midX, tY + 40 + amounts.length * ROW);
    ctx.stroke();

    // Table rows
    amounts.forEach((copAmt, i) => {
        const vesAmt  = copAmt / appliedRate;
        const rowY    = tY + 40 + i * ROW;
        const isEven  = i % 2 === 0;

        // Row background
        ctx.fillStyle = isEven ? 'rgba(255,255,255,0.035)' : 'rgba(255,255,255,0.015)';
        const isLast  = i === amounts.length - 1;
        roundRectPath(ctx, tX, rowY, tW, ROW,
            isLast ? [0, 0, 8, 8] : [0, 0, 0, 0]);
        ctx.fill();

        // COP amount
        const copStr = '$ ' + copAmt.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
        ctx.fillStyle    = '#ffffff';
        ctx.font         = '700 21px Inter, Arial, sans-serif';
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(copStr, colL, rowY + ROW / 2);

        // VES amount
        const vesStr = vesAmt.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        ctx.fillStyle = '#10b981';
        ctx.font      = '800 21px Inter, Arial, sans-serif';
        ctx.fillText(vesStr, colR, rowY + ROW / 2);

        // Row separator (not on last)
        if (!isLast) {
            ctx.strokeStyle = 'rgba(255,255,255,0.05)';
            ctx.lineWidth   = 1;
            ctx.beginPath();
            ctx.moveTo(tX, rowY + ROW);
            ctx.lineTo(tX + tW, rowY + ROW);
            ctx.stroke();
        }
    });

    // Table outer border
    const tHTotal = 40 + amounts.length * ROW;
    ctx.strokeStyle = 'rgba(255,255,255,0.07)';
    ctx.lineWidth   = 1;
    roundRectPath(ctx, tX, tY, tW, tHTotal, 8);
    ctx.stroke();

    // ──── FOOTER ─────────────────────────────────────────
    const footY = tY + tHTotal + 26;

    // Phone pill
    const pillW = 280, pillH = 44;
    const pillX = (W - pillW) / 2;
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    roundRectPath(ctx, pillX, footY, pillW, pillH, 22);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth   = 1;
    ctx.stroke();

    ctx.fillStyle    = '#ffffff';
    ctx.font         = '700 20px Inter, Arial, sans-serif';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('📞 ' + phone, W / 2, footY + pillH / 2);

    // Tagline
    ctx.fillStyle    = 'rgba(255,255,255,0.22)';
    ctx.font         = '600 13px Inter, Arial, sans-serif';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('Cambios Mussa • Casa de Cambio Confiable', W / 2, footY + pillH + 26);

    // Bottom accent line
    ctx.fillStyle = 'rgba(16,185,129,0.06)';
    ctx.fillRect(0, H - 4, W, 4);

    // Show canvas
    canvasWrapper.style.display = 'flex';
    setTimeout(() => canvasWrapper.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 100);
    showToast('✓ Imagen generada');
}

/** Helper: draw rounded-rectangle path */
function roundRectPath(ctx, x, y, w, h, r) {
    if (typeof r === 'number') r = [r, r, r, r]; // [tl, tr, br, bl]
    ctx.beginPath();
    ctx.moveTo(x + r[0], y);
    ctx.lineTo(x + w - r[1], y);
    ctx.quadraticCurveTo(x + w, y,     x + w, y + r[1]);
    ctx.lineTo(x + w, y + h - r[2]);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r[2], y + h);
    ctx.lineTo(x + r[3], y + h);
    ctx.quadraticCurveTo(x, y + h,     x, y + h - r[3]);
    ctx.lineTo(x, y + r[0]);
    ctx.quadraticCurveTo(x, y,         x + r[0], y);
    ctx.closePath();
}

function downloadImage() {
    const dateStr = new Date().toISOString().split('T')[0];
    const link    = document.createElement('a');
    link.download = `cambios-mussa-tasa-${dateStr}.png`;
    link.href     = pubCanvas.toDataURL('image/png');
    link.click();
    showToast('📥 Descargando imagen…');
}

// ─────────────────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────────────────
function fmt(n) {
    return n.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function showToast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastEl._t);
    toastEl._t = setTimeout(() => toastEl.classList.remove('show'), 3200);
}

// ─────────────────────────────────────────────────────────
//  BOOT
// ─────────────────────────────────────────────────────────
init();
