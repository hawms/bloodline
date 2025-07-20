(function() {
    'use strict';
    // --- SCRIPT DE PROTEÇÃO CONTRA DEVTOOLS ---
    document.addEventListener('contextmenu', event => event.preventDefault());
    document.addEventListener('keydown', event => {
        if (event.keyCode === 123 || (event.ctrlKey && event.shiftKey && (event.keyCode === 73 || event.keyCode === 74 || event.keyCode === 67)) || (event.ctrlKey && event.keyCode === 85)) {
            event.preventDefault();
            return false;
        }
    });
    const devToolsCheck = () => { debugger; };
    setInterval(devToolsCheck, 1000);
})();

// 1. CONFIGURAÇÃO DO FIREBASE
const firebaseConfig = {
    apiKey: "AIzaSyBvNZEzuBoqKZ4ACd8KAuJpfoxB_EOj7ps",
    authDomain: "hawzada.firebaseapp.com",
    databaseURL: "https://hawzada-default-rtdb.firebaseio.com",
    projectId: "hawzada",
    storageBucket: "hawzada.appspot.com",
    messagingSenderId: "350650816523",
    appId: "1:350650816523:web:4d6f2d6fdb103740cb4f0e"
};

// 2. INICIALIZAÇÃO DO FIREBASE
firebase.initializeApp(firebaseConfig);
const database = firebase.database();
const pedidosRef = database.ref('pedidos');

// 3. DADOS E LÓGICA DA APLICAÇÃO
const produtos = [
    { nome: "9mm", precoVendaUnidade: 60, materiais: { polvora: 10, capsula: 10, projetilPequeno: 10 }, retornoUnidades: 10 },
    { nome: ".50", precoVendaUnidade: 100, materiais: { polvora: 20, capsula: 10, projetilGrande: 10 }, retornoUnidades: 10 },
    { nome: ".45", precoVendaUnidade: 40, materiais: { polvora: 10, capsula: 10, projetilPequeno: 10 }, retornoUnidades: 10 }, // Receita do .45 não estava na planilha, mantive a antiga como exemplo.
    { nome: ".44", precoVendaUnidade: 40, materiais: { polvora: 10, capsula: 10, projetilPequeno: 10 }, retornoUnidades: 10 }  // Receita do .44 não estava na planilha, mantive a antiga como exemplo.
];

// !! BANCO DE DADOS DE RECEITAS ATUALIZADO CONFORME A PLANILHA !!
const receitasDeCrafting = {
    // Componentes principais
    "polvora":              { produz: 10, ingredientes: { "carvao": 10, "enxofre": 5 } },
    "capsula":              { produz: 10, ingredientes: { "rolo_de_cobre": 10, "chapa_de_aluminio": 10 } },
    "projetil_pequeno":     { produz: 50, ingredientes: { "haste_de_ferro": 10 } },
    "projetil_grande":      { produz: 50, ingredientes: { "lingote_de_aco": 10 } },

    // Corrente de produção do Ferro
    "haste_de_ferro":       { produz: 1,  ingredientes: { "chapa_de_ferro": 1 } },
    "chapa_de_ferro":       { produz: 5,  ingredientes: { "lingote_de_ferro": 1 } },
    "lingote_de_ferro":     { produz: 1,  ingredientes: { "minerio_de_ferro": 10 } },

    // Corrente de produção do Cobre
    "rolo_de_cobre":        { produz: 5,  ingredientes: { "lingote_de_cobre": 1 } },
    "lingote_de_cobre":     { produz: 1,  ingredientes: { "minerio_de_cobre": 10 } },

    // Corrente de produção do Alumínio
    "chapa_de_aluminio":    { produz: 5,  ingredientes: { "lingote_de_aluminio": 1 } },
    "lingote_de_aluminio":  { produz: 1,  ingredientes: { "fragmento_de_aluminio": 15 } },
    
    // Corrente de produção do Aço
    "lingote_de_aco":       { produz: 1,  ingredientes: { "liga_de_aco_bruta": 10 } },
    "liga_de_aco_bruta":    { produz: 5,  ingredientes: { "carvao": 5, "minerio_de_ferro": 5 } },
};


let pedidoAtual = [];
let todosOsPedidos = {};
let cacheDeCustos = {}; 

