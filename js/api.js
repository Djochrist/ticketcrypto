/*
 * api.js — Tout ce qui parle au backend passe par ce fichier.
 * -----------------------------------------------------------
 * USE_MOCK_DATA = true  -> on utilise les données fictives de events.js
 * USE_MOCK_DATA = false -> on appelle le vrai backend FastAPI avec fetch()
 *
 * SÉCURITÉ : le frontend n'envoie JAMAIS de prix. Il envoie seulement
 * l'événement choisi et la quantité ; le backend recalculera le montant.
 */
const API = {
  BASE_URL: "http://localhost:8000",
  USE_MOCK_DATA: true,

  // Envoie une requête au backend et renvoie la réponse JSON.
  // Transforme les échecs en messages clairs pour l'utilisateur.
  async request(path, options) {
    let response;
    try {
      response = await fetch(`${this.BASE_URL}${path}`, options);
    } catch (networkError) {
      // Le serveur est éteint, ou pas de connexion Internet.
      throw new Error("Serveur injoignable");
    }

    if (!response.ok) {
      // FastAPI renvoie souvent {"detail": "message"} quand quelque chose ne va pas.
      let detail = "";
      try { detail = (await response.json()).detail; } catch (e) { /* pas de JSON : tant pis */ }
      throw new Error(typeof detail === "string" && detail ? detail : "Requête refusée par le serveur");
    }
    return response.json();
  },

  // Récupère la liste des événements.
  async getEvents() {
    if (this.USE_MOCK_DATA) return window.TICKETCRYPTO_EVENTS;
    return this.request("/api/events");
  },

  // Crée une commande (réservation).
  async createOrder(payload) {
    if (this.USE_MOCK_DATA) {
      return { demo: true, order_id: "DEMO-" + Date.now(), ...payload };
    }
    return this.request("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
  }
};
