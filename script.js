(function() {
    'use strict';

    // --- SCRIPT DE PROTEÇÃO CONTRA DEVTOOLS ---

    // 1. Bloqueia o clique com o botão direito
    document.addEventListener('contextmenu', event => event.preventDefault());

    // 2. Bloqueia atalhos de teclado comuns para devtools
    document.addEventListener('keydown', event => {
        if (event.keyCode === 123 || // F12
            (event.ctrlKey && event.shiftKey && (event.keyCode === 73 || event.keyCode === 74 || event.keyCode === 67)) || // Ctrl+Shift+I/J/C
            (event.ctrlKey && event.keyCode === 85)) { // Ctrl+U
            event.preventDefault();
            return false;
        }
    });

    // 3. Detecta a abertura do devtools e "congela" a aba
    const devToolsCheck = () => {
        // O debugger só é ativado quando as ferramentas de desenvolvedor estão abertas
        debugger;
    };

    // Executa a verificação em um intervalo para dificultar a desativação
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
    { nome: ".50", precoVendaUnidade: 100, materiais: { polvora: 20, capsula: 10, projetilGrande: 10 }, retornoUnidades: 10 },
    { nome: ".45", precoVendaUnidade: 40, materiais: { polvora: 5, capsula: 10, projetilPequeno: 10 }, retornoUnidades: 10 },
    { nome: ".44", precoVendaUnidade: 40, materiais: { polvora: 10, capsula: 10, projetilPequeno: 10 }, retornoUnidades: 10 },
    { nome: "9mm", precoVendaUnidade: 60, materiais: { polvora: 10, capsula: 10, projetilPequeno: 10 }, retornoUnidades: 10 }
];

let pedidoAtual = [];
let todosOsPedidos = {};

// --- Funções do Carrinho ---

function adicionarAoPedido() {
    const lotes = parseInt(document.getElementById('qtyProducao').value);
    const municaoSelecionada = document.getElementById('ammo-select').value;
    if (isNaN(lotes) || lotes < 1) { alert("Insira uma quantidade de lotes válida."); return; }
    const produtoInfo = produtos.find(p => p.nome === municaoSelecionada);
    if (!produtoInfo) return;

    const materiaisCalculados = {};
    for (const mat in produtoInfo.materiais) {
        materiaisCalculados[mat] = produtoInfo.materiais[mat] * lotes;
    }

    const item = {
        id: Date.now(),
        nome: produtoInfo.nome,
        lotes: lotes,
        unidades: produtoInfo.retornoUnidades * lotes,
        valorVenda: (produtoInfo.retornoUnidades * lotes) * produtoInfo.precoVendaUnidade,
        materiais: materiaisCalculados
    };
    pedidoAtual.push(item);
    atualizarExibicaoPedido();
}

function removerDoPedido(itemId) {
    pedidoAtual = pedidoAtual.filter(item => item.id !== itemId);
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
    pedidoAtual.forEach(item => {
        itemsContainer.innerHTML += `<div class="order-item"><div class="order-item-details"><strong>${item.lotes}x Lote(s) de ${item.nome}</strong><br><small>Valor: $${item.valorVenda.toLocaleString('pt-BR')}</small></div><button class="order-item-remove-btn" onclick="removerDoPedido(${item.id})">X</button></div>`;
    });

    const totais = calcularTotais(pedidoAtual);

    let materiaisHTML = `
        <li>${(totais.materiais.polvora || 0).toLocaleString('pt-BR')} Pólvora</li>
        <li>${(totais.materiais.capsula || 0).toLocaleString('pt-BR')} Cápsula</li>
    `;
    if (totais.materiais.projetilGrande > 0) {
        materiaisHTML += `<li>${totais.materiais.projetilGrande.toLocaleString('pt-BR')} Projétil Grande</li>`;
    }
    if (totais.materiais.projetilPequeno > 0) {
        materiaisHTML += `<li>${totais.materiais.projetilPequeno.toLocaleString('pt-BR')} Projétil Pequeno</li>`;
    }

    summaryContainer.innerHTML = `<h3>Totais do Pedido</h3><p><strong>Valor Total:</strong> $${totais.valorVenda.toLocaleString('pt-BR')}</p><ul>${materiaisHTML}</ul>`;
}

function calcularTotais(itens) {
    return itens.reduce((acc, item) => {
        acc.valorVenda += item.valorVenda;
        for (const mat in item.materiais) {
            acc.materiais[mat] = (acc.materiais[mat] || 0) + item.materiais[mat];
        }
        return acc;
    }, { valorVenda: 0, materiais: {} });
}

function salvarPedido() {
    const nomeCliente = document.getElementById('client-name').value.trim();
    if (pedidoAtual.length === 0) { alert("Adicione itens ao pedido."); return; }
    if (nomeCliente === "") { alert("Insira o nome do cliente."); return; }

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
        itensHTML += `<li>${item.lotes}x Lote(s) de ${item.nome} ($${item.valorVenda.toLocaleString('pt-BR')})</li>`;
    });

    let materiaisHTML = `
        <li>${(pedido.totais.materiais.polvora || 0).toLocaleString('pt-BR')} Pólvora</li>
        <li>${(pedido.totais.materiais.capsula || 0).toLocaleString('pt-BR')} Cápsula</li>
    `;
    if (pedido.totais.materiais.projetilGrande > 0) {
        materiaisHTML += `<li>${pedido.totais.materiais.projetilGrande.toLocaleString('pt-BR')} Projétil Grande</li>`;
    }
    if (pedido.totais.materiais.projetilPequeno > 0) {
        materiaisHTML += `<li>${pedido.totais.materiais.projetilPequeno.toLocaleString('pt-BR')} Projétil Pequeno</li>`;
    }

    const modalBody = document.getElementById('modal-body');
    modalBody.innerHTML = `
        <h3>Pedido de: ${pedido.nomeCliente}</h3>
        <p><strong>Data:</strong> ${pedido.data}</p>
        <p><strong>Valor Total:</strong> $${pedido.totais.valorVenda.toLocaleString('pt-BR')}</p>
        <h4>Itens:</h4>
        <ul>${itensHTML}</ul>
        <h4>Materiais Totais:</h4>
        <ul>${materiaisHTML}</ul>
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
};

pedidosRef.on('value', exibirHistorico);