// --- MOTOR DE CÁLCULO DE CUSTO ---
function getCostOf(itemId, custosBase) {
    if (cacheDeCustos[itemId] !== undefined) {
        return cacheDeCustos[itemId];
    }
    if (custosBase[itemId] !== undefined) {
        return custosBase[itemId];
    }
    const receita = receitasDeCrafting[itemId];
    if (receita) {
        let custoTotalDaReceita = 0;
        for (const ingredienteId in receita.ingredientes) {
            const quantidade = receita.ingredientes[ingredienteId];
            const custoDoIngrediente = getCostOf(ingredienteId, custosBase);
            custoTotalDaReceita += quantidade * custoDoIngrediente;
        }
        const custoPorUnidade = custoTotalDaReceita / receita.produz;
        cacheDeCustos[itemId] = custoPorUnidade; 
        return custoPorUnidade;
    }
    return 0;
}

function lerCustosMateriasPrimasBasicas() {
    return {
        "minerio_de_ferro":       parseFloat(document.getElementById('custo-minerio_de_ferro').value) || 0,
        "carvao":                 parseFloat(document.getElementById('custo-carvao').value) || 0,
        "enxofre":                parseFloat(document.getElementById('custo-enxofre').value) || 0,
        "minerio_de_cobre":       parseFloat(document.getElementById('custo-minerio_de_cobre').value) || 0,
        "fragmento_de_aluminio":  parseFloat(document.getElementById('custo-fragmento_de_aluminio').value) || 0
    };
}

// --- Funções do Carrinho ---
function recalcularCustosELucros() {
    cacheDeCustos = {}; 
    const custosBasicos = lerCustosMateriasPrimasBasicas();

    pedidoAtual.forEach(item => {
        let custoItem = 0;
        for (const materialId in item.materiais) {
            const quantidadeMaterial = item.materiais[materialId];
            const custoUnitarioMaterial = getCostOf(materialId, custosBasicos);
            custoItem += quantidadeMaterial * custoUnitarioMaterial;
        }
        item.custo = custoItem;
        item.lucro = item.valorVenda - item.custo;
    });
}

function adicionarAoPedido() {
    const unidades = parseInt(document.getElementById('qtyProducao').value);
    const municaoSelecionada = document.getElementById('ammo-select').value;
    if (isNaN(unidades) || unidades < 1) { alert("Insira uma quantidade de unidades válida."); return; }
    const produtoInfo = produtos.find(p => p.nome === municaoSelecionada);
    if (!produtoInfo) return;

    const materiaisCalculados = {};
    for (const mat in produtoInfo.materiais) {
        const materialPorUnidade = produtoInfo.materiais[mat] / produtoInfo.retornoUnidades;
        materiaisCalculados[mat] = Math.ceil(materialPorUnidade * unidades);
    }

    const item = {
        id: Date.now(),
        nome: produtoInfo.nome,
        unidades: unidades,
        valorVenda: unidades * produtoInfo.precoVendaUnidade,
        materiais: materiaisCalculados,
        custo: 0, 
        lucro: 0,
    };
    pedidoAtual.push(item);
    atualizarExibicaoPedido();
}

function atualizarExibicaoPedido() {
    const itemsContainer = document.getElementById('current-order-items');
    const summaryContainer = document.getElementById('current-order-summary');
    itemsContainer.innerHTML = '';
    summaryContainer.innerHTML = '';
    if (pedidoAtual.length === 0) {
        itemsContainer.innerHTML = '<p class="empty-cart-message">O pedido está vazio.</p>';
        return;
    }
    
    recalcularCustosELucros(); 

    pedidoAtual.forEach(item => {
        itemsContainer.innerHTML += `<div class="order-item"><div class="order-item-details"><strong>${item.unidades}x Unidade(s) de ${item.nome}</strong><br><small>Valor: $${item.valorVenda.toLocaleString('pt-BR')}</small></div><button class="order-item-remove-btn" onclick="removerDoPedido(${item.id})">X</button></div>`;
    });

    const totais = calcularTotais(pedidoAtual);

    let materiaisHTML = ``;
    for(const mat in totais.materiais){
        let nomeMaterial = mat.replace(/_/g, " "); 
        nomeMaterial = nomeMaterial.charAt(0).toUpperCase() + nomeMaterial.slice(1);
        materiaisHTML += `<li>${(totais.materiais[mat] || 0).toLocaleString('pt-BR')} ${nomeMaterial}</li>`
    }

    summaryContainer.innerHTML = `
        <h3>Totais do Pedido</h3>
        <h4>Materiais Necessários:</h4>
        <ul>${materiaisHTML}</ul>
        <h4>Financeiro:</h4>
        <div class="summary-line">
            <span>Valor de Venda:</span>
            <span>$${totais.valorVenda.toLocaleString('pt-BR')}</span>
        </div>
        <div class="summary-line">
            <span>Custo de Produção:</span>
            <span class="text-danger">-$${totais.custo.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
        <hr style="border-color: #555; border-style: dashed; margin: 10px 0;">
        <div class="summary-line" style="font-weight: bold; font-size: 1.2em;">
            <span>Lucro Total:</span>
            <span class="text-success">$${totais.lucro.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
    `;
}

