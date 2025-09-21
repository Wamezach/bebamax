const vivamaxCompanyId = 8356;
const apiKey = "9a134c87182ea691afbebbf099bea806";
const discoverVivamaxMoviesURL = `https://api.themoviedb.org/3/discover/movie?sort_by=popularity.desc&api_key=${apiKey}&with_companies=${vivamaxCompanyId}`;
const searchVivamaxMoviesURL = query =>
  `https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&with_companies=${vivamaxCompanyId}&query=${encodeURIComponent(query)}`;

const main = document.getElementById("main");
const prev = document.getElementById("prev");
const next = document.getElementById("next");
const current = document.getElementById("current");
const form = document.getElementById("form");
const searchInput = document.getElementById("search");
const tagsEl = document.getElementById("tags");
const autocompleteList = document.getElementById("autocomplete-list");

const MOVIES_PER_PAGE = 20;

let allMovies = [];
let currentPage = 1;
let totalPages = 1;
let selectedGenre = [];
let filteredMovies = [];

const genres = [
  { id: 2, name: "Pinoy Bold" },
  { id: 3, name: "Pinoy Drama" },
  { id: 4, name: "Pinoy Comedy" },
  { id: 5, name: "Pinoy Action" },
  { id: 6, name: "Sexy" },
  { id: 7, name: "Horror" },
  { id: 8, name: "Romance" },
  { id: 9, name: "Family" },
  { id: 10, name: "Thriller" },
  { id: 11, name: "Documentary" }
];

// Player options (with icons)
const playerOptions = [
  { name: "VidSrc", url: movie => `https://vidsrc.cc/v2/embed/movie/${movie.id}`, icon: "🎬" },
  { name: "Player4u", url: movie => `https://player4u.xyz/embed?key=${encodeURIComponent(movie.title)}`, icon: "🟢" },
  { name: "GoPlayer", url: movie => `https://godriveplayer.com/player.php?tmdb=${movie.id}`, icon: "🚀" },
  { name: "2Embed", url: movie => `https://www.2embed.cc/embed/${movie.id}`, icon: "⭐" },
  { name: "MultiEmbed", url: movie => `https://multiembed.mov/?video_id=${movie.id}&tmdb=1`, icon: "📺" }
];

function showSpinner() {
  document.getElementById("spinner").style.display = "flex";
}
function hideSpinner() {
  document.getElementById("spinner").style.display = "none";
}

// Fetch all Vivamax movies (all pages)
async function fetchAllMovies(baseURL) {
  showSpinner();
  let movies = [];
  let page = 1;
  let totalPages = 1;
  do {
    const url = baseURL + `&page=${page}`;
    const data = await fetch(url).then(res => res.json());
    movies = movies.concat(data.results);
    totalPages = data.total_pages;
    page++;
  } while (page <= totalPages);
  hideSpinner();
  return movies;
}

// Initial load: fetch all movies once!
document.addEventListener("DOMContentLoaded", async () => {
  allMovies = await fetchAllMovies(discoverVivamaxMoviesURL);
  // --- Only movies from 2020 up to present ---
  allMovies = allMovies.filter(m => {
    const year = m.release_date ? parseInt(m.release_date.substring(0,4)) : 0;
    return year >= 2020;
  });
  filteredMovies = allMovies;
  totalPages = Math.ceil(filteredMovies.length / MOVIES_PER_PAGE);
  renderPage(1);

  // Clear search button
  const clearSearchBtn = document.getElementById("clearSearch");
  if (clearSearchBtn) {
    clearSearchBtn.addEventListener("click", () => {
      searchInput.value = '';
      filteredMovies = allMovies;
      totalPages = Math.ceil(filteredMovies.length / MOVIES_PER_PAGE);
      renderPage(1);
      closeAutocomplete();
    });
  }
  setGenre();
});

