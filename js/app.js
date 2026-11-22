/*
 * app.js — Les interactions de la page
 * ------------------------------------
 * Recherche, filtres, favoris, fenêtre de réservation, menu mobile.
 * Les données viennent de api.js (qui lit events.js tant que le backend n'existe pas).
 */

const $ = (selector) => document.querySelector(selector);

// ---------- Réglages ----------
const MAX_QTY = 8; // billets max par commande (le backend devra aussi imposer sa propre limite)
const PLACEHOLDER_IMAGE = "assets/images/events/placeholder.svg";

// ---------- État de la page (ce que l'application "retient") ----------
let events = [];             // liste des événements
let cat = "Tous";            // catégorie sélectionnée
let favorites = new Set();   // identifiants des événements favoris
let showFav = false;         // true = on n'affiche que les favoris
let chosen = null;           // événement en cours de réservation
let qty = 1;                 // nombre de billets choisi
let lastFocused = null;      // élément qui avait le focus avant d'ouvrir la fenêtre

// ---------- Éléments de la page ----------
const grid = $("#grid");
const modal = $("#modal");
const dialog = modal.querySelector(".dialog");
const body = $("#modalBody");
const toast = $("#toast");
const nav = $("#mainNav");
const menuButton = $("#menu");
const favToggle = $("#favToggle");

// ======================================================
// Outils
// ======================================================

// Petit message temporaire en bas de l'écran.
let toastTimer;
function notify(text) {
  toast.textContent = text;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2300);
}