function removerDoPedido(itemId) {
    pedidoAtual = pedidoAtual.filter(item => item.id !== itemId);
    atualizarExibicaoPedido();
}

function calcularTotais(itens) {
    return itens.reduce((acc, item) => {
        acc.valorVenda += item.valorVenda;
        acc.custo += item.custo;
        acc.lucro += item.lucro;
        for (const mat in item.materiais) {
            acc.materiais[mat] = (acc.materiais[mat] || 0) + item.materiais[mat];
        }
        return acc;
    }, { valorVenda: 0, custo: 0, lucro: 0, materiais: {} });
}

function salvarPedido() {
    const nomeCliente = document.getElementById('client-name').value.trim();
    if (pedidoAtual.length === 0) { alert("Adicione itens ao pedido."); return; }
    if (nomeCliente === "") { alert("Insira o nome do cliente."); return; }

    recalcularCustosELucros(); 
    const totais = calcularTotais(pedidoAtual);

    const pedidoFinal = {
        nomeCliente: nomeCliente,
        itens: pedidoAtual,
        totais: totais,
        status: 'pendente',
        data: new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
    };

    pedidosRef.push(pedidoFinal).then(() => {
        pedidoAtual = [];
        document.getElementById('client-name').value = '';
        atualizarExibicaoPedido();
    }).catch(error => console.error("Erro ao salvar pedido: ", error));
}


// --- Funções do Histórico e Modal ---
function exibirHistorico(snapshot) {
    const pendingList = document.getElementById('pending-orders-list');
    const deliveredList = document.getElementById('delivered-orders-list');
    pendingList.innerHTML = '';
    deliveredList.innerHTML = '';
    
    todosOsPedidos = snapshot.val() || {};

    if (Object.keys(todosOsPedidos).length === 0) {
        pendingList.innerHTML = '<p>Nenhum pedido pendente.</p>';
        deliveredList.innerHTML = '<p>Nenhum pedido entregue.</p>';
        return;
    }

    const pedidosArray = Object.keys(todosOsPedidos).map(key => ({ id: key, ...todosOsPedidos[key] })).reverse();
    
    let pendingCount = 0;
    let deliveredCount = 0;

    pedidosArray.forEach(pedido => {
        const itemHTML = `
            <div class="history-item ${pedido.status === 'pendente' ? 'pending-item' : 'delivered-item'}" 
                 ${pedido.status === 'pendente' ? `onclick="abrirDetalhesPedido('${pedido.id}')"` : ''}>
                <div class="history-item-header">
                    <span class="client-name">${pedido.nomeCliente}</span>
                    <span class="order-date">${pedido.data}</span>
                </div>
                <div class="history-item-footer">
                    Valor Total: $${(pedido.totais.valorVenda || 0).toLocaleString('pt-BR')}
                </div>
            </div>
        `;
        if (pedido.status === 'pendente') {
            pendingList.innerHTML += itemHTML;
            pendingCount++;
        } else {
            deliveredList.innerHTML += itemHTML;
            deliveredCount++;
        }
    });

    if (pendingCount === 0) pendingList.innerHTML = '<p>Nenhum pedido pendente.</p>';
    if (deliveredCount === 0) deliveredList.innerHTML = '<p>Nenhum pedido entregue.</p>';
}

