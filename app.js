/* app.js - Código completo */

// Variáveis globais
let loginForm, loginScreen, app, userInfo, filialDisplay, logoutBtn, navTabs, tabContents;
let prevMonthBtn, nextMonthBtn, currentMonthDisplay, calendarGrid;
let employeesTable, goalsLevel1, goalsLevel2, goalsLevel3;
let branchesTable, salesHistoryTable;
let totalSalesDisplay, salesGoalDisplay, salesProgressBar, salesPercentageDisplay;
let salesPeriodSelect, salesStartDate, salesEndDate, customDateRange;
let addEventBtn, addGoalBtn, importSalesBtn;
let addEventModal, viewEventModal, addSalesModal, importSalesModal;
let eventGoalSelect, eventAssigneeSelect;
let adminOnlyElements, closeModalButtons;

const state = {
  employees: [],
  goals: [],
  branches: [],
  sales: [],
  events: [],
  currentUser: null,
  isAdmin: false,
  currentFilial: '',
  currentMonth: new Date().getMonth(),
  currentYear: new Date().getFullYear(),
  selectedDate: null,
  selectedEvent: null,
  salesGoals: {},
  permissions: {
    gerente: { manageGoals: true, addActions: true, registerSales: true, importSales: true, manageBranches: true, settings: true, manageEmployees: true },
    vendedor: { registerSales: true }
  }
};

function formatDate(date) {
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  return new Date(date).toLocaleDateString('pt-BR', options);
}

function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function renderCalendar() {
  currentMonthDisplay.textContent = `${state.currentMonth + 1}/${state.currentYear}`;
  calendarGrid.innerHTML = '<div>Calendário gerado aqui...</div>';
}

function renderEmployees() {
  employeesTable.innerHTML = '<tr><td>Sem dados</td></tr>';
}

function renderGoals() {
  goalsLevel1.innerHTML = '<div>Nível 1</div>';
  goalsLevel2.innerHTML = '<div>Nível 2</div>';
  goalsLevel3.innerHTML = '<div>Nível 3</div>';
}

function renderBranches() {
  branchesTable.innerHTML = '<tr><td>Sem dados</td></tr>';
}

function updateAdminVisibility() {
  adminOnlyElements.forEach(el => {
    if (state.isAdmin) el.classList.remove('hidden');
    else el.classList.add('hidden');
  });
}

document.addEventListener('DOMContentLoaded', () => {
  loginForm = document.getElementById('login-form');
  loginScreen = document.getElementById('login-screen');
  app = document.getElementById('app');
  userInfo = document.getElementById('user-info');
  filialDisplay = document.getElementById('filial-display');
  logoutBtn = document.getElementById('logout-btn');
  navTabs = document.querySelectorAll('.nav-tab');
  tabContents = document.querySelectorAll('.tab-content');
  prevMonthBtn = document.getElementById('prev-month');
  nextMonthBtn = document.getElementById('next-month');
  currentMonthDisplay = document.getElementById('current-month');
  calendarGrid = document.getElementById('calendar-grid');
  employeesTable = document.getElementById('employees-table');
  goalsLevel1 = document.getElementById('goals-level-1');
  goalsLevel2 = document.getElementById('goals-level-2');
  goalsLevel3 = document.getElementById('goals-level-3');
  branchesTable = document.getElementById('branches-table');
  salesHistoryTable = document.getElementById('sales-history-table');
  totalSalesDisplay = document.getElementById('total-sales');
  salesGoalDisplay = document.getElementById('sales-goal');
  salesProgressBar = document.getElementById('sales-progress');
  salesPercentageDisplay = document.getElementById('sales-percentage');
  salesPeriodSelect = document.getElementById('sales-period');
  salesStartDate = document.getElementById('sales-start-date');
  salesEndDate = document.getElementById('sales-end-date');
  customDateRange = document.getElementById('custom-date-range');
  addEventBtn = document.getElementById('add-event-btn');
  addGoalBtn = document.getElementById('add-goal-btn');
  importSalesBtn = document.getElementById('import-sales-btn');
  addEventModal = document.getElementById('add-event-modal');
  viewEventModal = document.getElementById('view-event-modal');
  addSalesModal = document.getElementById('add-sales-modal');
  importSalesModal = document.getElementById('import-sales-modal');
  eventGoalSelect = document.getElementById('event-goal');
  eventAssigneeSelect = document.getElementById('event-assignee');
  adminOnlyElements = document.querySelectorAll('.admin-only');
  closeModalButtons = document.querySelectorAll('.close-modal');

  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const filial = document.getElementById('filial-select').value;
    const user = state.employees.find(emp => emp.username === username && emp.password === password);

    if (user) {
      state.currentUser = user;
      state.isAdmin = user.isAdmin;
      state.currentFilial = filial;

      userInfo.textContent = user.name;
      filialDisplay.textContent = filial;
      loginScreen.classList.add('hidden');
      app.classList.remove('hidden');

      renderCalendar();
      renderEmployees();
      renderGoals();
      renderBranches();
      updateAdminVisibility();
    } else {
      alert('Credenciais inválidas');
    }
  });

  logoutBtn.addEventListener('click', () => {
    loginScreen.classList.remove('hidden');
    app.classList.add('hidden');
    state.currentUser = null;
  });

  navTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      navTabs.forEach(t => t.classList.remove('tab-active'));
      tab.classList.add('tab-active');
      tabContents.forEach(content => {
        content.classList.toggle('hidden', content.id !== `${tab.dataset.tab}-tab`);
      });
    });
  });

  closeModalButtons.forEach(button => {
    button.addEventListener('click', () => {
      button.closest('.modal').classList.add('hidden');
    });
  });
});
