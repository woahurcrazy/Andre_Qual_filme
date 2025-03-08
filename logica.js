const btnPesquisa = document.getElementById('btn_pesquisa');
// Função para disparar a ação do botão "Procurar"
function acionarPesquisa() {
    btnPesquisa.click();
}

// Evento de tecla "Enter"
document.addEventListener('keydown', function(event) {
    if (event.key === 'Enter') {
        acionarPesquisa();
    }
});

let selectedCategories = []; // Variável global



// Evento do botão de pesquisa
document.getElementById("btn_pesquisa").addEventListener("click", function() {
    const query = document.getElementById('titulo').value;
    const ano = document.getElementById('ano').value;
    
    const QueryBool = query !== '';
    const AnoBool = ano !== '';
    console.log("Categorias selecionadas:", selectedCategories);

    if (!QueryBool && !AnoBool) {
        console.log("!QueryBool && !AnoBool - 1");
        buscarFilmes({ popular: true });
    } else if (!QueryBool && AnoBool) {
        console.log("!QueryBool && AnoBool - 2");
        buscarFilmes({ ano });
    } else if (QueryBool && !AnoBool) {
        console.log("QueryBool && !AnoBool - 3");
        buscarFilmes({ query });
    } else if (QueryBool && AnoBool) {
        console.log("QueryBool && AnoBool - 4");
        buscarFilmes({ query, ano });
    }
});

// Seleção de categorias
document.querySelectorAll('.category-card').forEach(card => {
    card.addEventListener('click', function() {
        this.classList.toggle('selected');
        selectedCategories = Array.from(document.querySelectorAll('.category-card.selected'))
            .map(selectedCard => selectedCard.getAttribute('data-id'));
        console.log("Categorias selecionadas:", selectedCategories);
    });
});

// Função para exibir filmes
function exibirFilmes(filmes) {
    let output = '';
    filmes.forEach(movie => {
        const ano = new Date(movie.release_date).getFullYear();
        output += `
            <div class="movie-item">
                <img src="https://image.tmdb.org/t/p/w500${movie.poster_path}" alt="${movie.title}">
                <h3>${movie.title}</h3>
                <p>${movie.overview.length > 150 ? movie.overview.substring(0, 100) + '...' : movie.overview}</p>
                <div class="movie-footer">
                    <a href="https://www.themoviedb.org/movie/${movie.id}" target="_blank" class="btn">+ Info</a>
                    <span>${ano}</span>
                </div>
            </div>
        `;
    });
    document.getElementById('resultado').innerHTML = output;
}

// Evento de mudança no select de categoria (se aplicável)
document.getElementById('categoria').addEventListener('change', function() {
    this.classList.toggle('placeholder', this.value === '');
});

// Função genérica para buscar filmes com paginação
async function buscarFilmes({ query = '', ano = null, popular = false } = {}) {
    const apiKey = '9e3dae2c0d235c9fd406df6abcfb81dd';
    let baseUrl = popular 
        ? `https://api.themoviedb.org/3/movie/popular?api_key=${apiKey}&language=pt-PT`
        : ano && !query 
            ? `https://api.themoviedb.org/3/discover/movie?api_key=${apiKey}&primary_release_year=${ano}&language=pt-PT`
            : `https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=${query}&language=pt-PT`;

    if (selectedCategories.length > 0) {
        baseUrl += `&with_genres=${selectedCategories.join(',')}`;
    }
    
    document.getElementById('resultado').innerHTML = 'A procurar...';
    let allResults = [];
    const seenIds = new Set(); // Para rastrear IDs já vistos
    let page = 1;
    const limiteResultados = Number(document.getElementById('limite-resultados').value);
    const maxPages = Math.ceil(limiteResultados / 20);

    try {
        while (true) {
            const url = `${baseUrl}&page=${page}`;
            console.log("URL:", url);
            const response = await fetch(url);
            const data = await response.json();

            if (data.results.length === 0 || page > maxPages || page > data.total_pages) break;

            const filmesFiltrados = data.results.filter(movie => {
                // Verifica se o filme já foi visto pelo ID
                if (seenIds.has(movie.id)) return false;
                seenIds.add(movie.id); // Adiciona o ID ao conjunto

                // Aplica os outros filtros
                if (!movie.genre_ids || movie.genre_ids.length === 0) return false;
                if (ano && (!movie.release_date || !movie.release_date.startsWith(ano))) return false;
                if (selectedCategories.length === 0) return true;
                return selectedCategories.some(cat => movie.genre_ids.includes(Number(cat)));
            });

            allResults = allResults.concat(filmesFiltrados);
            page++;

            if (allResults.length >= limiteResultados) break;
        }

        if (allResults.length > 0) {
            allResults.sort((a, b) => b.popularity - a.popularity);
            console.log("Filmes filtrados (total, sem duplicados):", allResults);
            exibirFilmes(allResults);
        } else {
            document.getElementById('resultado').innerHTML = 
                ano ? 'Nenhum filme encontrado com os gêneros e ano selecionados.' 
                    : 'Nenhum filme encontrado com os gêneros selecionados.';
        }
    } catch (error) {
        console.error('Erro ao buscar filmes:', error);
        document.getElementById('resultado').innerHTML = 'Erro ao buscar filmes.';
    }

}