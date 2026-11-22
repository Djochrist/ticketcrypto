# TicketCrypto — Frontend Vanilla

Site de démonstration en HTML, CSS et JavaScript natif (aucun framework, aucune compilation).

## Lancer
- VS Code : ouvrir le dossier, utiliser Live Server sur `index.html`.
- Ou, dans un terminal ouvert dans ce dossier : `python -m http.server 5500`, puis visiter `http://localhost:5500`.

> Ouvrir `index.html` par double-clic fonctionne aussi pour l'affichage, mais un petit serveur local est préférable :
> le futur backend (CORS) en aura besoin.

## Structure
```
index.html                      structure de la page
css/styles.css                  design (couleurs, mise en page, responsive)
js/events.js                    données de démonstration (événements fictifs)
js/api.js                       communication avec le backend (fetch)
js/app.js                       interactions (recherche, filtres, favoris, réservation, menu)
assets/favicon.svg              icône de l'onglet
assets/images/events/*.svg      visuels LOCAUX des événements (fonctionnent sans Internet)
assets/images/events/placeholder.svg   image de secours si un visuel est introuvable
```

## Ajouter un événement (mode démo)
1. Ajouter une image dans `assets/images/events/`.
2. Ajouter un objet dans `js/events.js` avec `image: "assets/images/events/mon-image.svg"`.
Si l'image est introuvable, `placeholder.svg` s'affiche automatiquement.

## Interactions
Recherche (insensible aux accents), filtres, favoris, fenêtre de réservation (1 à 8 billets),
choix de paiement simulé, menu mobile. Aucun argent n'est transféré.

## Backend ensuite
Dans `js/api.js`, passer `USE_MOCK_DATA` à `false`. Le frontend s'attend à `GET /api/events`
et `POST /api/orders` sur FastAPI (`http://localhost:8000`).

Règles de sécurité :
- Ne jamais mettre de secret API/paiement dans le navigateur.
- Le frontend n'envoie jamais de prix : le backend calcule le montant.
- Le paiement, les webhooks et l'émission des billets sont validés côté backend uniquement.