// Neutralise les caractères spéciaux avant d'insérer du texte dans du HTML
// (protège contre l'injection de code si un nom d'événement contient du HTML).
function esc(text) {
  return String(text).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

// Minuscules + sans accents, pour que "conference" trouve "Conférences".
function normalize(text) {
  return String(text).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

// Image introuvable -> on affiche l'image de secours (une seule fois, pour éviter une boucle).
// L'événement "error" ne remonte pas dans la page, on l'écoute donc en mode "capture" (le "true").
document.addEventListener("error", (event) => {
  const img = event.target;
  if (!(img instanceof HTMLImageElement) || img.dataset.fallback) return;
  img.dataset.fallback = "1";
  img.src = PLACEHOLDER_IMAGE;
}, true);

// ======================================================
// Liste des événements
// ======================================================

function getVisibleEvents() {
  const query = normalize($("#search").value.trim());
  return events.filter((e) => {
    const matchesCategory = cat === "Tous" || e.category === cat;
    const matchesFav = !showFav || favorites.has(String(e.id));
    const text = normalize(`${e.title} ${e.location} ${e.category} ${e.description || ""}`);
    return matchesCategory && matchesFav && text.includes(query);
  });
}

function cardHTML(e) {
  const id = String(e.id);
  const isFav = favorites.has(id);
  return `
    <article class="card">
      <div class="cover">
        <img class="cover-img" src="${esc(e.image)}" alt="" loading="lazy" width="1000" height="600">
        <span class="tag">${esc(e.category)}</span>
        <button type="button" class="heart ${isFav ? "on" : ""}" data-fav="${esc(id)}"
                aria-pressed="${isFav}"
                aria-label="${isFav ? "Retirer des favoris" : "Ajouter aux favoris"} : ${esc(e.title)}">
          <span aria-hidden="true">${isFav ? "♥" : "♡"}</span>
        </button>
      </div>
      <div class="info">
        <div class="date">${esc(e.date)}</div>
        <h3>${esc(e.title)}</h3>
        <div class="location"><span aria-hidden="true">⌖</span> ${esc(e.location)}</div>
        <div class="bottom">
          <span class="cost">${esc(e.price)} ${esc(e.currency)} <small>/ billet</small></span>
          <button type="button" class="buy" data-buy="${esc(id)}" aria-label="Réserver : ${esc(e.title)}">Réserver ↗</button>
        </div>
      </div>
    </article>`;
}

// Redessine toute la liste + met à jour les boutons de filtre et le compteur de favoris.
function render() {
  const list = getVisibleEvents();

  grid.innerHTML = list.map(cardHTML).join("");
  grid.setAttribute("aria-busy", "false");

  // Message "aucun résultat"
  $("#empty").classList.toggle("hidden", list.length > 0);
  $("#emptyText").textContent = showFav && favorites.size === 0
    ? "Tu n'as pas encore de favoris : clique sur ♡ sur un événement."
    : "Aucun événement trouvé.";

  // Boutons de filtre
  $("#filters").querySelectorAll("button").forEach((b) => {
    const active = b.dataset.cat === cat;
    b.classList.toggle("active", active);
    b.setAttribute("aria-pressed", String(active));
  });

  // Compteur de favoris + état du bouton ♡ de l'en-tête
  $("#favCount").textContent = favorites.size;
  favToggle.setAttribute("aria-pressed", String(showFav));

  // Annonce pour les lecteurs d'écran
  $("#resultCount").textContent = `${list.length} événement${list.length > 1 ? "s" : ""} affiché${list.length > 1 ? "s" : ""}`;
}

// Remet recherche, catégorie et favoris à zéro.
function resetFilters() {
  $("#search").value = "";
  cat = "Tous";
  showFav = false;
  render();
}

// Chargement initial (avec message d'erreur + bouton "Réessayer").
async function loadEvents() {
  grid.setAttribute("aria-busy", "true");
  grid.innerHTML = '<p class="loading">Chargement des événements…</p>';
  try {
    events = await API.getEvents();
    render();
  } catch (err) {
    grid.setAttribute("aria-busy", "false");
    grid.innerHTML = '<p class="loading">Chargement des événements indisponible. <button type="button" class="retry" id="retry">Réessayer</button></p>';
  }
}

// ---------- Clics dans la liste (favoris, réservation, réessayer) ----------
grid.addEventListener("click", (e) => {
  const favButton = e.target.closest("[data-fav]");
  if (favButton) {
    const id = favButton.dataset.fav;
    favorites.has(id) ? favorites.delete(id) : favorites.add(id);
    render();
    // render() recrée les boutons : on redonne le focus à celui qu'on vient d'utiliser (clavier)
    const again = grid.querySelector(`[data-fav="${CSS.escape(id)}"]`);
    if (again) again.focus();
    notify(favorites.has(id) ? "Ajouté aux favoris ♡" : "Retiré des favoris");
    return;
  }

  const buyButton = e.target.closest("[data-buy]");
  if (buyButton) { openModal(buyButton.dataset.buy); return; }

  if (e.target.closest("#retry")) loadEvents();
});

// ---------- Filtres, recherche, favoris de l'en-tête ----------
$("#filters").addEventListener("click", (e) => {
  const button = e.target.closest("[data-cat]");
  if (!button) return;
  cat = button.dataset.cat;
  showFav = false;
  render();
});

$("#search").addEventListener("input", render);

favToggle.addEventListener("click", () => {
  showFav = !showFav;
  cat = "Tous";
  render();
  $("#events").scrollIntoView({ behavior: "smooth" });
  notify(showFav ? "Favoris affichés" : "Tous les événements");
});

$("#all").addEventListener("click", resetFilters);
$("#reset").addEventListener("click", resetFilters);

// ======================================================
// Fenêtre de réservation
// ======================================================

function openModal(id) {
  chosen = events.find((e) => String(e.id) === String(id));
  if (!chosen) return;
  qty = 1;
  lastFocused = document.activeElement;   // pour y revenir à la fermeture
  renderCheckout();
  modal.classList.remove("hidden");
  document.body.style.overflow = "hidden"; // bloque le défilement de la page derrière
  dialog.focus();                          // le clavier et les lecteurs d'écran entrent dans la fenêtre
}

function closeModal() {
  if (modal.classList.contains("hidden")) return;
  modal.classList.add("hidden");
  document.body.style.overflow = "";
  if (lastFocused) lastFocused.focus();
}

// Construit le contenu de la fenêtre (une seule fois par ouverture).
function renderCheckout() {
  const e = chosen;
  body.innerHTML = `
    <small class="eyebrow">RÉSERVATION</small>
    <h2 id="modalTitle">Ton billet t'attend.</h2>
    <p>Choisis combien de places réserver.</p>

    <div class="event-summary">
      <img src="${esc(e.image)}" alt="" width="75" height="65">
      <div><strong>${esc(e.title)}</strong><small>${esc(e.date)} · ${esc(e.location)}</small></div>
    </div>

    <div class="qty">
      <span id="qtyLabel">Nombre de billets (max. ${MAX_QTY})</span>
      <div role="group" aria-labelledby="qtyLabel">
        <button type="button" id="minus" aria-label="Retirer un billet">−</button>
        <b id="qtyValue" aria-live="polite"></b>
        <button type="button" id="plus" aria-label="Ajouter un billet">+</button>
      </div>
    </div>

    <div class="total"><span>Total</span><b id="total" aria-live="polite"></b></div>

    <fieldset>
      <legend>Mode de paiement</legend>
      <div class="options">
        <label><input type="radio" name="pay" checked value="USDT"> ₮ USDT (stablecoin)</label>
        <label class="disabled"><input type="radio" name="pay" value="crypto" disabled> ◈ Autres cryptos (bientôt disponible)</label>
      </div>
    </fieldset>

    <p id="formError" class="form-error hidden" role="alert"></p>
    <button type="button" class="primary submit" id="submit">Continuer vers le paiement ↗</button>
    <p class="note">Prototype : aucun argent n'est transféré.</p>`;
  updateQty();
}

// Met à jour uniquement la quantité et le total (sans reconstruire la fenêtre).
// Le total affiché n'est qu'une INDICATION : c'est le backend qui calculera le vrai montant.
function updateQty() {
  $("#qtyValue").textContent = qty;
  $("#total").textContent = `${qty * chosen.price} ${chosen.currency}`;
  $("#minus").disabled = qty <= 1;
  $("#plus").disabled = qty >= MAX_QTY;
}

function showSuccess(result) {
  const reference = result.order_id ?? result.id ?? "—";
  body.innerHTML = `
    <div class="success">
      <div class="success-mark" aria-hidden="true">✓</div>
      <small class="eyebrow">DEMANDE CRÉÉE</small>
      <h2 id="modalTitle">On y est presque !</h2>
      <p>Réservation démo pour ${qty} billet(s) — <b>${esc(chosen.title)}</b>.</p>
      <p>Référence : ${esc(reference)}<br>Aucun paiement réel ni billet émis.</p>
      <button type="button" class="primary submit" id="done">Compris</button>
    </div>`;
  $("#done").focus();
}

async function submitOrder() {
  const submit = $("#submit");
  const errorBox = $("#formError");
  errorBox.classList.add("hidden");

  // On bloque le bouton pendant l'envoi : évite les doubles commandes par double-clic.
  submit.disabled = true;
  submit.textContent = "Envoi en cours…";

  try {
    const payment = body.querySelector('input[name="pay"]:checked').value;
    // On n'envoie JAMAIS de prix : seulement l'événement, la quantité et le moyen de paiement.
    const result = await API.createOrder({
      event_id: chosen.id,
      quantity: qty,
      payment_method: payment
    });
    showSuccess(result);
  } catch (err) {
    errorBox.textContent = `${err.message}. Tu peux réessayer.`;
    errorBox.classList.remove("hidden");
    submit.disabled = false;
    submit.textContent = "Continuer vers le paiement ↗";
  }
}

// ---------- Clics dans la fenêtre ----------
body.addEventListener("click", (e) => {
  const button = e.target.closest("button");
  if (!button) return;

  if (button.id === "minus" || button.id === "plus") {
    qty = button.id === "minus" ? Math.max(1, qty - 1) : Math.min(MAX_QTY, qty + 1);
    updateQty();
    // Si le bouton vient de se désactiver (1 ou 8 atteint), on passe le focus à l'autre.
    if (button.disabled) $(button.id === "minus" ? "#plus" : "#minus").focus();
  }
  if (button.id === "submit") submitOrder();
  if (button.id === "done") closeModal();
});

$("#close").addEventListener("click", closeModal);
modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });

// Garde le clavier (touche Tab) à l'intérieur de la fenêtre tant qu'elle est ouverte.
function trapFocus(e) {
  const focusable = [...dialog.querySelectorAll('button:not([disabled]), input:not([disabled]), a[href]')];
  if (focusable.length === 0) { e.preventDefault(); return; }
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  const active = document.activeElement;
  if (e.shiftKey && (active === first || active === dialog)) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus(); }
}

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") { closeModal(); setMenu(false); }
  if (e.key === "Tab" && !modal.classList.contains("hidden")) trapFocus(e);
});

// ======================================================
// Menu mobile
// ======================================================

function setMenu(open) {
  nav.classList.toggle("open", open);
  menuButton.setAttribute("aria-expanded", String(open));
  menuButton.setAttribute("aria-label", open ? "Fermer le menu" : "Ouvrir le menu");
  menuButton.textContent = open ? "✕" : "☰";
}

menuButton.addEventListener("click", () => setMenu(!nav.classList.contains("open")));
nav.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => setMenu(false)));

// ======================================================
// Démarrage
// ======================================================
loadEvents();
