# Cours-EMOIS — Plan d'actions (démo pédagogique)

Petit site web (1 page) pour illustrer comment créer une appli complète avec peu de compétences informatiques :

- un **serveur Node.js** (Express)
- une base **SQLite** (fichier local)
- une **page web** “Gestion de plan d'actions” avec menus déroulants + ajout d'actions

## Prérequis

- Node.js (dans GitHub Codespaces c'est généralement déjà OK)

## Installation

```bash
npm install
```

## Lancer en mode dev

```bash
npm run dev
```

Puis ouvrir : http://localhost:3000

## Lancer en mode normal

```bash
npm start
```

## Où regarder dans le code ?

- API + serveur : [server.js](server.js)
- SQLite (création table + requêtes) : [src/db.js](src/db.js)
- Page web : [public/index.html](public/index.html)
- JS côté navigateur (fetch API) : [public/app.js](public/app.js)
- Styles : [public/styles.css](public/styles.css)

## Notes

- La base est stockée dans `data.sqlite` (non versionnée via `.gitignore`).
- Pour changer l'emplacement : variable d'environnement `SQLITE_PATH`.