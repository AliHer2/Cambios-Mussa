// State
let config = {
    usdCop: 3300,
    usdVes: 700,
    margin: 5
};

let currentMode = 'COP_TO_VES'; // or 'VES_TO_COP'

// DOM Elements
const viewCalculator = document.getElementById('view-calculator');
const viewConfig = document.getElementById('view-config');
const btnConfig = document.getElementById('btn-config');
const btnCopVes = document.getElementById('btn-cop-ves');
const btnVesCop = document.getElementById('btn-ves-cop');

const inputAmountIn = document.getElementById('amount-in');
const labelIn = document.getElementById('label-in');
const symbolIn = document.getElementById('symbol-in');

const amountOut = document.getElementById('amount-out');
const labelOut = document.getElementById('label-out');
const symbolOut = document.getElementById('symbol-out');

const appliedRateEl = document.getElementById('applied-rate');
const baseRateEl = document.getElementById('base-rate');
const estimatedProfitEl = document.getElementById('estimated-profit');

// Config Elements
const inputUsdCop = document.getElementById('usd-cop');
const inputUsdVes = document.getElementById('usd-ves');
const inputMargin = document.getElementById('margin-profit');
const btnSaveConfig = document.getElementById('btn-save-config');
const toast = document.getElementById('toast');

// Initialization
function init() {
    loadConfig();
    setupEventListeners();
    updateUI();
}

// Load config from localStorage
function loadConfig() {
    const savedConfig = localStorage.getItem('casaCambioConfig');
    if (savedConfig) {
        config = JSON.parse(savedConfig);
    }
    // Populate config form
    inputUsdCop.value = config.usdCop;
    inputUsdVes.value = config.usdVes;
    inputMargin.value = config.margin;
}

// Save config to localStorage
function saveConfig() {
    const cop = parseFloat(inputUsdCop.value);
    const ves = parseFloat(inputUsdVes.value);
    const m = parseFloat(inputMargin.value);

    if (isNaN(cop) || isNaN(ves) || isNaN(m) || cop <= 0 || ves <= 0) {
        alert("Por favor, ingrese valores válidos mayores a 0.");
        return;
    }

    config.usdCop = cop;
    config.usdVes = ves;
    config.margin = m;

    localStorage.setItem('casaCambioConfig', JSON.stringify(config));
    
    showToast("Configuración guardada");
    toggleViews();
    calculate();
}

function showToast(message) {
    toast.innerText = message;
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Event Listeners
function setupEventListeners() {
    btnConfig.addEventListener('click', toggleViews);
    btnSaveConfig.addEventListener('click', saveConfig);

    btnCopVes.addEventListener('click', () => setMode('COP_TO_VES'));
    btnVesCop.addEventListener('click', () => setMode('VES_TO_COP'));

    // Trigger calculation on input
    inputAmountIn.addEventListener('input', calculate);
}

function toggleViews() {
    if (viewCalculator.classList.contains('active')) {
        viewCalculator.classList.remove('active');
        viewConfig.classList.add('active');
        // Update feather icon to 'X' or back
        btnConfig.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-x"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
    } else {
        viewConfig.classList.remove('active');
        viewCalculator.classList.add('active');
        // Restore settings icon
        btnConfig.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-settings"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>';
        
        // Ensure values are reverted if not saved
        inputUsdCop.value = config.usdCop;
        inputUsdVes.value = config.usdVes;
        inputMargin.value = config.margin;
    }
}

function setMode(mode) {
    currentMode = mode;
    
    if (mode === 'COP_TO_VES') {
        btnCopVes.classList.add('active');
        btnVesCop.classList.remove('active');
        
        labelIn.innerText = "Recibes (Pesos)";
        symbolIn.innerText = "$";
        
        labelOut.innerText = "Entregas (Bolívares)";
        symbolOut.innerText = "Bs.";
    } else {
        btnVesCop.classList.add('active');
        btnCopVes.classList.remove('active');
        
        labelIn.innerText = "Recibes (Bolívares)";
        symbolIn.innerText = "Bs.";
        
        labelOut.innerText = "Entregas (Pesos)";
        symbolOut.innerText = "$";
    }
    
    // Clear input or recalculate
    if(inputAmountIn.value) {
        calculate();
    } else {
        updateUI(); // just update base rates
    }
}

function formatNumber(num) {
    return num.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function calculate() {
    const amountStr = inputAmountIn.value;
    if (!amountStr || isNaN(amountStr)) {
        amountOut.innerText = "0.00";
        updateUI();
        return;
    }
    
    const amount = parseFloat(amountStr);
    const marginRatio = config.margin / 100.0;
    const baseRate = config.usdCop / config.usdVes; // COP per VES
    
    let result = 0;
    let effectiveRate = 0;
    let profitAmount = 0; // rough estimation in the output currency
    
    if (currentMode === 'COP_TO_VES') {
        // Effective rate increases (we charge more COP for a VES)
        effectiveRate = baseRate * (1 + marginRatio);
        result = amount / effectiveRate;
        
        // Profit calculation in VES (Client gives us X COP. We give them less VES than base rate)
        const fairVES = amount / baseRate;
        profitAmount = fairVES - result; // We keep this difference in VES
        
        estimatedProfitEl.innerText = formatNumber(profitAmount) + " VES";
    } else {
        // Effective rate decreases (we give less COP for a VES)
        effectiveRate = baseRate * (1 - marginRatio);
        result = amount * effectiveRate;
        
        // Profit calculation in COP (Client gives us X VES. We give them less COP than base rate)
        const fairCOP = amount * baseRate;
        profitAmount = fairCOP - result; // We keep this difference in COP
        
        estimatedProfitEl.innerText = formatNumber(profitAmount) + " COP";
    }
    
    amountOut.innerText = formatNumber(result);
    appliedRateEl.innerText = effectiveRate.toFixed(4);
    baseRateEl.innerText = baseRate.toFixed(4);
}

function updateUI() {
    const baseRate = config.usdCop / config.usdVes;
    const marginRatio = config.margin / 100.0;
    
    baseRateEl.innerText = baseRate.toFixed(4);
    
    if (currentMode === 'COP_TO_VES') {
        appliedRateEl.innerText = (baseRate * (1 + marginRatio)).toFixed(4);
        if(!inputAmountIn.value) estimatedProfitEl.innerText = "0.00 VES";
    } else {
        appliedRateEl.innerText = (baseRate * (1 - marginRatio)).toFixed(4);
        if(!inputAmountIn.value) estimatedProfitEl.innerText = "0.00 COP";
    }
}

// Start
init();
