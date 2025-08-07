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


// Helper Functions
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
            const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Adjust for Sunday
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

function showTab(tabId) {
    navTabs.forEach(tab => {
        if (tab.dataset.tab === tabId) {
            tab.classList.add('tab-active');
        } else {
            tab.classList.remove('tab-active');
        }
    });

    tabContents.forEach(content => {
        if (content.id === `${tabId}-tab`) {
            content.classList.remove('hidden');
        } else {
            content.classList.add('hidden');
        }
    });
    
    // Special handling for sales tab
    if (tabId === 'sales') {
        updateSalesSummary();
        renderSalesHistory();
    }
}

function updateAdminVisibility() {
    adminOnlyElements.forEach(element => {
        if (state.isAdmin || (state.currentUser && state.permissions[state.currentUser.position]?.settings)) {
            element.classList.remove('hidden');
        } else {
            element.classList.add('hidden');
        }
    });

    // Show/hide tabs based on permissions
    if (state.currentUser) {
        const position = state.currentUser.position;
        const permissions = state.permissions[position];
        
        document.querySelector('[data-tab="branches"]').classList.toggle('hidden', !permissions.manageBranches && !state.isAdmin);
        document.querySelector('[data-tab="settings"]').classList.toggle('hidden', !permissions.settings && !state.isAdmin);
        
        // Update button visibility based on permissions
        addEventBtn.classList.toggle('hidden', !permissions.addActions && !state.isAdmin);
        addGoalBtn.classList.toggle('hidden', !permissions.manageGoals && !state.isAdmin);
        importSalesBtn.classList.toggle('hidden', !permissions.importSales && !state.isAdmin);
    }
}

