let loans = [];
let listeners = [];
let proximoNumero = 1250;

export function addLoan(loan) {
    loans.push({
        id: crypto.randomUUID(),
        numero: proximoNumero++,
        createdAt: new Date(),
        status: 'aberto',
        dataDevolucao: null,
        ...loan
    });
    notify();
}

export function returnLoan(id, dataDevolucaoTexto) {
    loans = loans.map((loan) => loan.id === id
        ? { ...loan, status: 'devolvido', dataDevolucao: dataDevolucaoTexto || new Date().toLocaleString('pt-BR') }
        : loan
    );
    notify();
}

export function getLoans() {
    return loans;
}

export function getLoansAbertos() {
    return loans.filter((loan) => loan.status === 'aberto');
}

export function updateLoan(id, updates) {
    loans = loans.map((loan) => loan.id === id ? { ...loan, ...updates } : loan);
    notify();
}

export function subscribe(callback) {
    listeners.push(callback);
    return () => {
        listeners = listeners.filter((listener) => listener !== callback);
    };
}

function notify() {
    listeners.forEach((callback) => callback(loans));
}