// Render movies for the current page
function renderPage(page) {
  currentPage = page;
  main.innerHTML = "";
  const start = (currentPage - 1) * MOVIES_PER_PAGE;
  const end = start + MOVIES_PER_PAGE;
  const moviesToShow = filteredMovies.slice(start, end);
  showMovies(moviesToShow);

  current.innerText = currentPage;
  prev.classList.toggle("disabled", currentPage <= 1);
  next.classList.toggle("disabled", currentPage >= totalPages);
}

// Show movies
function showMovies(movies) {
  for (const movie of movies) {
    const servers = playerOptions.map(player => ({
      name: player.name,
      url: player.url(movie),
      icon: player.icon
    }));
    const { title, poster_path, vote_average, overview, id } = movie;
    const div = document.createElement("div");
    div.classList.add("movie", "vivamax-movie");
    div.innerHTML = `
      <img src="${poster_path ? "https://image.tmdb.org/t/p/w500" + poster_path : "vivamax-placeholder.png"}" alt="${title}">
      <div class="movie-info">
        <h3>${title}</h3>
        <span class="${getColor(vote_average)}">⭐ ${vote_average}</span>
      </div>
      <div class="overview">
        <div class="overview-text">${overview}</div>
        <button class="know-more" id="watch-${id}">Watch Now</button>
      </div>
    `;
    main.appendChild(div);
    document.getElementById(`watch-${id}`).addEventListener("click", () => {
      openModal(movie, servers);
    });
  }
}

function getColor(vote) {
  if (vote >= 8) return "green";
  if (vote >= 5) return "orange";
  return "red";
}

