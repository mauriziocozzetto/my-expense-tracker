document.addEventListener('DOMContentLoaded', () => {
    // Menu mobile toggle
    const menuBtn = document.getElementById('menu-btn');
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');

    window.globalAccounts = [];
    window.globalCategories = [];

    // === Theme Management ===
    const themeToggle = document.getElementById('theme-toggle');
    const themeIcon = document.getElementById('theme-icon');
    const html = document.documentElement;

    function setTheme(isDark) {
        if (isDark) {
            html.classList.add('dark');
            themeIcon.classList.remove('fa-moon');
            themeIcon.classList.add('fa-sun');
        } else {
            html.classList.remove('dark');
            themeIcon.classList.remove('fa-sun');
            themeIcon.classList.add('fa-moon');
        }
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
    }

    // === Custom UI Helpers ===
    window.showToast = function(message, type = 'success') {
        const container = document.getElementById('toast-container');
        if (!container) return;
        
        const toast = document.createElement('div');
        const bgColor = type === 'success' ? 'bg-emerald-500' : 'bg-rose-500';
        const icon = type === 'success' ? 'fa-check-circle' : 'fa-circle-exclamation';
        
        toast.className = `flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-white ${bgColor} transform translate-y-10 opacity-0 transition-all duration-300`;
        toast.innerHTML = `<i class="fa-solid ${icon}"></i><span class="font-medium text-sm">${message}</span>`;
        
        container.appendChild(toast);
        
        // Trigger animation
        requestAnimationFrame(() => {
            toast.classList.remove('translate-y-10', 'opacity-0');
        });
        
        // Remove after 3s
        setTimeout(() => {
            toast.classList.add('translate-y-10', 'opacity-0');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    };

    let customConfirmTimeout = null;
    let activeConfirmCleanup = null;

    window.customConfirm = function(message) {
        return new Promise((resolve) => {
            const modal = document.getElementById('custom-confirm-modal');
            const msgEl = document.getElementById('custom-confirm-message');
            const btnOk = document.getElementById('custom-confirm-ok');
            const btnCancel = document.getElementById('custom-confirm-cancel');
            
            if (!modal) {
                resolve(confirm(message));
                return;
            }

            // Cleanup any previous hanging confirm
            if (activeConfirmCleanup) {
                activeConfirmCleanup(false);
            }
            if (customConfirmTimeout) {
                clearTimeout(customConfirmTimeout);
                customConfirmTimeout = null;
            }
            
            msgEl.textContent = message;
            modal.classList.remove('hidden');
            // Trigger animation
            requestAnimationFrame(() => {
                modal.classList.remove('opacity-0');
                modal.querySelector('div').classList.remove('scale-95');
            });
            
            const cleanup = () => {
                modal.classList.add('opacity-0');
                modal.querySelector('div').classList.add('scale-95');
                customConfirmTimeout = setTimeout(() => {
                    modal.classList.add('hidden');
                    customConfirmTimeout = null;
                }, 300);
                activeConfirmCleanup = null;
                
                // Clear the handlers safely
                btnOk.onclick = null;
                btnCancel.onclick = null;
            };
            
            activeConfirmCleanup = (resolvedValue) => {
                cleanup();
                resolve(resolvedValue);
            };

            btnOk.onclick = () => activeConfirmCleanup(true);
            btnCancel.onclick = () => activeConfirmCleanup(false);
        });
    };

    // Default to light mode or respect system preference
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setTheme(savedTheme ? savedTheme === 'dark' : prefersDark);

    themeToggle.addEventListener('click', () => {
        const isDark = html.classList.contains('dark');
        setTheme(!isDark);
        // Aggiorna anche i grafici se necessario
        updateChartsTheme(!isDark);
    });

    function toggleSidebar() {
        sidebar.classList.toggle('-translate-x-full');
        sidebarOverlay.classList.toggle('hidden');
    }

    if (menuBtn) {
        menuBtn.addEventListener('click', toggleSidebar);
    }
    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', toggleSidebar);
    }

    // === Navigation / View Toggling ===
    const navLinks = document.querySelectorAll('.nav-link');
    const viewSections = document.querySelectorAll('.view-section');

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('data-target');
            
            if (!targetId) return; // Alcuni link non sono ancora implementati
            
            // Rimuovi lo stato attivo da tutti i link (stile base)
            navLinks.forEach(l => {
                l.classList.remove('bg-indigo-50', 'text-primary', 'dark:bg-indigo-900/30', 'dark:text-indigo-400');
                l.classList.add('hover:bg-gray-100', 'dark:hover:bg-gray-800', 'text-gray-600', 'dark:text-gray-400');
            });
            
            // Aggiungi lo stato attivo al link cliccato
            link.classList.remove('hover:bg-gray-100', 'dark:hover:bg-gray-800', 'text-gray-600', 'dark:text-gray-400');
            link.classList.add('bg-indigo-50', 'text-primary', 'dark:bg-indigo-900/30', 'dark:text-indigo-400');

            // Nascondi tutte le sezioni
            viewSections.forEach(section => {
                section.classList.add('hidden');
            });
            
            // Mostra quella selezionata se esiste
            const targetView = document.getElementById(targetId);
            if(targetView) {
                targetView.classList.remove('hidden');
            } else {
                // Se non esiste ancora la vista, rimettiamo la dashboard come fallback
                document.getElementById('view-dashboard').classList.remove('hidden');
            }
            
            // Chiudi sidebar su mobile
            if (window.innerWidth < 768 && !sidebar.classList.contains('-translate-x-full')) {
                toggleSidebar();
            }
        });
    });

    // === Tags Input ===
    const tagInput = document.getElementById('tag-input');
    const tagsContainer = document.getElementById('tags-container');
    let tags = [];

    function renderTags() {
        tagsContainer.innerHTML = '';
        tags.forEach((tag, index) => {
            const tagEl = document.createElement('span');
            tagEl.className = 'inline-flex items-center gap-1 px-3 py-1 bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 rounded-full text-sm font-medium';
            tagEl.innerHTML = `
                ${tag}
                <button type="button" class="hover:text-indigo-900 dark:hover:text-indigo-100" onclick="removeTag(${index})">
                    <i class="fa-solid fa-xmark text-xs"></i>
                </button>
            `;
            tagsContainer.appendChild(tagEl);
        });
    }

    window.removeTag = (index) => {
        tags.splice(index, 1);
        renderTags();
    };

    tagInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const val = tagInput.value.trim();
            if (val && !tags.includes(val)) {
                tags.push(val);
                tagInput.value = '';
                renderTags();
            }
        }
    });

    // === Recurring Toggle ===
    const isRecurringToggle = document.getElementById('is_recurring');
    const recurringFields = document.getElementById('recurring-fields');

    isRecurringToggle.addEventListener('change', (e) => {
        if (e.target.checked) {
            recurringFields.classList.remove('hidden');
        } else {
            recurringFields.classList.add('hidden');
        }
    });

    // === API Integration & Charts (Simulated Fetch) ===
    const API_BASE = 'http://127.0.0.1:8000'; // Sostituire con base URL reale

    let annualChartInstance = null;
    let categoryChartInstance = null;

    Chart.defaults.color = html.classList.contains('dark') ? '#94a3b8' : '#64748b';
    Chart.defaults.font.family = "'Inter', sans-serif";

    function updateChartsTheme(isDark) {
        Chart.defaults.color = isDark ? '#94a3b8' : '#64748b';
        if (annualChartInstance) annualChartInstance.update();
        if (categoryChartInstance) categoryChartInstance.update();
    }

    async function loadDashboardData() {
        try {
            // Fetch reale dei conti dal Database (Backend FastAPI) con no-store per evitare cache del browser
            const accountsRes = await fetch(`${API_BASE}/accounts/`, { cache: 'no-store' });
            const accounts = accountsRes.ok ? await accountsRes.json() : [];
            window.globalAccounts = accounts;

            const getIcon = (name) => {
                const lower = name.toLowerCase();
                if(lower.includes('credito')) return 'fa-credit-card';
                if(lower.includes('risparmi')) return 'fa-piggy-bank';
                if(lower.includes('contanti')) return 'fa-money-bill';
                return 'fa-building-columns';
            };

            const annualDataRes = await fetch(`${API_BASE}/stats/annual`, { cache: 'no-store' });
            const annualData = annualDataRes.ok ? await annualDataRes.json() : [];

            const categoryDataRes = await fetch(`${API_BASE}/stats/categories`, { cache: 'no-store' });
            const categoryData = categoryDataRes.ok ? await categoryDataRes.json() : [];

            // Render Accounts
            const accountsGrid = document.getElementById('accounts-grid');
            const accountsListPage = document.getElementById('accounts-list-page');
            
            accountsGrid.innerHTML = '';
            if (accountsListPage) accountsListPage.innerHTML = '';

            let accountsGridHTML = '';
            let accountsListHTML = '';
            accounts.forEach(acc => {
                const formatter = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' });
                const isNegative = acc.balance < 0;
                
                const cardHTML = `
                    <div class="bg-white dark:bg-darkCard p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 card-hover flex items-center justify-between relative group">
                        <div class="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                            <button onclick="openEditAccountModal(${acc.id}, '${acc.name.replace(/'/g, "\\'")}', ${acc.balance})" class="text-gray-400 hover:text-primary dark:hover:text-indigo-400 bg-gray-50 dark:bg-gray-800 rounded-full w-8 h-8 flex items-center justify-center shadow-sm" title="Modifica Conto">
                                <i class="fa-solid fa-pen text-xs"></i>
                            </button>
                            <button onclick="deleteAccount(${acc.id})" class="text-gray-400 hover:text-rose-500 bg-gray-50 dark:bg-gray-800 rounded-full w-8 h-8 flex items-center justify-center shadow-sm" title="Elimina Conto">
                                <i class="fa-solid fa-xmark text-xs"></i>
                            </button>
                        </div>
                        <div>
                            <p class="text-sm text-gray-500 dark:text-gray-400 font-medium mb-1">${acc.name}</p>
                            <h3 class="text-2xl font-bold ${isNegative ? 'text-rose-500' : 'text-gray-800 dark:text-white'}">
                                ${formatter.format(acc.balance)}
                            </h3>
                        </div>
                        <div class="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-primary dark:text-indigo-400 text-xl">
                            <i class="fa-solid ${getIcon(acc.name)}"></i>
                        </div>
                    </div>
                `;
                
                accountsGridHTML += cardHTML;
                accountsListHTML += cardHTML;
            });
            accountsGrid.innerHTML = accountsGridHTML;
            if (accountsListPage) accountsListPage.innerHTML = accountsListHTML;

            // Fetch Transazioni
            const txRes = await fetch(`${API_BASE}/transactions/`, { cache: 'no-store' });
            const transactions = txRes.ok ? await txRes.json() : [];

            const txList = document.getElementById('transactions-list');
            if (txList) {
                let txHTML = '';
                // Ordina per data decrescente
                transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
                
                transactions.forEach(tx => {
                    const isNegative = tx.amount < 0;
                    const amountStr = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(tx.amount);
                    const colorClass = isNegative ? 'text-rose-500' : 'text-emerald-500';
                    const sign = isNegative ? '' : '+ ';
                    
                    txHTML += `
                        <tr class="border-b border-gray-100 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                            <td class="py-4 px-4 text-gray-800 dark:text-gray-200">${new Date(tx.date).toLocaleDateString('it-IT')}</td>
                            <td class="py-4 px-4 text-gray-800 dark:text-gray-200">${tx.description || '-'}</td>
                            <td class="py-4 px-4 text-gray-500 dark:text-gray-400">Conto ID: ${tx.account_id}</td>
                            <td class="py-4 px-4 text-right font-medium ${colorClass}">${sign}${amountStr}</td>
                            <td class="py-4 px-4 text-right">
                                <div class="flex justify-end gap-2">
                                    <button onclick="openEditTransactionModal(${tx.id}, ${tx.amount}, '${tx.date}', ${tx.account_id}, ${tx.category_id}, '${(tx.description || '').replace(/'/g, "\\'")}')" class="text-gray-400 hover:text-primary dark:hover:text-indigo-400 bg-gray-50 dark:bg-gray-800 rounded-full w-8 h-8 flex items-center justify-center shadow-sm" title="Modifica Transazione">
                                        <i class="fa-solid fa-pen text-xs"></i>
                                    </button>
                                    <button onclick="deleteTransaction(${tx.id})" class="text-gray-400 hover:text-rose-500 bg-gray-50 dark:bg-gray-800 rounded-full w-8 h-8 flex items-center justify-center shadow-sm" title="Elimina Transazione">
                                        <i class="fa-solid fa-xmark text-xs"></i>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `;
                });
                txList.innerHTML = txHTML;
            }

            // Populate category and account selects dynamically
            const categoriesRes = await fetch(`${API_BASE}/categories/`, { cache: 'no-store' });
            const categories = categoriesRes.ok ? await categoriesRes.json() : [];
            window.globalCategories = categories;
            const categorySelect = document.getElementById('category_id');
            if (categorySelect) {
                let catHTML = '';
                categories.forEach(cat => {
                    catHTML += `<option value="${cat.id}">${cat.name}</option>`;
                });
                categorySelect.innerHTML = catHTML;
            }

            const accountSelect = document.getElementById('account_id');
            if (accountSelect) {
                let accSelectHTML = '';
                accounts.forEach(acc => {
                    accSelectHTML += `<option value="${acc.id}">${acc.name}</option>`;
                });
                accountSelect.innerHTML = accSelectHTML;
            }

            // Hide Skeletons
            document.getElementById('annual-skeleton').style.display = 'none';
            document.getElementById('category-skeleton').style.display = 'none';

            // Render Annual Chart
            const ctxAnnual = document.getElementById('annualChart').getContext('2d');
            
            // Creiamo un gradiente per l'area del grafico
            const gradient = ctxAnnual.createLinearGradient(0, 0, 0, 300);
            gradient.addColorStop(0, 'rgba(79, 70, 229, 0.5)'); // primary
            gradient.addColorStop(1, 'rgba(79, 70, 229, 0.0)');

            if (annualChartInstance) {
                annualChartInstance.destroy();
            }
            annualChartInstance = new Chart(ctxAnnual, {
                type: 'line',
                data: {
                    labels: annualData.map(d => d.month),
                    datasets: [{
                        label: 'Spese Mensili (€)',
                        data: annualData.map(d => d.total),
                        borderColor: '#4F46E5',
                        backgroundColor: gradient,
                        borderWidth: 3,
                        pointBackgroundColor: '#fff',
                        pointBorderColor: '#4F46E5',
                        pointBorderWidth: 2,
                        pointRadius: 4,
                        pointHoverRadius: 6,
                        fill: true,
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: {
                                color: html.classList.contains('dark') ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'
                            }
                        },
                        x: {
                            grid: { display: false }
                        }
                    }
                }
            });

            // Render Category Chart
            const ctxCat = document.getElementById('categoryChart').getContext('2d');
            if (categoryChartInstance) {
                categoryChartInstance.destroy();
            }
            categoryChartInstance = new Chart(ctxCat, {
                type: 'doughnut',
                data: {
                    labels: categoryData.map(d => d.category),
                    datasets: [{
                        data: categoryData.map(d => d.percentage),
                        backgroundColor: [
                            '#4F46E5', // Indigo
                            '#10B981', // Emerald
                            '#F59E0B', // Amber
                            '#EC4899'  // Pink
                        ],
                        borderWidth: 0,
                        hoverOffset: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '70%',
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                padding: 20,
                                usePointStyle: true
                            }
                        }
                    }
                }
            });

        } catch (error) {
            console.error("Errore caricamento dashboard:", error);
        }
    }

    // Inizializza Fetch dati
    loadDashboardData();

    // === Form Submission (Reale Transazione) ===
    const transactionForm = document.getElementById('transaction-form');
    if (transactionForm) {
        transactionForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const amount = parseFloat(document.getElementById('amount').value);
            const date = document.getElementById('date').value;
            const account_id = parseInt(document.getElementById('account_id').value);
            const category_id = parseInt(document.getElementById('category_id').value);
            const description = document.getElementById('description').value;
            const is_recurring = document.getElementById('is_recurring').checked;

            let frequency = null;
            let day_of_month = null;
            if (is_recurring) {
                frequency = document.getElementById('frequency').value;
                const domVal = document.getElementById('day_of_month').value;
                day_of_month = domVal ? parseInt(domVal) : null;
            }

            const btn = e.target.querySelector('button[type="submit"]');
            const originalText = btn.innerHTML;
            
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> Salvataggio...';
            btn.disabled = true;

            fetch(`${API_BASE}/transactions/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: amount,
                    date: date,
                    account_id: account_id,
                    category_id: category_id,
                    description: description,
                    is_recurring: is_recurring,
                    frequency: frequency,
                    day_of_month: day_of_month
                })
            })
            .then(res => {
                if(!res.ok) throw new Error('Errore nel salvataggio della transazione');
                return res.json();
            })
            .then(data => {
                e.target.reset();
                tags = [];
                renderTags();
                document.getElementById('recurring-fields').classList.add('hidden');
                btn.innerHTML = originalText;
                btn.disabled = false;
                window.showToast('Transazione salvata con successo!', 'success');
                // Ricarica per vedere la nuova transazione e il nuovo saldo!
                loadDashboardData();
            })
            .catch(err => {
                window.showToast("Si è verificato un errore: " + err.message, 'error');
                btn.innerHTML = originalText;
                btn.disabled = false;
            });
        });
    }

    // === Form Submission (Reale Nuovo Conto) ===
    const accountForm = document.getElementById('account-form');
    if (accountForm) {
        accountForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('new_account_name').value;
            const balance = document.getElementById('new_account_balance').value;
            const btn = e.target.querySelector('button[type="submit"]');
            const originalText = btn.innerHTML;
            
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i>';
            btn.disabled = true;

            fetch(`${API_BASE}/accounts/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: name, balance: parseFloat(balance) })
            })
            .then(res => {
                if(!res.ok) throw new Error('Errore di rete durante la creazione del conto');
                return res.json();
            })
            .then(data => {
                e.target.reset();
                btn.innerHTML = originalText;
                btn.disabled = false;
                window.showToast('Conto creato con successo!', 'success');
                // Ricarica la dashboard per riflettere il nuovo conto!
                loadDashboardData();
            })
            .catch(err => {
                btn.innerHTML = originalText;
                btn.disabled = false;
                window.showToast("Si è verificato un errore: " + err.message, 'error');
            });
        });
    }

    // === Gestione Modal Modifica Conto ===
    window.openEditAccountModal = (id, name, balance) => {
        document.getElementById('edit_account_id').value = id;
        document.getElementById('edit_account_name').value = name;
        document.getElementById('edit_account_balance').value = balance;
        document.getElementById('edit-account-modal').classList.remove('hidden');
    };

    window.closeEditAccountModal = function() {
        const modal = document.getElementById('edit-account-modal');
        if(modal) {
            modal.classList.add('hidden');
        }
    };

    window.deleteAccount = async function(id) {
        const confirmed = await window.customConfirm("Sei sicuro di voler eliminare questo conto? Attenzione: l'operazione è irreversibile e cancellerà le transazioni associate se il database non prevede la conservazione!");
        if(!confirmed) return;
        
        try {
            const res = await fetch(`${API_BASE}/accounts/${id}`, {
                method: 'DELETE'
            });
            if(!res.ok) throw new Error('Impossibile eliminare il conto');
            
            window.showToast('Conto eliminato con successo!', 'success');
            loadDashboardData();
        } catch(err) {
            window.showToast(err.message, 'error');
        }
    };

    const editAccountForm = document.getElementById('edit-account-form');
    if (editAccountForm) {
        editAccountForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const id = document.getElementById('edit_account_id').value;
            const name = document.getElementById('edit_account_name').value;
            const balance = document.getElementById('edit_account_balance').value;
            const btn = e.target.querySelector('button[type="submit"]');
            const originalText = btn.innerHTML;
            
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> Salvataggio...';
            btn.disabled = true;

            fetch(`${API_BASE}/accounts/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: name, balance: parseFloat(balance) })
            })
            .then(res => {
                if(!res.ok) throw new Error('Errore durante il salvataggio');
                return res.json();
            })
            .then(data => {
                btn.innerHTML = originalText;
                btn.disabled = false;
                window.closeEditAccountModal();
                window.showToast('Conto aggiornato con successo!', 'success');
                loadDashboardData();
            })
            .catch(err => {
                btn.innerHTML = originalText;
                btn.disabled = false;
                window.showToast("Si è verificato un errore: " + err.message, 'error');
            });
        });
    }

    // === Gestione Modal Modifica Transazione ===
    window.openEditTransactionModal = (id, amount, date, account_id, category_id, description) => {
        document.getElementById('edit_tx_id').value = id;
        document.getElementById('edit_tx_amount').value = amount;
        document.getElementById('edit_tx_date').value = date;
        document.getElementById('edit_tx_description').value = description;
        
        const accountSelect = document.getElementById('edit_tx_account_id');
        accountSelect.innerHTML = '';
        window.globalAccounts.forEach(acc => {
            const selected = acc.id == account_id ? 'selected' : '';
            accountSelect.innerHTML += `<option value="${acc.id}" ${selected}>${acc.name}</option>`;
        });
        
        const categorySelect = document.getElementById('edit_tx_category_id');
        categorySelect.innerHTML = '';
        window.globalCategories.forEach(cat => {
            const selected = cat.id == category_id ? 'selected' : '';
            categorySelect.innerHTML += `<option value="${cat.id}" ${selected}>${cat.name}</option>`;
        });
        
        document.getElementById('edit-transaction-modal').classList.remove('hidden');
    };

    window.closeEditTransactionModal = function() {
        const modal = document.getElementById('edit-transaction-modal');
        if(modal) {
            modal.classList.add('hidden');
        }
    };

    window.deleteTransaction = async function(id) {
        const confirmed = await window.customConfirm("Sei sicuro di voler eliminare questa transazione? L'importo verrà stornato dal saldo del conto.");
        if(!confirmed) return;
        
        try {
            const res = await fetch(`${API_BASE}/transactions/${id}`, {
                method: 'DELETE'
            });
            if(!res.ok) throw new Error('Impossibile eliminare la transazione');
            
            window.showToast('Transazione eliminata con successo!', 'success');
            loadDashboardData();
        } catch(err) {
            window.showToast(err.message, 'error');
        }
    };

    const editTxForm = document.getElementById('edit-transaction-form');
    if (editTxForm) {
        editTxForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const id = document.getElementById('edit_tx_id').value;
            const amount = parseFloat(document.getElementById('edit_tx_amount').value);
            const date = document.getElementById('edit_tx_date').value;
            const account_id = parseInt(document.getElementById('edit_tx_account_id').value);
            const category_id = parseInt(document.getElementById('edit_tx_category_id').value);
            const description = document.getElementById('edit_tx_description').value;
            
            const btn = e.target.querySelector('button[type="submit"]');
            const originalText = btn.innerHTML;
            
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> Salvataggio...';
            btn.disabled = true;

            fetch(`${API_BASE}/transactions/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount, date, account_id, category_id, description })
            })
            .then(res => {
                if(!res.ok) throw new Error('Errore durante il salvataggio');
                return res.json();
            })
            .then(data => {
                btn.innerHTML = originalText;
                btn.disabled = false;
                window.closeEditTransactionModal();
                window.showToast('Transazione aggiornata con successo!', 'success');
                loadDashboardData();
            })
            .catch(err => {
                btn.innerHTML = originalText;
                btn.disabled = false;
                window.showToast("Si è verificato un errore: " + err.message, 'error');
            });
        });
    }

    // === Gestione Profilo Utente ===
    function updateUserAvatar(firstName, lastName) {
        const avatarImg = document.getElementById('user-avatar');
        if (!avatarImg) return;
        
        let nameParam = 'User';
        if (firstName || lastName) {
            nameParam = encodeURIComponent(`${firstName || ''} ${lastName || ''}`.trim());
        }
        
        avatarImg.src = `https://ui-avatars.com/api/?name=${nameParam}&background=4F46E5&color=fff`;
    }

    async function loadProfileData() {
        try {
            const res = await fetch(`${API_BASE}/profile`);
            if (res.ok) {
                const profile = await res.json();
                if (document.getElementById('profile_first_name')) {
                    document.getElementById('profile_first_name').value = profile.first_name || '';
                    document.getElementById('profile_last_name').value = profile.last_name || '';
                    document.getElementById('profile_email').value = profile.email || '';
                    document.getElementById('profile_phone').value = profile.phone || '';
                    document.getElementById('profile_address').value = profile.address || '';
                }
                updateUserAvatar(profile.first_name, profile.last_name);
            }
        } catch(err) {
            console.error("Errore nel caricamento del profilo:", err);
        }
    }

    const profileForm = document.getElementById('profile-form');
    if (profileForm) {
        profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = e.target.querySelector('button[type="submit"]');
            const originalText = btn.innerHTML;
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Salvataggio...';
            btn.disabled = true;

            const updateData = {
                first_name: document.getElementById('profile_first_name').value,
                last_name: document.getElementById('profile_last_name').value,
                email: document.getElementById('profile_email').value,
                phone: document.getElementById('profile_phone').value,
                address: document.getElementById('profile_address').value
            };

            try {
                const res = await fetch(`${API_BASE}/profile`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updateData)
                });
                if (!res.ok) throw new Error("Impossibile salvare il profilo");
                updateUserAvatar(updateData.first_name, updateData.last_name);
                window.showToast("Profilo salvato con successo!", "success");
            } catch(err) {
                window.showToast(err.message, "error");
            } finally {
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        });
    }

    // Carica il profilo all'avvio
    loadProfileData();

});