// Render Functions
function renderCalendar() {
    const daysInMonth = getDaysInMonth(state.currentMonth, state.currentYear);
    const firstDay = getFirstDayOfMonth(state.currentMonth, state.currentYear);
    
    currentMonthDisplay.textContent = formatMonthYear(state.currentMonth, state.currentYear);
    calendarGrid.innerHTML = '';
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
        const emptyCell = document.createElement('div');
        emptyCell.className = 'border border-gray-200 bg-gray-50';
        calendarGrid.appendChild(emptyCell);
    }
    
    // Add cells for each day of the month
    for (let day = 1; day <= daysInMonth; day++) {
        const date = `${state.currentYear}-${String(state.currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const events = getEventsForDate(date);
        const sales = getSalesForDate(date);
        const totalSales = getTotalSalesForDate(date);
        
        const dayCell = document.createElement('div');
        dayCell.className = 'calendar-day border border-gray-200 p-2 relative';
        dayCell.dataset.date = date;
        
        const dayHeader = document.createElement('div');
        dayHeader.className = 'flex justify-between items-center mb-2';
        
        const dayNumber = document.createElement('span');
        dayNumber.className = 'font-medium';
        dayNumber.textContent = day;
        
        dayHeader.appendChild(dayNumber);
        dayCell.appendChild(dayHeader);
        
        const eventsList = document.createElement('div');
        eventsList.className = 'space-y-1';
        
        events.forEach(event => {
            const eventItem = document.createElement('div');
            eventItem.className = 'text-xs p-1 rounded cursor-pointer hover:bg-gray-100';
            eventItem.dataset.eventId = event.id;
            
            if (event.goalId) {
                const goal = findGoalById(event.goalId);
                if (goal) {
                    eventItem.classList.add(`bg-gray-${100 * goal.level}`);
                }
            }
            
            eventItem.textContent = event.title;
            eventItem.addEventListener('click', () => {
                state.selectedEvent = event;
                showEventDetails(event);
            });
            
            eventsList.appendChild(eventItem);
        });
        
        dayCell.appendChild(eventsList);
        
        // Add sales badge if there are permissions
        if (state.currentUser && (state.permissions[state.currentUser.position]?.registerSales || state.isAdmin)) {
            const salesBadge = document.createElement('div');
            salesBadge.className = 'sales-badge';
            salesBadge.innerHTML = '<i class="fas fa-dollar-sign"></i>';
            salesBadge.addEventListener('click', (e) => {
                e.stopPropagation();
                state.selectedDate = date;
                showAddSalesModal();
            });
            dayCell.appendChild(salesBadge);
        }
        
        // Show sales value if there are sales for this date
        if (totalSales > 0) {
            const salesValue = document.createElement('div');
            salesValue.className = 'sales-value';
            salesValue.textContent = formatCurrency(totalSales);
            dayCell.appendChild(salesValue);
        }
        
        if (events.length < 3) {
            dayCell.addEventListener('click', (e) => {
                if (e.target === dayCell || e.target === dayHeader || e.target === dayNumber) {
                    state.selectedDate = date;
                    showAddEventModal();
                }
            });
        }
        
        calendarGrid.appendChild(dayCell);
    }
}

function renderEmployees() {
    employeesTable.innerHTML = '';
    
    state.employees.forEach(employee => {
        const row = document.createElement('tr');
        
        const nameCell = document.createElement('td');
        nameCell.className = 'px-6 py-4 whitespace-nowrap';
        nameCell.innerHTML = `<div class="font-medium">${employee.name}</div>`;
        
        const ageCell = document.createElement('td');
        ageCell.className = 'px-6 py-4 whitespace-nowrap';
        ageCell.textContent = employee.age;
        
        const positionCell = document.createElement('td');
        positionCell.className = 'px-6 py-4 whitespace-nowrap';
        positionCell.textContent = employee.position;
        
        const startDateCell = document.createElement('td');
        startDateCell.className = 'px-6 py-4 whitespace-nowrap';
        startDateCell.textContent = formatDate(employee.startDate);
        
        const goalsCell = document.createElement('td');
        goalsCell.className = 'px-6 py-4 whitespace-nowrap';
        goalsCell.textContent = employee.completedGoals;
        
        const rewardsCell = document.createElement('td');
        rewardsCell.className = 'px-6 py-4 whitespace-nowrap';
        rewardsCell.textContent = employee.rewards;
        
        const actionsCell = document.createElement('td');
        actionsCell.className = 'px-6 py-4 whitespace-nowrap text-right text-sm';
        
        if (state.isAdmin || (state.currentUser && state.permissions[state.currentUser.position]?.manageEmployees)) {
            const editBtn = document.createElement('button');
            editBtn.className = 'text-gray-600 hover:text-gray-900 mr-3';
            editBtn.innerHTML = '<i class="fas fa-edit"></i>';
            
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'text-red-600 hover:text-red-900';
            deleteBtn.innerHTML = '<i class="fas fa-trash-alt"></i>';
            
            actionsCell.appendChild(editBtn);
            actionsCell.appendChild(deleteBtn);
        }
        
        row.appendChild(nameCell);
        row.appendChild(ageCell);
        row.appendChild(positionCell);
        row.appendChild(startDateCell);
        row.appendChild(goalsCell);
        row.appendChild(rewardsCell);
        row.appendChild(actionsCell);
        
        employeesTable.appendChild(row);
    });
}

function renderGoals() {
    goalsLevel1.innerHTML = '';
    goalsLevel2.innerHTML = '';
    goalsLevel3.innerHTML = '';
    
    state.goals.forEach(goal => {
        const goalElement = document.createElement('div');
        goalElement.className = 'border border-gray-200 rounded-md p-4';
        
        const header = document.createElement('div');
        header.className = 'flex justify-between items-center mb-2';
        
        const title = document.createElement('h4');
        title.className = 'font-medium';
        title.textContent = goal.title;
        
        const deadline = document.createElement('span');
        deadline.className = 'text-xs text-gray-500';
        deadline.textContent = `Prazo: ${formatDate(goal.deadline)}`;
        
        header.appendChild(title);
        header.appendChild(deadline);
        
        const description = document.createElement('p');
        description.className = 'text-sm text-gray-600 mb-3';
        description.textContent = goal.description;
        
        const progressContainer = document.createElement('div');
        progressContainer.className = 'mt-2';
        
        const progressLabel = document.createElement('div');
        progressLabel.className = 'flex justify-between text-xs text-gray-500 mb-1';
        
        const progressText = document.createElement('span');
        progressText.textContent = 'Progresso';
        
        const progressPercent = document.createElement('span');
        progressPercent.textContent = `${goal.progress}%`;
        
        progressLabel.appendChild(progressText);
        progressLabel.appendChild(progressPercent);
        
        const progressBar = document.createElement('div');
        progressBar.className = 'progress-bar';
        
        const progressFill = document.createElement('div');
        progressFill.className = 'progress-fill';
        progressFill.style.width = `${goal.progress}%`;
        
        progressBar.appendChild(progressFill);
        
        progressContainer.appendChild(progressLabel);
        progressContainer.appendChild(progressBar);
        
        goalElement.appendChild(header);
        goalElement.appendChild(description);
        goalElement.appendChild(progressContainer);
        
        if (goal.level === 1) {
            goalsLevel1.appendChild(goalElement);
        } else if (goal.level === 2) {
            goalsLevel2.appendChild(goalElement);
        } else if (goal.level === 3) {
            goalsLevel3.appendChild(goalElement);
        }
    });
}

function renderBranches() {
    branchesTable.innerHTML = '';
    
    state.branches.forEach(branch => {
        const row = document.createElement('tr');
        
        const nameCell = document.createElement('td');
        nameCell.className = 'px-6 py-4 whitespace-nowrap';
        nameCell.innerHTML = `<div class="font-medium">${branch.name}</div>`;
        
        const locationCell = document.createElement('td');
        locationCell.className = 'px-6 py-4 whitespace-nowrap';
        locationCell.textContent = branch.location;
        
        const employeesCell = document.createElement('td');
        employeesCell.className = 'px-6 py-4 whitespace-nowrap';
        employeesCell.textContent = branch.employees;
        
        const goalsCell = document.createElement('td');
        goalsCell.className = 'px-6 py-4 whitespace-nowrap';
        goalsCell.textContent = branch.activeGoals;
        
        const actionsCell = document.createElement('td');
        actionsCell.className = 'px-6 py-4 whitespace-nowrap text-right text-sm';
        
        const editBtn = document.createElement('button');
        editBtn.className = 'text-gray-600 hover:text-gray-900 mr-3';
        editBtn.innerHTML = '<i class="fas fa-edit"></i>';
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'text-red-600 hover:text-red-900';
        deleteBtn.innerHTML = '<i class="fas fa-trash-alt"></i>';
        
        actionsCell.appendChild(editBtn);
        actionsCell.appendChild(deleteBtn);
        
        row.appendChild(nameCell);
        row.appendChild(locationCell);
        row.appendChild(employeesCell);
        row.appendChild(goalsCell);
        row.appendChild(actionsCell);
        
        branchesTable.appendChild(row);
    });
}

function renderSalesHistory() {
    salesHistoryTable.innerHTML = '';
    
    // Sort sales by date (newest first)
    const sortedSales = [...state.sales].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    sortedSales.forEach(sale => {
        const row = document.createElement('tr');
        
        const dateCell = document.createElement('td');
        dateCell.className = 'px-6 py-4 whitespace-nowrap';
        dateCell.textContent = formatDate(sale.date);
        
        const branchCell = document.createElement('td');
        branchCell.className = 'px-6 py-4 whitespace-nowrap';
        const branchName = state.branches.find(b => b.name.toLowerCase() === sale.branch || b.id === sale.branch)?.name || sale.branch;
        branchCell.textContent = branchName;
        
        const amountCell = document.createElement('td');
        amountCell.className = 'px-6 py-4 whitespace-nowrap text-right';
        amountCell.textContent = formatCurrency(sale.amount);
        
        const sourceCell = document.createElement('td');
        sourceCell.className = 'px-6 py-4 whitespace-nowrap';
        if (sale.source === 'manual') {
            sourceCell.innerHTML = '<span class="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">Manual</span>';
        } else if (sale.source === 'import') {
            sourceCell.innerHTML = '<span class="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">Importado</span>';
        }
        
        const actionsCell = document.createElement('td');
        actionsCell.className = 'px-6 py-4 whitespace-nowrap text-right text-sm';
        
        const editBtn = document.createElement('button');
        editBtn.className = 'text-gray-600 hover:text-gray-900 mr-3';
        editBtn.innerHTML = '<i class="fas fa-edit"></i>';
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'text-red-600 hover:text-red-900';
        deleteBtn.innerHTML = '<i class="fas fa-trash-alt"></i>';
        
        actionsCell.appendChild(editBtn);
        actionsCell.appendChild(deleteBtn);
        
        row.appendChild(dateCell);
        row.appendChild(branchCell);
        row.appendChild(amountCell);
        row.appendChild(sourceCell);
        row.appendChild(actionsCell);
        
        salesHistoryTable.appendChild(row);
    });
}

function updateSalesSummary() {
    const { startDate, endDate } = getCurrentPeriodDates();
    
    // Calculate total sales for the period
    const totalSales = getTotalSalesForPeriod(startDate, endDate);
    
    // Get the appropriate goal based on the period
    let goal = 0;
    const period = salesPeriodSelect.value;
    
    if (period === 'month') {
        goal = Object.values(state.salesGoals).reduce((total, goals) => total + goals.monthly, 0);
    } else if (period === 'quarter') {
        goal = Object.values(state.salesGoals).reduce((total, goals) => total + goals.quarterly, 0);
    } else if (period === 'year') {
        goal = Object.values(state.salesGoals).reduce((total, goals) => total + goals.yearly, 0);
    } else {
        // For day, week, or custom, use a proportional part of the monthly goal
        const daysInMonth = getDaysInMonth(new Date().getMonth(), new Date().getFullYear());
        const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
        const proportion = daysDiff / daysInMonth;
        goal = Object.values(state.salesGoals).reduce((total, goals) => total + goals.monthly * proportion, 0);
    }
    
    // Update the displays
    totalSalesDisplay.textContent = formatCurrency(totalSales);
    salesGoalDisplay.textContent = formatCurrency(goal);
    
    const percentage = goal > 0 ? Math.min(100, Math.round((totalSales / goal) * 100)) : 0;
    salesProgressBar.style.width = `${percentage}%`;
    salesPercentageDisplay.textContent = `${percentage}%`;
}

function showEventDetails(event) {
    document.getElementById('view-event-title').textContent = event.title;
    document.getElementById('view-event-date').textContent = formatDate(event.date);
    
    const goalContainer = document.getElementById('view-event-goal-container');
    const goalElement = document.getElementById('view-event-goal');
    
    if (event.goalId) {
        const goal = findGoalById(event.goalId);
        if (goal) {
            goalElement.textContent = goal.title;
            goalContainer.classList.remove('hidden');
        } else {
            goalContainer.classList.add('hidden');
        }
    } else {
        goalContainer.classList.add('hidden');
    }
    
    document.getElementById('view-event-description').textContent = event.description || 'Sem descrição';
    
    const assignee = findEmployeeById(event.assigneeId);
    document.getElementById('view-event-assignee').textContent = assignee ? assignee.name : 'Não atribuído';
    
    showModal(viewEventModal);
}

function showAddEventModal() {
    // Populate goal select
    eventGoalSelect.innerHTML = '<option value="">Nenhuma</option>';
    state.goals.forEach(goal => {
        const option = document.createElement('option');
        option.value = goal.id;
        option.textContent = goal.title;
        eventGoalSelect.appendChild(option);
    });
    
    // Populate assignee select
    eventAssigneeSelect.innerHTML = '';
    state.employees.forEach(employee => {
        const option = document.createElement('option');
        option.value = employee.id;
        option.textContent = employee.name;
        eventAssigneeSelect.appendChild(option);
    });
    
    // Set default date if selected from calendar
    if (state.selectedDate) {
        document.getElementById('event-date').value = state.selectedDate;
    } else {
        const today = new Date();
        const formattedDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        document.getElementById('event-date').value = formattedDate;
    }
    
    showModal(addEventModal);
}

function showAddSalesModal() {
    // Set default date if selected from calendar
    if (state.selectedDate) {
        document.getElementById('sales-date').value = state.selectedDate;
    } else {
        const today = new Date();
        const formattedDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        document.getElementById('sales-date').value = formattedDate;
    }
    
    // Set default branch to current filial
    document.getElementById('sales-branch').value = state.currentFilial;
    
    showModal(addSalesModal);
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Get DOM elements
    const loginForm = document.getElementById('login-form');
    const loginScreen = document.getElementById('login-screen');
    const app = document.getElementById('app');
    const userInfo = document.getElementById('user-info');
    const filialDisplay = document.getElementById('filial-display');
    const logoutBtn = document.getElementById('logout-btn');
    const navTabs = document.querySelectorAll('.nav-tab');
    const tabContents = document.querySelectorAll('.tab-content');
    const prevMonthBtn = document.getElementById('prev-month');
    const nextMonthBtn = document.getElementById('next-month');
    const currentMonthDisplay = document.getElementById('current-month');
    const calendarGrid = document.getElementById('calendar-grid');
    const employeesTable = document.getElementById('employees-table');
    const goalsLevel1 = document.getElementById('goals-level-1');
    const goalsLevel2 = document.getElementById('goals-level-2');
    const goalsLevel3 = document.getElementById('goals-level-3');
    const branchesTable = document.getElementById('branches-table');
    const salesHistoryTable = document.getElementById('sales-history-table');
    const totalSalesDisplay = document.getElementById('total-sales');
    const salesGoalDisplay = document.getElementById('sales-goal');
    const salesProgressBar = document.getElementById('sales-progress');
    const salesPercentageDisplay = document.getElementById('sales-percentage');
    const salesPeriodSelect = document.getElementById('sales-period');
    const salesStartDate = document.getElementById('sales-start-date');
    const salesEndDate = document.getElementById('sales-end-date');
    const customDateRange = document.getElementById('custom-date-range');
    const addEventBtn = document.getElementById('add-event-btn');
    const addGoalBtn = document.getElementById('add-goal-btn');
    const importSalesBtn = document.getElementById('import-sales-btn');
    const addEventModal = document.getElementById('add-event-modal');
    const viewEventModal = document.getElementById('view-event-modal');
    const addSalesModal = document.getElementById('add-sales-modal');
    const importSalesModal = document.getElementById('import-sales-modal');
    const eventGoalSelect = document.getElementById('event-goal');
    const eventAssigneeSelect = document.getElementById('event-assignee');
    const adminOnlyElements = document.querySelectorAll('.admin-only');
    const closeModalButtons = document.querySelectorAll('.close-modal');
    
    // Login Form
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const filial = document.getElementById('filial-select').value;
        
        const user = state.employees.find(emp => emp.username === username && emp.password === password);
        
        if (user) {
            state.currentUser = user;
            state.isAdmin = user.isAdmin || false;
            state.currentFilial = filial;
            
            userInfo.textContent = `${user.name} (${user.position})`;
            filialDisplay.textContent = filial.charAt(0).toUpperCase() + filial.slice(1);
            
            loginScreen.classList.add('hidden');
            app.classList.remove('hidden');
            
            updateAdminVisibility();
            renderCalendar();
            renderEmployees();
            renderGoals();
            renderBranches();
        } else {
            alert('Credenciais inválidas. Tente novamente.');
        }
    });
    
    // Logout Button
    logoutBtn.addEventListener('click', () => {
        state.currentUser = null;
        state.isAdmin = false;
        
        document.getElementById('username').value = '';
        document.getElementById('password').value = '';
        
        app.classList.add('hidden');
        loginScreen.classList.remove('hidden');
    });
    
    // Navigation Tabs
    navTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            showTab(tab.dataset.tab);
        });
    });
    
    // Calendar Navigation
    prevMonthBtn.addEventListener('click', () => {
        state.currentMonth--;
        if (state.currentMonth < 0) {
            state.currentMonth = 11;
            state.currentYear--;
        }
        renderCalendar();
    });
    
    nextMonthBtn.addEventListener('click', () => {
        state.currentMonth++;
        if (state.currentMonth > 11) {
            state.currentMonth = 0;
            state.currentYear++;
        }
        renderCalendar();
    });
    
    // Add Event Button
    addEventBtn.addEventListener('click', () => {
        state.selectedDate = null;
        showAddEventModal();
    });
    
    // Add Event Form
    document.getElementById('add-event-form').addEventListener('submit', (e) => {
        e.preventDefault();
        
        const title = document.getElementById('event-title').value;
        const date = document.getElementById('event-date').value;
        const goalId = eventGoalSelect.value ? parseInt(eventGoalSelect.value) : null;
        const description = document.getElementById('event-description').value;
        const assigneeId = parseInt(eventAssigneeSelect.value);
        
        const newEvent = {
            id: state.events.length + 1,
            title,
            date,
            goalId,
            description,
            assigneeId
        };
        
        state.events.push(newEvent);
        renderCalendar();
        hideModal(addEventModal);
        
        // Reset form
        document.getElementById('event-title').value = '';
        document.getElementById('event-description').value = '';
    });
    
    // Add Goal Button
    addGoalBtn.addEventListener('click', () => {
        showModal(document.getElementById('add-goal-modal'));
    });
    
    // Add Goal Form
    document.getElementById('add-goal-form').addEventListener('submit', (e) => {
        e.preventDefault();
        
        const title = document.getElementById('goal-title').value;
        const description = document.getElementById('goal-description').value;
        const level = parseInt(document.getElementById('goal-level').value);
        const deadline = document.getElementById('goal-deadline').value;
        
        const newGoal = {
            id: state.goals.length + 1,
            title,
            description,
            level,
            deadline,
            progress: 0
        };
        
        state.goals.push(newGoal);
        renderGoals();
        hideModal(document.getElementById('add-goal-modal'));
        
        // Reset form
        document.getElementById('goal-title').value = '';
        document.getElementById('goal-description').value = '';
    });
    
    // Add Sales Button
    document.getElementById('add-sales-form').addEventListener('submit', (e) => {
        e.preventDefault();
        
        const date = document.getElementById('sales-date').value;
        const branch = document.getElementById('sales-branch').value;
        const amount = parseFloat(document.getElementById('sales-amount').value);
        const notes = document.getElementById('sales-notes').value;
        
        const newSale = {
            id: state.sales.length + 1,
            date,
            branch,
            amount,
            notes,
            source: 'manual'
        };
        
        state.sales.push(newSale);
        renderCalendar();
        updateSalesSummary();
        renderSalesHistory();
        hideModal(addSalesModal);
        
        // Reset form
        document.getElementById('sales-amount').value = '';
        document.getElementById('sales-notes').value = '';
    });
    
    // Sales Period Change
    salesPeriodSelect.addEventListener('change', () => {
        if (salesPeriodSelect.value === 'custom') {
            customDateRange.classList.remove('hidden');
        } else {
            customDateRange.classList.add('hidden');
            updateSalesSummary();
        }
    });
    
    // Custom Date Range Change
    salesStartDate.addEventListener('change', updateSalesSummary);
    salesEndDate.addEventListener('change', updateSalesSummary);
    
    // Import Sales Button
    importSalesBtn.addEventListener('click', () => {
        showModal(importSalesModal);
    });
    
    // Close Modal Buttons
    closeModalButtons.forEach(button => {
        button.addEventListener('click', () => {
            const modal = button.closest('.modal');
            hideModal(modal);
        });
    });
    
    // Initialize
    updateAdminVisibility();
});