// Pagination - only change page, never fetch again
prev.addEventListener("click", () => {
  if (currentPage > 1) {
    renderPage(currentPage - 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
});
next.addEventListener("click", () => {
  if (currentPage < totalPages) {
    renderPage(currentPage + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
});

// Genre filtering (client-side)
function setGenre() {
  tagsEl.innerHTML = '';
  genres.forEach(genre => {
    const div = document.createElement("div");
    div.classList.add("tag");
    div.id = genre.id;
    div.innerText = genre.name;
    div.addEventListener("click", e => {
      e.preventDefault();
      if (selectedGenre.length === 0) {
        selectedGenre.push(genre.id);
      } else if (selectedGenre.includes(genre.id)) {
        selectedGenre = selectedGenre.filter(id => id !== genre.id);
      } else {
        selectedGenre.push(genre.id);
      }
      filterMovies();
      renderPage(1);
      window.scrollTo({ top: 0, behavior: "smooth" });
      highlightSelection();
    });
    tagsEl.append(div);
  });
}
function highlightSelection() {
  const tags = document.querySelectorAll(".tag");
  tags.forEach(tag => tag.classList.remove("highlight"));
  clearBtn();
  if (selectedGenre.length !== 0) {
    selectedGenre.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.add("highlight");
    });
  }
}
function clearBtn() {
  let clear = document.getElementById("clear");
  if (clear) {
    clear.classList.add("highlight");
  } else {
    clear = document.createElement("div");
    clear.classList.add("tag", "highlight");
    clear.id = "clear";
    clear.innerText = "Clear x";
    clear.addEventListener("click", () => {
      selectedGenre = [];
      filterMovies();
      renderPage(1);
      setGenre();
    });
    tagsEl.append(clear);
  }
}
function filterMovies() {
  if (selectedGenre.length === 0) {
    filteredMovies = allMovies;
  } else {
    filteredMovies = allMovies.filter(movie => {
      return selectedGenre.some(id => movie.genre_ids.includes(id));
    });
  }
  totalPages = Math.ceil(filteredMovies.length / MOVIES_PER_PAGE);
}

// Search functionality (client-side)
form.addEventListener("submit", e => {
  e.preventDefault();
  const query = searchInput.value.trim().toLowerCase();
  selectedGenre = [];
  setGenre();
  if (query) {
    filteredMovies = allMovies.filter(movie => movie.title.toLowerCase().includes(query));
  } else {
    filteredMovies = allMovies;
  }
  totalPages = Math.ceil(filteredMovies.length / MOVIES_PER_PAGE);
  renderPage(1);
  closeAutocomplete();
});

// Autocomplete for search box
searchInput.addEventListener("input", function() {
  const query = this.value.trim().toLowerCase();
  closeAutocomplete();
  if (!query) return;
  const matches = allMovies.filter(movie => movie.title.toLowerCase().includes(query)).slice(0, 8);
  if (matches.length === 0) return;

  autocompleteList.style.display = "block";
  matches.forEach(movie => {
    const item = document.createElement("div");
    item.classList.add("autocomplete-item");
    item.innerHTML = `
      <img src="${movie.poster_path ? "https://image.tmdb.org/t/p/w92" + movie.poster_path : "vivamax-placeholder.png"}" alt="${movie.title}" />
      <span>${movie.title}</span>
    `;
    item.addEventListener("click", () => {
      searchInput.value = movie.title;
      filteredMovies = [movie];
      totalPages = 1;
      renderPage(1);
      closeAutocomplete();
    });
    autocompleteList.appendChild(item);
  });
});

// Hide autocomplete on blur, click outside, or Esc
searchInput.addEventListener("blur", () => {
  setTimeout(closeAutocomplete, 100);
});
document.addEventListener("click", function(e) {
  if (!autocompleteList.contains(e.target) && e.target !== searchInput) {
    closeAutocomplete();
  }
});
window.addEventListener("keydown", function(e) {
  if (e.key === "Escape") closeAutocomplete();
});

function closeAutocomplete() {
  autocompleteList.innerHTML = "";
  autocompleteList.style.display = "none";
}

// Modal handling (VidSrc as main player, dropdown with icons)
const modal = document.getElementById("movieModal");
const closeButton = document.querySelector(".close-button");
const movieTitle = document.getElementById("movieTitle");
const movieOverview = document.getElementById("movieOverview");
const movieIframe = document.getElementById("movieIframe");
const modalPoster = document.getElementById("modalPoster");
const modalRating = document.getElementById("modalRating");

function getRatingClass(vote) {
  if (vote >= 8) return "high";
  if (vote >= 5) return "medium";
  return "low";
}

function openModal(movie, servers) {
  movieTitle.textContent = movie.title;
  movieOverview.textContent = movie.overview;
  modalPoster.src = movie.poster_path 
    ? "https://image.tmdb.org/t/p/w500" + movie.poster_path 
    : "vivamax-placeholder.png";
  modalPoster.alt = movie.title;
  modalRating.textContent = movie.vote_average ? `⭐ ${movie.vote_average}` : "No rating";
  modalRating.className = "rating-badge " + getRatingClass(movie.vote_average);

  let workingUrl = servers.find(s => s.name === "VidSrc").url;

  (async () => {
    try {
      const response = await fetch(workingUrl, { method: 'HEAD' });
      if (!response.ok) {
        for (const server of servers) {
          try {
            const res = await fetch(server.url, { method: 'HEAD' });
            if (res.ok) {
              workingUrl = server.url;
              break;
            }
          } catch (err) {}
        }
      }
    } catch (err) {
      for (const server of servers) {
        try {
          const res = await fetch(server.url, { method: 'HEAD' });
          if (res.ok) {
            workingUrl = server.url;
            break;
          }
        } catch (err) {}
      }
    }
    movieIframe.src = workingUrl;
    modal.style.display = "block";
    const serverDropdown = document.getElementById("server");
    serverDropdown.innerHTML = '';
    servers.forEach(server => {
      const option = document.createElement("option");
      option.value = server.url;
      option.textContent = `${server.icon} ${server.name}`;
      serverDropdown.appendChild(option);
    });
    serverDropdown.value = workingUrl;
    const newDropdown = serverDropdown.cloneNode(true);
    serverDropdown.parentNode.replaceChild(newDropdown, serverDropdown);
    newDropdown.addEventListener("change", e => {
      movieIframe.src = e.target.value;
    });
  })();
}

// Close modal
closeButton.addEventListener("click", () => {
  modal.style.display = "none";
  movieIframe.src = '';
});
window.addEventListener("click", event => {
  if (event.target === modal) {
    modal.style.display = "none";
    movieIframe.src = '';
  }
});