function abrirDetalhesPedido(pedidoId) {
    const pedido = todosOsPedidos[pedidoId];
    if (!pedido) return;

    let itensHTML = '';
    pedido.itens.forEach(item => {
        itensHTML += `<li>${item.unidades}x Unidade(s) de ${item.nome} ($${item.valorVenda.toLocaleString('pt-BR')})</li>`;
    });

    let materiaisHTML = '';
    for(const mat in pedido.totais.materiais){
        let nomeMaterial = mat.replace(/_/g, " ");
        nomeMaterial = nomeMaterial.charAt(0).toUpperCase() + nomeMaterial.slice(1);
        materiaisHTML += `<li>${(pedido.totais.materiais[mat] || 0).toLocaleString('pt-BR')} ${nomeMaterial}</li>`
    }
    
    const totais = pedido.totais;
    const custo = totais.custo || 0;
    const lucro = totais.lucro || 0;

    const modalBody = document.getElementById('modal-body');
    modalBody.innerHTML = `
        <h3>Pedido de: ${pedido.nomeCliente}</h3>
        <p><strong>Data:</strong> ${pedido.data}</p>
        
        <h4>Itens do Pedido:</h4>
        <ul>${itensHTML}</ul>

        <h4>Materiais Totais:</h4>
        <ul>${materiaisHTML}</ul>

        <h4>Resumo Financeiro:</h4>
        <div class="summary-line">
            <span>Valor de Venda Total:</span>
            <span>$${totais.valorVenda.toLocaleString('pt-BR')}</span>
        </div>
        <div class="summary-line">
            <span>Custo de Produção Total:</span>
            <span class="text-danger">-$${custo.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
        <hr style="border-color: #555; border-style: dashed; margin: 10px 0;">
        <div class="summary-line" style="font-weight: bold; font-size: 1.2em;">
            <span>Lucro Total do Pedido:</span>
            <span class="text-success">$${lucro.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>

        <button id="confirm-delivery-btn" onclick="confirmarEntrega('${pedidoId}')">Confirmar Entrega</button>
    `;

    document.getElementById('details-modal').classList.add('visible');
}

function fecharDetalhes(event) {
    if (!event || event.target.id === 'details-modal') {
        document.getElementById('details-modal').classList.remove('visible');
    }
}

function confirmarEntrega(pedidoId) {
    if (confirm(`Tem certeza que deseja marcar o pedido de ${todosOsPedidos[pedidoId].nomeCliente} como entregue?`)) {
        pedidosRef.child(pedidoId).update({ status: 'entregue' })
            .then(() => fecharDetalhes())
            .catch(error => console.error("Erro ao confirmar entrega: ", error));
    }
}

function limparHistorico() {
    if (confirm("ATENÇÃO!\nIsso vai apagar PERMANENTEMENTE todos os pedidos já entregues. Deseja continuar?")) {
        const updates = {};
        for (const key in todosOsPedidos) {
            if (todosOsPedidos[key].status === 'entregue') {
                updates[key] = null;
            }
        }
        pedidosRef.update(updates);
    }
}

// --- Funções de Animação e Inicialização ---
function criarAnimacaoDeFundo() {
    const container = document.getElementById('background-animation');
    if (!container) return;
    const glockSVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white"><path d="M4,3A1,1 0 0,0 3,4V15A1,1 0 0,0 4,16H6V18H9V16H15V18H18V16H20A1,1 0 0,0 21,15V9L19,8V4A1,1 0 0,0 18,3H4M5,5H17V8H13.62L12.5,9.5L11.38,8H5V5M5,10H12.19L13,11.12V14H5V10Z" /></svg>`;
    const numGlocks = 30;
    for (let i = 0; i < numGlocks; i++) {
        const glock = document.createElement('div');
        glock.classList.add('glock');
        glock.innerHTML = glockSVG;
        glock.style.left = `${Math.random() * 100}vw`;
        glock.style.animationDuration = `${Math.random() * 5 + 8}s`;
        glock.style.animationDelay = `${Math.random() * 8}s`;
        container.appendChild(glock);
    }
}

window.onload = () => {
    criarAnimacaoDeFundo();
    atualizarExibicaoPedido(); 
};

pedidosRef.on('value', exibirHistorico);