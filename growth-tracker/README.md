# Suivi de Croissance

Application TypeScript pour suivre la croissance d'un enfant : **taille**, **poids** et **tour de crâne**.

## Fonctionnalités

- 📊 **3 courbes** interactives (taille, poids, tour de crâne)
- 🔍 **Zoom / dézoom** à la molette, pinch sur mobile
- 🖱 **Navigation** dans les courbes par clic + glisser
- ➕ **Ajout / modification / suppression** de mesures avec date
- 💾 **Stockage automatique** dans `data/measurements.json` à chaque modification
- 👶 Calcul de l'âge au moment de chaque mesure

## Installation

```bash
cd growth-tracker
npm install
```

## Lancement (développement)

```bash
npm run dev
```

L'application sera disponible sur **http://localhost:3000**

> La commande compile d'abord le TypeScript client (`client/app.ts → public/app.js`),
> puis démarre le serveur Express avec `ts-node`.

## Build (production)

```bash
npm run build
npm start
```

## Structure du projet

```
growth-tracker/
├── src/
│   ├── server.ts          # Serveur Express + API REST
│   └── types.ts           # Interfaces TypeScript partagées
├── client/
│   └── app.ts             # Frontend TypeScript (graphiques, formulaires)
├── public/
│   ├── index.html         # Interface utilisateur
│   ├── styles.css         # Styles
│   └── app.js             # Compilé depuis client/app.ts
├── data/
│   └── measurements.json  # Données persistées
├── package.json
├── tsconfig.json          # Config TS serveur
└── tsconfig.client.json   # Config TS client
```

## API REST

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/data` | Toutes les données |
| PUT | `/api/patient` | Mettre à jour le patient |
| GET | `/api/measurements` | Liste des mesures |
| POST | `/api/measurements` | Ajouter une mesure |
| PUT | `/api/measurements/:id` | Modifier une mesure |
| DELETE | `/api/measurements/:id` | Supprimer une mesure |

## Contrôles des graphiques

| Action | Effet |
|--------|-------|
| Molette souris | Zoom avant / arrière |
| Clic + glisser | Déplacer la vue |
| Double-clic | Réinitialiser zoom |
| Bouton "↺ Réinitialiser zoom" | Réinitialiser zoom |
