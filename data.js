// App State
const state = {
    currentUser: null,
    isAdmin: false,
    currentFilial: 'matriz',
    currentDate: new Date(),
    currentMonth: new Date().getMonth(),
    currentYear: new Date().getFullYear(),
    selectedDate: null,
    selectedEvent: null,
    employees: [
        { id: 1, name: 'Admin', age: 35, position: 'Gerente', startDate: '2020-01-01', completedGoals: 15, rewards: 'R$ 3.000,00', username: 'admin', password: 'admin', isAdmin: true },
        { id: 2, name: 'João Silva', age: 28, position: 'Analista', startDate: '2021-03-15', completedGoals: 8, rewards: 'R$ 1.200,00', username: 'joao', password: 'senha123' },
        { id: 3, name: 'Maria Santos', age: 24, position: 'Assistente', startDate: '2022-05-10', completedGoals: 5, rewards: 'R$ 500,00', username: 'maria', password: 'senha123' },
        { id: 4, name: 'Carlos Oliveira', age: 32, position: 'Analista', startDate: '2021-01-20', completedGoals: 10, rewards: 'R$ 1.500,00', username: 'carlos', password: 'senha123' },
        { id: 5, name: 'Ana Costa', age: 27, position: 'Assistente', startDate: '2022-02-05', completedGoals: 6, rewards: 'R$ 600,00', username: 'ana', password: 'senha123' },
        { id: 6, name: 'User', age: 30, position: 'Analista', startDate: '2021-06-15', completedGoals: 7, rewards: 'R$ 900,00', username: 'user', password: 'user' }
    ],
    goals: [
        { id: 1, title: 'Aumentar vendas em 10%', description: 'Aumentar as vendas mensais em 10% em comparação com o mês anterior', level: 1, deadline: '2023-12-31', progress: 60 },
        { id: 2, title: 'Reduzir custos operacionais', description: 'Reduzir os custos operacionais em 5% sem afetar a qualidade', level: 1, deadline: '2023-11-30', progress: 40 },
        { id: 3, title: 'Implementar novo sistema', description: 'Implementar e treinar a equipe no novo sistema de gestão', level: 2, deadline: '2023-12-15', progress: 25 },
        { id: 4, title: 'Expandir para novo mercado', description: 'Pesquisar e desenvolver plano para expansão para novo mercado', level: 3, deadline: '2024-01-31', progress: 10 },
        { id: 5, title: 'Melhorar satisfação do cliente', description: 'Aumentar a pontuação de satisfação do cliente em 15%', level: 2, deadline: '2023-11-15', progress: 75 }
    ],
    events: [
        { id: 1, title: 'Reunião de Vendas', date: '2023-10-15', goalId: 1, description: 'Discutir estratégias para aumentar vendas', assigneeId: 1 },
        { id: 2, title: 'Treinamento Sistema', date: '2023-10-20', goalId: 3, description: 'Treinamento da equipe no novo sistema', assigneeId: 2 },
        { id: 3, title: 'Análise de Custos', date: '2023-10-10', goalId: 2, description: 'Revisar e identificar áreas para redução de custos', assigneeId: 4 },
        { id: 4, title: 'Pesquisa de Mercado', date: '2023-10-25', goalId: 4, description: 'Coletar dados sobre potencial novo mercado', assigneeId: 6 }
    ],
    branches: [
        { id: 1, name: 'Matriz', location: 'São Paulo, SP', employees: 15, activeGoals: 8, password: 'matriz123' },
        { id: 2, name: 'Filial 1', location: 'Rio de Janeiro, RJ', employees: 8, activeGoals: 5, password: 'filial1' },
        { id: 3, name: 'Filial 2', location: 'Belo Horizonte, MG', employees: 6, activeGoals: 4, password: 'filial2' }
    ],
    rewards: {
        levels: {
            1: 50,
            2: 100,
            3: 200
        },
        multipliers: {
            'Assistente': 1.0,
            'Analista': 1.2,
            'Gerente': 1.5
        }
    },
    permissions: {
        'Assistente': {
            addActions: false,
            viewEmployees: true,
            manageGoals: false,
            registerSales: true,
            importSales: false,
            manageBranches: false,
            settings: false
        },
        'Analista': {
            addActions: true,
            viewEmployees: true,
            manageGoals: true,
            registerSales: true,
            importSales: true,
            manageBranches: false,
            settings: false
        },
        'Gerente': {
            addActions: true,
            viewEmployees: true,
            manageGoals: true,
            registerSales: true,
            importSales: true,
            manageBranches: true,
            settings: true
        }
    },
    sales: [
        { id: 1, date: '2023-10-01', branch: 'matriz', amount: 1500.00, notes: 'Vendas do dia', source: 'manual' },
        { id: 2, date: '2023-10-02', branch: 'matriz', amount: 1800.50, notes: 'Vendas do dia', source: 'manual' },
        { id: 3, date: '2023-10-03', branch: 'matriz', amount: 1650.75, notes: 'Vendas do dia', source: 'manual' },
        { id: 4, date: '2023-10-01', branch: 'filial1', amount: 950.25, notes: 'Vendas do dia', source: 'manual' },
        { id: 5, date: '2023-10-02', branch: 'filial1', amount: 1050.00, notes: 'Vendas do dia', source: 'manual' },
        { id: 6, date: '2023-10-03', branch: 'filial1', amount: 875.50, notes: 'Vendas do dia', source: 'manual' },
        { id: 7, date: '2023-10-01', branch: 'filial2', amount: 620.75, notes: 'Vendas do dia', source: 'manual' },
        { id: 8, date: '2023-10-02', branch: 'filial2', amount: 580.25, notes: 'Vendas do dia', source: 'manual' },
        { id: 9, date: '2023-10-03', branch: 'filial2', amount: 650.00, notes: 'Vendas do dia', source: 'manual' }
    ],
    salesGoals: {
        'matriz': { monthly: 50000, quarterly: 150000, yearly: 600000 },
        'filial1': { monthly: 30000, quarterly: 90000, yearly: 360000 },
        'filial2': { monthly: 25000, quarterly: 75000, yearly: 300000 }
    },
    importSettings: {
        overrideManualSales: false,
        autoMatchBranches: true
    },
    importData: {
        file: null,
        headers: [],
        data: [],
        mappings: {
            date: null,
            branch: null,
            amount: null
        },
        branchMappings: {}
    }
};
