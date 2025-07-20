// Configuração do Firebase
const firebaseConfig = {
    apiKey: "AIzaSyA6HUvXjncq6yRuHA-xplT3w4jrnfpKSfk",
    authDomain: "gab-s-style.firebaseapp.com",
    databaseURL: "https://gab-s-style-default-rtdb.firebaseio.com",
    projectId: "gab-s-style",
    storageBucket: "gab-s-style.firebasestorage.app",
    messagingSenderId: "929936834467",
    appId: "1:929936834467:web:baafe056b638150f74a416",
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const database = firebase.database();

// Classe principal da aplicação
class App {
    constructor() {
        this.initElements();
        this.initEventListeners();
        this.initMasks();
        this.checkAuthState();
        this.loadProducts();
        this.loadClientes();
    }

    initElements() {
        // Elementos do DOM
        this.elements = {
            productsContainer: document.getElementById('products-container'),
            categoryLinks: document.querySelectorAll('.category-link'),
            searchInput: document.getElementById('search-input'),
            searchBtn: document.getElementById('search-btn'),
            loginBtn: document.getElementById('login-btn'),
            logoutBtn: document.getElementById('logout-btn'),
            userGreeting: document.getElementById('user-greeting'),
            loginModal: document.getElementById('login-modal'),
            closeBtns: document.querySelectorAll('.close, .close-modal'),
            loginForm: document.getElementById('login-form'),
            menuCliente: document.getElementById('menu-cliente'),
            menuProduto: document.getElementById('menu-produto'),
            clienteModal: document.getElementById('cliente-modal'),
            produtoModal: document.getElementById('produto-modal'),
            salvarClienteBtn: document.getElementById('salvar-cliente'),
            salvarProdutoBtn: document.getElementById('salvar-produto'),
            cancelarBtns: document.querySelectorAll('.cancelar-btn'),
            clientesLista: document.getElementById('clientes-lista'),
            pesquisarClientes: document.getElementById('pesquisar-clientes'),
            dropdownToggle: document.querySelector('.dropdown-toggle'),
            dropdownMenu: document.querySelector('.dropdown-menu'),
            registerButton: document.getElementById('register-button'),
            recoverPasswordButton: document.getElementById('recover-password-button')
        };
    }

    initEventListeners() {
        // Eventos de navegação
        this.elements.categoryLinks.forEach(link => {
            link.addEventListener('click', (e) => this.handleCategoryClick(e, link));
        });

        // Eventos de busca
        this.elements.searchBtn.addEventListener('click', () => this.handleSearch());
        this.elements.searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleSearch();
        });

        // Eventos de login/logout
        this.elements.loginBtn.addEventListener('click', () => this.showLoginModal());
        this.elements.logoutBtn.addEventListener('click', () => this.handleLogout());
        this.elements.closeBtns.forEach(btn => {
            btn.addEventListener('click', () => this.hideModals());
        });
        this.elements.loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        this.elements.registerButton.addEventListener('click', (e) => this.handleRegister(e));
        this.elements.recoverPasswordButton.addEventListener('click', (e) => this.handlePasswordRecovery(e));

        // Eventos de cadastro
        this.elements.menuCliente.addEventListener('click', (e) => {
            e.preventDefault();
            this.showClienteModal();
        });
        
        this.elements.menuProduto.addEventListener('click', (e) => {
            e.preventDefault();
            this.showProdutoModal();
        });
        
        this.elements.salvarClienteBtn.addEventListener('click', () => this.cadastrarCliente());
        this.elements.salvarProdutoBtn.addEventListener('click', () => this.cadastrarProduto());
        
        this.elements.cancelarBtns.forEach(btn => {
            btn.addEventListener('click', () => this.hideModals());
        });
        
        // Pesquisa de clientes
        this.elements.pesquisarClientes.addEventListener('input', () => this.pesquisarClientes());

        // Dropdown menu
        this.elements.dropdownToggle.addEventListener('click', (e) => this.toggleDropdown(e));
        document.addEventListener('click', (e) => this.closeDropdownIfOutside(e));
        
        // Fechar modais ao clicar fora
        window.addEventListener('click', (e) => {
            if (e.target === this.elements.clienteModal || 
                e.target === this.elements.produtoModal || 
                e.target === this.elements.loginModal) {
                this.hideModals();
            }
        });
    }

    initMasks() {
        // Máscara para CPF
        const cpfInput = document.getElementById('cpf');
        if (cpfInput) {
            cpfInput.addEventListener('input', function(e) {
                let value = e.target.value.replace(/\D/g, '');
                value = value.replace(/(\d{3})(\d)/, '$1.$2');
                value = value.replace(/(\d{3})(\d)/, '$1.$2');
                value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
                e.target.value = value;
            });
        }

        // Máscara para telefone
        const phoneInput = document.getElementById('telefone');
        if (phoneInput) {
            phoneInput.addEventListener('input', function(e) {
                let value = e.target.value.replace(/\D/g, '');
                if (value.length > 11) value = value.substring(0, 11);
                
                if (value.length <= 10) {
                    value = value.replace(/(\d{2})(\d)/, '($1) $2');
                    value = value.replace(/(\d{4})(\d)/, '$1-$2');
                } else {
                    value = value.replace(/(\d{2})(\d)/, '($1) $2');
                    value = value.replace(/(\d{5})(\d)/, '$1-$2');
                }
                e.target.value = value;
            });
        }

        // Máscara para preço
        const priceInput = document.getElementById('produto-preco');
        if (priceInput) {
            priceInput.addEventListener('input', function(e) {
                let value = e.target.value.replace(/\D/g, '');
                value = (value / 100).toFixed(2) + '';
                value = value.replace('.', ',');
                value = value.replace(/(\d)(\d{3})(\,\d{2})$/g, '$1.$2$3');
                e.target.value = value;
            });
        }
    }

    // Métodos da aplicação
    async loadProducts(filter = {}) {
        try {
            this.showLoading(this.elements.productsContainer);
            
            let produtosRef = database.ref('produtos');
            
            // Aplica filtros se existirem
            if (filter.categoria) {
                produtosRef = produtosRef.orderByChild('categoria').equalTo(filter.categoria);
            }
            
            if (filter.searchTerm) {
                // Firebase não suporta busca por substring, então filtramos localmente
                const snapshot = await produtosRef.once('value');
                const produtos = snapshot.val() || {};
                const filtered = Object.entries(produtos).filter(([id, produto]) => 
                    produto.nome.toLowerCase().includes(filter.searchTerm.toLowerCase()) ||
                    (produto.descricao && produto.descricao.toLowerCase().includes(filter.searchTerm.toLowerCase()))
                );
                
                this.displayProducts(Object.fromEntries(filtered));
                return;
            }
            
            const snapshot = await produtosRef.once('value');
            this.displayProducts(snapshot.val() || {});
        } catch (error) {
            console.error("Erro ao carregar produtos:", error);
            this.elements.productsContainer.innerHTML = '<p class="error">Erro ao carregar produtos.</p>';
        }
    }

    displayProducts(products) {
        this.elements.productsContainer.innerHTML = '';
        
        if (!products || Object.keys(products).length === 0) {
            this.elements.productsContainer.innerHTML = `
                <div class="no-results">
                    <i class="bi bi-box"></i>
                    <p>Nenhum produto cadastrado.</p>
                </div>
            `;
            return;
        }
        
        Object.entries(products).forEach(([id, product]) => {
            const productCard = document.createElement('div');
            productCard.className = 'product-card';
            productCard.dataset.id = id;
            productCard.dataset.category = product.categoria ? product.categoria.toLowerCase() : '';
            
            productCard.innerHTML = `
                <img src="${product.imagem || 'https://via.placeholder.com/300x300?text=Produto+Sem+Imagem'}" 
                     alt="${product.nome}" class="product-image">
                <div class="product-info">
                    <h3 class="product-title">${product.nome}</h3>
                    <p class="product-description">${product.descricao || 'Sem descrição'}</p>
                    <p class="product-price">R$ ${parseFloat(product.valor || 0).toFixed(2)}</p>
                    <p class="product-stock">
                        <i class="bi ${product.quantidade > 0 ? 'bi-check-circle-fill' : 'bi-x-circle-fill'}"></i>
                        ${product.quantidade > 0 ? `Disponível (${product.quantidade})` : 'Esgotado'}
                    </p>
                    <button class="add-to-cart">
                        <i class="bi bi-cart-plus"></i> Adicionar
                    </button>
                    ${auth.currentUser ? `
                        <div class="admin-actions">
                            <button class="edit-product">
                                <i class="bi bi-pencil"></i> Editar
                            </button>
                            <button class="delete-product">
                                <i class="bi bi-trash"></i> Excluir
                            </button>
                        </div>
                    ` : ''}
                </div>
            `;
            
            this.elements.productsContainer.appendChild(productCard);
            
            // Adiciona eventos para os botões de admin
            if (auth.currentUser) {
                productCard.querySelector('.edit-product')?.addEventListener('click', () => this.editarProduto(id, product));
                productCard.querySelector('.delete-product')?.addEventListener('click', () => this.excluirProduto(id));
            }
            
            // Evento para adicionar ao carrinho
            productCard.querySelector('.add-to-cart')?.addEventListener('click', () => {
                if (!auth.currentUser) {
                    this.showLoginModal();
                    this.showAlert('Faça login para adicionar produtos ao carrinho', 'error', this.elements.loginModal.querySelector('.modal-content'));
                } else {
                    this.adicionarAoCarrinho(id, product);
                }
            });
        });
    }

    async loadClientes() {
        try {
            this.showLoading(this.elements.clientesLista);
            
            const snapshot = await database.ref('clientes').once('value');
            const clientes = snapshot.val() || {};
            this.displayClientes(clientes);
        } catch (error) {
            console.error("Erro ao carregar clientes:", error);
            this.elements.clientesLista.innerHTML = '<p class="error">Erro ao carregar clientes.</p>';
        }
    }

    displayClientes(clientes) {
        this.elements.clientesLista.innerHTML = '';
        
        if (!clientes || Object.keys(clientes).length === 0) {
            this.elements.clientesLista.innerHTML = `
                <div class="no-results">
                    <i class="bi bi-people"></i>
                    <p>Nenhum cliente cadastrado.</p>
                </div>
            `;
            return;
        }
        
        Object.entries(clientes).forEach(([id, cliente]) => {
            const clienteItem = document.createElement('div');
            clienteItem.className = 'cliente-item';
            clienteItem.dataset.id = id;
            
            clienteItem.innerHTML = `
                <p><strong>${cliente.nome}</strong></p>
                <p><i class="bi bi-credit-card"></i> CPF: ${cliente.cpf || 'Não informado'}</p>
                <p><i class="bi bi-envelope"></i> ${cliente.email}</p>
                <p><i class="bi bi-telephone"></i> ${cliente.telefone || 'Não informado'}</p>
                ${cliente.dataNascimento ? `<p><i class="bi bi-calendar"></i> ${new Date(cliente.dataNascimento).toLocaleDateString()}</p>` : ''}
                <div class="cliente-actions">
                    <button class="editar-btn">
                        <i class="bi bi-pencil"></i> Editar
                    </button>
                    <button class="excluir-btn">
                        <i class="bi bi-trash"></i> Excluir
                    </button>
                </div>
            `;
            
            this.elements.clientesLista.appendChild(clienteItem);
            
            // Adiciona eventos aos botões
            clienteItem.querySelector('.editar-btn').addEventListener('click', () => this.editarCliente(id, cliente));
            clienteItem.querySelector('.excluir-btn').addEventListener('click', () => this.excluirCliente(id));
        });
    }

    pesquisarClientes() {
        const termo = this.elements.pesquisarClientes.value.toLowerCase();
        const clientes = document.querySelectorAll('.cliente-item');
        
        clientes.forEach(cliente => {
            const texto = cliente.textContent.toLowerCase();
            cliente.style.display = texto.includes(termo) ? 'block' : 'none';
        });
    }

    handleCategoryClick(e, link) {
        e.preventDefault();
        const category = link.dataset.category;
        this.filterProducts(category);
        this.elements.dropdownMenu.style.display = 'none';
    }

    filterProducts(category) {
        const cards = this.elements.productsContainer.querySelectorAll('.product-card');
        
        cards.forEach(card => {
            card.style.display = (category === 'todos' || card.dataset.category === category) 
                ? 'block' 
                : 'none';
        });
    }

    handleSearch() {
        const searchTerm = this.elements.searchInput.value.trim();
        if (searchTerm) {
            this.loadProducts({ searchTerm });
        } else {
            this.loadProducts();
        }
    }

    // Métodos de autenticação
    async handleLogin(e) {
        e.preventDefault();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        
        if (!email || !password) {
            this.showAlert('Preencha todos os campos', 'error', this.elements.loginModal.querySelector('.modal-content'));
            return;
        }
        
        try {
            const { user } = await auth.signInWithEmailAndPassword(email, password);
            this.showAlert('Login realizado com sucesso!', 'success', this.elements.loginModal.querySelector('.modal-content'));
            this.updateUIForUser(user);
            setTimeout(() => this.hideModals(), 1500);
        } catch (error) {
            let errorMessage = 'Erro no login';
            switch (error.code) {
                case 'auth/user-not-found':
                    errorMessage = 'Usuário não encontrado';
                    break;
                case 'auth/wrong-password':
                    errorMessage = 'Senha incorreta';
                    break;
                case 'auth/invalid-email':
                    errorMessage = 'E-mail inválido';
                    break;
                default:
                    errorMessage = error.message;
            }
            this.showAlert(errorMessage, 'error', this.elements.loginModal.querySelector('.modal-content'));
        }
    }

    async handleRegister(e) {
        e.preventDefault();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        
        if (!email || !password) {
            this.showAlert('Preencha todos os campos', 'error', this.elements.loginModal.querySelector('.modal-content'));
            return;
        }
        
        if (password.length < 6) {
            this.showAlert('A senha deve ter pelo menos 6 caracteres', 'error', this.elements.loginModal.querySelector('.modal-content'));
            return;
        }
        
        try {
            const { user } = await auth.createUserWithEmailAndPassword(email, password);
            this.showAlert('Cadastro realizado com sucesso!', 'success', this.elements.loginModal.querySelector('.modal-content'));
            
            // Cria um perfil básico do usuário no banco de dados
            await database.ref('usuarios/' + user.uid).set({
                email: user.email,
                dataCadastro: new Date().toISOString(),
                tipo: 'cliente'
            });
            
            this.updateUIForUser(user);
            setTimeout(() => this.hideModals(), 1500);
        } catch (error) {
            let errorMessage = 'Erro no cadastro';
            switch (error.code) {
                case 'auth/email-already-in-use':
                    errorMessage = 'E-mail já está em uso';
                    break;
                case 'auth/invalid-email':
                    errorMessage = 'E-mail inválido';
                    break;
                case 'auth/weak-password':
                    errorMessage = 'Senha muito fraca';
                    break;
                default:
                    errorMessage = error.message;
            }
            this.showAlert(errorMessage, 'error', this.elements.loginModal.querySelector('.modal-content'));
        }
    }

    async handlePasswordRecovery(e) {
        e.preventDefault();
        const email = document.getElementById('email').value.trim();
        
        if (!email) {
            this.showAlert('Informe seu e-mail para recuperar a senha', 'error', this.elements.loginModal.querySelector('.modal-content'));
            return;
        }
        
        try {
            await auth.sendPasswordResetEmail(email);
            this.showAlert('E-mail de recuperação enviado! Verifique sua caixa de entrada.', 'success', this.elements.loginModal.querySelector('.modal-content'));
        } catch (error) {
            this.showAlert(`Erro ao enviar e-mail de recuperação: ${error.message}`, 'error', this.elements.loginModal.querySelector('.modal-content'));
        }
    }

    async handleLogout() {
        try {
            await auth.signOut();
            this.updateUIForUser(null);
            this.showAlert('Logout realizado com sucesso', 'success');
        } catch (error) {
            console.error("Erro ao fazer logout:", error);
            this.showAlert('Erro ao fazer logout', 'error');
        }
    }

    checkAuthState() {
        auth.onAuthStateChanged(user => {
            this.updateUIForUser(user);
            
            // Se o usuário estiver logado, carrega os dados novamente para mostrar os botões de admin
            if (user) {
                this.loadProducts();
                this.loadClientes();
            }
        });
    }

    updateUIForUser(user) {
        if (user) {
            this.elements.loginBtn.style.display = 'none';
            this.elements.logoutBtn.style.display = 'block';
            this.elements.userGreeting.style.display = 'block';
            
            // Busca o nome do usuário no banco de dados
            database.ref('usuarios/' + user.uid).once('value').then(snapshot => {
                const usuario = snapshot.val();
                const nome = usuario?.nome || user.email.split('@')[0];
                this.elements.userGreeting.innerHTML = `<i class="bi bi-person-circle"></i> Olá, ${nome}`;
            });
        } else {
            this.elements.loginBtn.style.display = 'block';
            this.elements.logoutBtn.style.display = 'none';
            this.elements.userGreeting.style.display = 'none';
        }
    }

    // Métodos de CRUD para Clientes
    async cadastrarCliente() {
        const nome = document.getElementById('nome-completo').value.trim();
        const cpf = document.getElementById('cpf').value.trim().replace(/\D/g, '');
        const email = document.getElementById('cliente-email').value.trim();
        const telefone = document.getElementById('telefone').value.trim().replace(/\D/g, '');
        const dataNascimento = document.getElementById('data-nascimento').value;
        const endereco = document.getElementById('endereco').value.trim();
        
        // Validação básica
        if (!nome || !cpf || !email) {
            this.showAlert('Preencha pelo menos nome, CPF e e-mail', 'error');
            return;
        }
        
        if (cpf.length !== 11) {
            this.showAlert('CPF inválido', 'error');
            return;
        }
        
        try {
            // Verifica se já existe um cliente com este CPF
            const snapshot = await database.ref('clientes').orderByChild('cpf').equalTo(cpf).once('value');
            if (snapshot.exists()) {
                this.showAlert('Já existe um cliente cadastrado com este CPF', 'error');
                return;
            }
            
            // Cria um novo cliente
            const novoCliente = {
                nome,
                cpf,
                email,
                telefone: telefone || null,
                dataNascimento: dataNascimento || null,
                endereco: endereco || null,
                dataCadastro: new Date().toISOString()
            };
            
            const novoClienteRef = database.ref('clientes').push();
            await novoClienteRef.set(novoCliente);
            
            this.showAlert('Cliente cadastrado com sucesso!', 'success');
            this.loadClientes();
            this.limparFormularioCliente();
        } catch (error) {
            console.error('Erro ao cadastrar cliente:', error);
            this.showAlert(`Erro ao cadastrar cliente: ${error.message}`, 'error');
        }
    }

    async editarCliente(id, cliente) {
        // Preenche o formulário com os dados do cliente
        document.getElementById('nome-completo').value = cliente.nome || '';
        document.getElementById('cpf').value = cliente.cpf ? cliente.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : '';
        document.getElementById('cliente-email').value = cliente.email || '';
        document.getElementById('telefone').value = cliente.telefone || '';
        document.getElementById('data-nascimento').value = cliente.dataNascimento || '';
        document.getElementById('endereco').value = cliente.endereco || '';
        
        // Altera o botão Salvar para Atualizar
        this.elements.salvarClienteBtn.innerHTML = '<i class="bi bi-check-circle"></i> Atualizar';
        
        // Remove event listeners antigos
        this.elements.salvarClienteBtn.replaceWith(this.elements.salvarClienteBtn.cloneNode(true));
        this.elements.salvarClienteBtn = document.getElementById('salvar-cliente');
        
        // Adiciona novo listener para atualização
        this.elements.salvarClienteBtn.addEventListener('click', async () => {
            const clienteAtualizado = {
                nome: document.getElementById('nome-completo').value.trim(),
                cpf: document.getElementById('cpf').value.trim().replace(/\D/g, ''),
                email: document.getElementById('cliente-email').value.trim(),
                telefone: document.getElementById('telefone').value.trim().replace(/\D/g, ''),
                dataNascimento: document.getElementById('data-nascimento').value || null,
                endereco: document.getElementById('endereco').value.trim() || null,
                dataCadastro: cliente.dataCadastro || new Date().toISOString()
            };
            
            try {
                await database.ref('clientes/' + id).update(clienteAtualizado);
                this.showAlert('Cliente atualizado com sucesso!', 'success');
                this.loadClientes();
                this.limparFormularioCliente();
                
                // Restaura o botão para o estado original
                this.elements.salvarClienteBtn.innerHTML = '<i class="bi bi-check-circle"></i> Salvar';
                this.elements.salvarClienteBtn.onclick = () => this.cadastrarCliente();
            } catch (error) {
                console.error('Erro ao atualizar cliente:', error);
                this.showAlert(`Erro ao atualizar cliente: ${error.message}`, 'error');
            }
        });
        
        this.showClienteModal();
    }

    async excluirCliente(id) {
        if (confirm('Tem certeza que deseja excluir este cliente? Esta ação não pode ser desfeita.')) {
            try {
                await database.ref('clientes/' + id).remove();
                this.showAlert('Cliente excluído com sucesso!', 'success');
                this.loadClientes();
            } catch (error) {
                console.error('Erro ao excluir cliente:', error);
                this.showAlert(`Erro ao excluir cliente: ${error.message}`, 'error');
            }
        }
    }

    // Métodos de CRUD para Produtos
    async cadastrarProduto() {
        const nome = document.getElementById('produto-nome').value.trim();
        const categoria = document.getElementById('produto-categoria').value;
        const codigo = document.getElementById('produto-codigo').value.trim();
        const tamanho = document.getElementById('produto-tamanho').value;
        const quantidade = parseInt(document.getElementById('produto-quantidade').value) || 0;
        const preco = parseFloat(document.getElementById('produto-preco').value.replace('.', '').replace(',', '.')) || 0;
        const descricao = document.getElementById('produto-descricao').value.trim();
        const imagem = document.getElementById('produto-imagem').value.trim();
        
        // Validação básica
        if (!nome || !categoria || !codigo) {
            this.showAlert('Preencha pelo menos nome, categoria e código', 'error');
            return;
        }
        
        if (isNaN(preco) || preco <= 0) {
            this.showAlert('Preço inválido', 'error');
            return;
        }
        
        try {
            // Verifica se o produto já existe
            const produtoRef = database.ref('produtos').orderByChild('codigo').equalTo(codigo);
            const snapshot = await produtoRef.once('value');
            
            if (snapshot.exists()) {
                this.showAlert('Já existe um produto com este código', 'error');
                return;
            }
            
            // Cria o novo produto
            const novoProduto = {
                nome,
                categoria,
                codigo,
                tamanho,
                quantidade,
                valor: preco,
                descricao: descricao || 'Sem descrição',
                imagem: imagem || 'https://via.placeholder.com/300x300?text=Produto+Sem+Imagem',
                dataCadastro: new Date().toISOString()
            };
            
            await database.ref('produtos').push(novoProduto);
            
            this.showAlert('Produto cadastrado com sucesso!', 'success');
            this.loadProducts();
            this.limparFormularioProduto();
        } catch (error) {
            console.error('Erro ao cadastrar produto:', error);
            this.showAlert(`Erro ao cadastrar produto: ${error.message}`, 'error');
        }
    }

    async editarProduto(id, produto) {
        // Preenche o formulário com os dados do produto
        document.getElementById('produto-nome').value = produto.nome || '';
        document.getElementById('produto-categoria').value = produto.categoria || '';
        document.getElementById('produto-codigo').value = produto.codigo || '';
        document.getElementById('produto-tamanho').value = produto.tamanho || 'U';
        document.getElementById('produto-quantidade').value = produto.quantidade || 0;
        document.getElementById('produto-preco').value = produto.valor ? produto.valor.toFixed(2).replace('.', ',') : '0,00';
        document.getElementById('produto-descricao').value = produto.descricao || '';
        document.getElementById('produto-imagem').value = produto.imagem || '';
        
        // Altera o botão Salvar para Atualizar
        this.elements.salvarProdutoBtn.innerHTML = '<i class="bi bi-check-circle"></i> Atualizar';
        
        // Remove event listeners antigos
        this.elements.salvarProdutoBtn.replaceWith(this.elements.salvarProdutoBtn.cloneNode(true));
        this.elements.salvarProdutoBtn = document.getElementById('salvar-produto');
        
        // Adiciona novo listener para atualização
        this.elements.salvarProdutoBtn.addEventListener('click', async () => {
            const produtoAtualizado = {
                nome: document.getElementById('produto-nome').value.trim(),
                categoria: document.getElementById('produto-categoria').value,
                codigo: document.getElementById('produto-codigo').value.trim(),
                tamanho: document.getElementById('produto-tamanho').value,
                quantidade: parseInt(document.getElementById('produto-quantidade').value) || 0,
                valor: parseFloat(document.getElementById('produto-preco').value.replace('.', '').replace(',', '.')) || 0,
                descricao: document.getElementById('produto-descricao').value.trim(),
                imagem: document.getElementById('produto-imagem').value.trim() || 
                       'https://via.placeholder.com/300x300?text=Produto+Sem+Imagem',
                dataCadastro: produto.dataCadastro || new Date().toISOString()
            };
            
            try {
                await database.ref('produtos/' + id).update(produtoAtualizado);
                this.showAlert('Produto atualizado com sucesso!', 'success');
                this.loadProducts();
                this.limparFormularioProduto();
                
                // Restaura o botão para o estado original
                this.elements.salvarProdutoBtn.innerHTML = '<i class="bi bi-check-circle"></i> Salvar';
                this.elements.salvarProdutoBtn.onclick = () => this.cadastrarProduto();
            } catch (error) {
                console.error('Erro ao atualizar produto:', error);
                this.showAlert(`Erro ao atualizar produto: ${error.message}`, 'error');
            }
        });
        
        this.showProdutoModal();
    }

    async excluirProduto(id) {
        if (confirm('Tem certeza que deseja excluir este produto? Esta ação não pode ser desfeita.')) {
            try {
                await database.ref('produtos/' + id).remove();
                this.showAlert('Produto excluído com sucesso!', 'success');
                this.loadProducts();
            } catch (error) {
                console.error('Erro ao excluir produto:', error);
                this.showAlert(`Erro ao excluir produto: ${error.message}`, 'error');
            }
        }
    }

    // Métodos auxiliares
    showLoading(container) {
        container.innerHTML = `
            <div class="loading">
                <i class="bi bi-arrow-repeat"></i>
                <p>Carregando...</p>
            </div>
        `;
    }

    showAlert(message, type = 'success', container = null) {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type}`;
        alertDiv.innerHTML = `
            <i class="bi ${type === 'success' ? 'bi-check-circle' : 'bi-exclamation-triangle'}"></i>
            ${message}
        `;
        
        const targetContainer = container || document.querySelector('.cadastro-modal-content');
        targetContainer.insertBefore(alertDiv, targetContainer.firstChild);
        
        setTimeout(() => {
            alertDiv.remove();
        }, 5000);
    }

    showLoginModal() {
        this.elements.loginModal.style.display = 'block';
        document.getElementById('email').focus();
    }

    showClienteModal() {
        this.elements.clienteModal.style.display = 'block';
        document.getElementById('nome-completo').focus();
    }

    showProdutoModal() {
        this.elements.produtoModal.style.display = 'block';
        document.getElementById('produto-nome').focus();
    }

    hideModals() {
        this.elements.loginModal.style.display = 'none';
        this.elements.clienteModal.style.display = 'none';
        this.elements.produtoModal.style.display = 'none';
    }

    toggleDropdown(e) {
        e.preventDefault();
        this.elements.dropdownMenu.style.display = 
            this.elements.dropdownMenu.style.display === 'block' ? 'none' : 'block';
    }

    closeDropdownIfOutside(e) {
        if (!e.target.closest('.dropdown')) {
            this.elements.dropdownMenu.style.display = 'none';
        }
    }

    limparFormularioCliente() {
        document.getElementById('nome-completo').value = '';
        document.getElementById('cpf').value = '';
        document.getElementById('cliente-email').value = '';
        document.getElementById('telefone').value = '';
        document.getElementById('data-nascimento').value = '';
        document.getElementById('endereco').value = '';
    }

    limparFormularioProduto() {
        document.getElementById('produto-nome').value = '';
        document.getElementById('produto-categoria').value = '';
        document.getElementById('produto-codigo').value = '';
        document.getElementById('produto-tamanho').value = 'U';
        document.getElementById('produto-quantidade').value = '0';
        document.getElementById('produto-preco').value = '0,00';
        document.getElementById('produto-descricao').value = '';
        document.getElementById('produto-imagem').value = '';
    }

    adicionarAoCarrinho(id, produto) {
        if (!auth.currentUser) {
            this.showLoginModal();
            return;
        }
        
        const userId = auth.currentUser.uid;
        const itemCarrinho = {
            produtoId: id,
            nome: produto.nome,
            preco: produto.valor,
            quantidade: 1,
            imagem: produto.imagem,
            dataAdicao: new Date().toISOString()
        };
        
        database.ref(`carrinho/${userId}/${id}`).transaction(currentData => {
            if (currentData) {
                // Se o item já existe no carrinho, incrementa a quantidade
                currentData.quantidade += 1;
                return currentData;
            } else {
                // Se não existe, adiciona novo item
                return itemCarrinho;
            }
        }).then(() => {
            this.showAlert(`${produto.nome} adicionado ao carrinho!`, 'success');
        }).catch(error => {
            console.error('Erro ao adicionar ao carrinho:', error);
            this.showAlert('Erro ao adicionar ao carrinho', 'error');
        });
    }
}

// Inicializar a aplicação quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    new App();
});