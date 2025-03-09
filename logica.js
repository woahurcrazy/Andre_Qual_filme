const btnPesquisa = document.getElementById('btn_pesquisa');
let selectedCategories = []; // Variável global

// Função para disparar a ação do botão "Procurar"
function acionarPesquisa() {
    btnPesquisa.click();
}

// Tudo dentro de DOMContentLoaded para garantir que o DOM esteja carregado
document.addEventListener('DOMContentLoaded', function() {
    // Evento de tecla "Enter"
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Enter') {
            acionarPesquisa();
        }
    });

    // Função para atualizar a visibilidade das categorias
    function updateCategoryVisibility() {
        const mediaType = document.getElementById('media-type').value;
        const movieCards = document.querySelectorAll('.category-card');
        const seriesCards = document.querySelectorAll('.category-card_serie');

        if (mediaType === 'movie') {
            movieCards.forEach(card => card.classList.add('visible'));
            seriesCards.forEach(card => card.classList.remove('visible'));
            console.log("Mostrando filmes, escondendo séries");
        } else { // 'tv'
            seriesCards.forEach(card => card.classList.add('visible'));
            movieCards.forEach(card => card.classList.remove('visible'));
            console.log("Mostrando séries, escondendo filmes");
        }
    }

    // Evento de mudança no select #media-type
    document.getElementById('media-type').addEventListener('change', function() {
        updateCategoryVisibility();
        const mediaType = this.value;
        const visibleSelector = mediaType === 'movie' ? '.category-card' : '.category-card_serie';
        const selectedElements = document.querySelectorAll(`${visibleSelector}.selected`);
        console.log("Elementos selecionados encontrados na mudança:", selectedElements.length, Array.from(selectedElements).map(el => el.getAttribute('data-id')));
        selectedCategories = Array.from(selectedElements).map(card => card.getAttribute('data-id'));
        console.log("Categorias selecionadas após mudança:", selectedCategories);
    });

    // Inicializa a visibilidade (Filmes como padrão)
    updateCategoryVisibility();

    // Evento de seleção de categorias
    document.querySelectorAll('.category-card, .category-card_serie').forEach(card => {
        card.addEventListener('click', function(event) {
            const targetCard = event.target.closest('.category-card, .category-card_serie');
            if (!targetCard) return;
            targetCard.classList.toggle('selected');
            const mediaType = document.getElementById('media-type').value;
            const visibleSelector = mediaType === 'movie' ? '.category-card' : '.category-card_serie';
            const selectedElements = document.querySelectorAll(`${visibleSelector}.selected`);
            console.log("Elementos selecionados encontrados no clique:", selectedElements.length, Array.from(selectedElements).map(el => el.getAttribute('data-id')));
            selectedCategories = Array.from(selectedElements).map(selectedCard => selectedCard.getAttribute('data-id'));
            console.log("Categorias selecionadas:", selectedCategories);
        });
    });

    // Evento do botão de pesquisa
    document.getElementById("btn_pesquisa").addEventListener("click", function() {
        const mediaType = document.getElementById('media-type').value;
        const query = document.getElementById('titulo').value;
        const ano = document.getElementById('ano').value;
        const QueryBool = query !== '';
        const AnoBool = ano !== '';

        console.log("Categorias selecionadas antes da busca:", selectedCategories);

        const searchFunction = mediaType === 'movie' ? buscarFilmes : buscarSeries;

        if (window.innerWidth <= 767) {
            searchFunction({ query, ano, popular: !QueryBool && !AnoBool }).then(() => {
                const resultado = document.getElementById('resultado');
                const topPos = resultado.getBoundingClientRect().top + window.scrollY;
                window.scrollTo({ top: topPos, behavior: 'smooth' });
            });
        } else {
            searchFunction({ query, ano, popular: !QueryBool && !AnoBool });
        }
    });

    // Função para exibir filmes ou séries
    function exibirFilmes(itens) {
        let output = '';
        itens.forEach(item => {
            const isMovie = item.title !== undefined;
            const title = isMovie ? item.title : item.name;
            const releaseDate = isMovie ? item.release_date : item.first_air_date;
            const ano = releaseDate ? new Date(releaseDate).getFullYear() : 'N/D';
            output += `
                <div class="movie-item">
                    <img src="https://image.tmdb.org/t/p/w500${item.poster_path}" alt="${title}">
                    <h3>${title}</h3>
                    <p>${item.overview.length > 150 ? item.overview.substring(0, 100) + '...' : item.overview}</p>
                    <div class="movie-footer">
                        <a href="https://www.themoviedb.org/${isMovie ? 'movie' : 'tv'}/${item.id}" target="_blank" class="btn">+ Info</a>
                        <span>${ano}</span>
                    </div>
                </div>
            `;
        });
        document.getElementById('resultado').innerHTML = output;
    }

    // Função para buscar filmes
    async function buscarFilmes({ query = '', ano = null, popular = false } = {}) {
        const apiKey = '9e3dae2c0d235c9fd406df6abcfb81dd';
        let baseUrl = popular 
            ? `https://api.themoviedb.org/3/movie/popular?api_key=${apiKey}&language=en-US`
            : ano && !query 
                ? `https://api.themoviedb.org/3/discover/movie?api_key=${apiKey}&primary_release_year=${ano}&language=en-US`
                : `https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=${query}&language=en-US`;

        if (selectedCategories.length > 0) {
            baseUrl += `&with_genres=${selectedCategories.join(',')}`;
        }
        
        document.getElementById('resultado').innerHTML = 'A procurar...';
        let allResults = [];
        const seenIds = new Set();
        let page = 1;
        const limiteResultados = document.getElementById('limite-resultados').value;
        const maxPages = Math.ceil(limiteResultados / 20);

        try {
            while (true) {
                const url = `${baseUrl}&page=${page}`;
                console.log("URL Filmes:", url);
                const response = await fetch(url);
                const data = await response.json();

                if (data.results.length === 0 || page > maxPages || page > data.total_pages) break;
                document.getElementById('resultado').innerHTML = 'A procurar página...'+ page +" de " + maxPages;

                const filmesFiltrados = data.results.filter(movie => {
                    if (seenIds.has(movie.id)) return false;
                    seenIds.add(movie.id);
                    if (ano && (!movie.release_date || !movie.release_date.startsWith(ano))) return false;
                    if (selectedCategories.length === 0) return true;
                    return selectedCategories.every(cat => movie.genre_ids?.includes(Number(cat)) ?? false);
                });

                allResults = allResults.concat(filmesFiltrados);
                page++;

                if (allResults.length >= limiteResultados) break;
            }

            if (allResults.length > 0) {
                // Só ordenar por vote_average e vote_count se NÃO for busca por popularidade
                //GUARDAR ESTE COMENTARIO SERVE PARA MUDAR A LOGICA DO PROCURAR GERAL
                let ordem = document.getElementById('ordem').value;
                if (ordem === 'Todos') {
                    allResults.sort((a, b) => b.vote_average - a.vote_average);
                    allResults.sort((a, b) => b.vote_count - a.vote_count);
                }
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

    // Função para buscar séries
    async function buscarSeries({ query = '', ano = null, popular = false } = {}) {
        const apiKey = '9e3dae2c0d235c9fd406df6abcfb81dd';
        let baseUrl = popular 
            ? `https://api.themoviedb.org/3/tv/popular?api_key=${apiKey}&language=en-US`
            : ano && !query 
                ? `https://api.themoviedb.org/3/discover/tv?api_key=${apiKey}&first_air_date_year=${ano}&language=en-UST`
                : `https://api.themoviedb.org/3/search/tv?api_key=${apiKey}&query=${query}&language=en-US`;

        if (selectedCategories.length > 0) {
            baseUrl += `&with_genres=${selectedCategories.join(',')}`;
        }
        
        document.getElementById('resultado').innerHTML = 'A procurar...';
        let allResults = [];
        const seenIds = new Set();
        let page = 1;
        const limiteResultados = document.getElementById('limite-resultados').value;
        const maxPages = Math.ceil(limiteResultados / 20);

        try {
            while (true) {
                const url = `${baseUrl}&page=${page}`;
                console.log("URL Séries:", url);
                const response = await fetch(url);
                const data = await response.json();

                console.log("Resultados brutos da API (página " + page + "):", data.results);
                document.getElementById('resultado').innerHTML = 'A procurar página...'+ page +" de " + maxPages;

                if (data.results.length === 0 || page > maxPages || page > data.total_pages) break;

                const seriesFiltradas = data.results.filter(serie => {
                    if (seenIds.has(serie.id)) return false;
                    seenIds.add(serie.id);
                    if (ano && (!serie.first_air_date || !serie.first_air_date.startsWith(ano))) return false;
                    if (selectedCategories.length === 0) return true;
                    const genreMatch = selectedCategories.every(cat => serie.genre_ids?.includes(Number(cat)) ?? false);
                    console.log("Série:", serie.name, "Gêneros:", serie.genre_ids, "Match:", genreMatch);
                    return genreMatch;
                });

                allResults = allResults.concat(seriesFiltradas);
                page++;

                if (allResults.length >= limiteResultados) break;
            }

            if (allResults.length > 0) {
                // Só ordenar por vote_average e vote_count se NÃO for busca por popularidade
                let ordem = document.getElementById('ordem').value;
                if (ordem === 'Todos') {
                    allResults.sort((a, b) => b.vote_average - a.vote_average);
                    allResults.sort((a, b) => b.vote_count - a.vote_count);
                
                }
                console.log("Séries filtradas (total, sem duplicados):", allResults);
                exibirFilmes(allResults);
            } else {
                document.getElementById('resultado').innerHTML = 
                    ano ? 'Nenhuma série encontrada com os gêneros e ano selecionados.' 
                        : 'Nenhuma série encontrada com os gêneros selecionados.';
            }
        } catch (error) {
            console.error('Erro ao buscar séries:', error);
            document.getElementById('resultado').innerHTML = 'Erro ao buscar séries.';
        }
    }
});