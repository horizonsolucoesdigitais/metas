// app.js completo do sistema de metas

// ======================= VARIÁVEIS GLOBAIS =======================
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

// ======================= ESTADO INICIAL =======================
const state = {
  currentUser: null,
  isAdmin: false,
  currentFilial: '',
  currentMonth: new Date().getMonth(),
  currentYear: new Date().getFullYear(),
  employees: [],
  events: [],
  goals: [],
  branches: [],
  sales: [],
  permissions: {},
  salesGoals: {},
  selectedDate: null,
  selectedEvent: null,
};

// ======================= FUNÇÕES AUXILIARES =======================
function formatDate(date) {
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  return new Date(date).toLocaleDateString('pt-BR', options);
}

function formatMonthYear(month, year) {
  const date = new Date(year, month);
  return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function getDaysInMonth(month, year) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(month, year) {
  return new Date(year, month, 1).getDay();
}

function findEmployeeById(id) {
  return state.employees.find(employee => employee.id === id);
}

function findGoalById(id) {
  return state.goals.find(goal => goal.id === id);
}

function getEventsForDate(date) {
  return state.events.filter(event => event.date === date);
}

function getSalesForDate(date) {
  return state.sales.filter(sale => sale.date === date);
}

function getTotalSalesForDate(date) {
  const sales = getSalesForDate(date);
  return sales.reduce((total, sale) => total + sale.amount, 0);
}

function getTotalSalesForPeriod(startDate, endDate) {
  return state.sales
    .filter(sale => {
      const saleDate = new Date(sale.date);
      return saleDate >= startDate && saleDate <= endDate;
    })
    .reduce((total, sale) => total + sale.amount, 0);
}

function getTotalSalesForBranch(branch, startDate, endDate) {
  return state.sales
    .filter(sale => {
      const saleDate = new Date(sale.date);
      return sale.branch === branch && saleDate >= startDate && saleDate <= endDate;
    })
    .reduce((total, sale) => total + sale.amount, 0);
}

function getCurrentPeriodDates() {
  const today = new Date();
  let startDate, endDate;
  switch (salesPeriodSelect.value) {
    case 'day':
      startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
      break;
    case 'week':
      const dayOfWeek = today.getDay();
      const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
      startDate = new Date(today.getFullYear(), today.getMonth(), diff);
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      break;
    case 'month':
      startDate = new Date(today.getFullYear(), today.getMonth(), 1);
      endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      break;
    case 'quarter':
      const quarter = Math.floor(today.getMonth() / 3);
      startDate = new Date(today.getFullYear(), quarter * 3, 1);
      endDate = new Date(today.getFullYear(), (quarter + 1) * 3, 0);
      break;
    case 'year':
      startDate = new Date(today.getFullYear(), 0, 1);
      endDate = new Date(today.getFullYear(), 11, 31);
      break;
    case 'custom':
      startDate = salesStartDate.value ? new Date(salesStartDate.value) : new Date();
      endDate = salesEndDate.value ? new Date(salesEndDate.value) : new Date();
      break;
  }
  return { startDate, endDate };
}

function showModal(modal) {
  modal.classList.remove('hidden');
}

function hideModal(modal) {
  modal.classList.add('hidden');
}

// (continua... na próxima mensagem)
