# Environnement de Développement

## Prérequis

- **Node.js** (version LTS recommandée)
- **npm** (inclus avec Node.js)

## Installation

```bash
npm install
```

## Scripts npm

| Script         | Commande              | Description                                        |
|----------------|-----------------------|----------------------------------------------------|
| `npm run dev`  | `vite --port=3000 --host=0.0.0.0` | Serveur de développement avec HMR        |
| `npm run build`| `vite build`          | Build de production dans `dist/`                   |
| `npm run preview`| `vite preview`      | Sert le build de production localement             |
| `npm run clean`| `rm -rf dist`         | Supprime le dossier de build                       |
| `npm run lint` | `tsc --noEmit`        | Vérification TypeScript sans émission de fichiers  |

## Configuration Vite

Fichier : [vite.config.ts](../vite.config.ts)

### Plugins

| Plugin                  | Rôle                                        |
|-------------------------|---------------------------------------------|
| `@vitejs/plugin-react`  | Support JSX/React                           |
| `@tailwindcss/vite`     | Intégration Tailwind CSS 4 (sans PostCSS)   |

### Variables d'environnement

| Variable           | Source         | Injection                                      |
|--------------------|----------------|-------------------------------------------------|
| `GEMINI_API_KEY`   | `.env.local`   | `process.env.GEMINI_API_KEY` (compile-time)     |
| `DISABLE_HMR`     | Environnement  | Désactive le HMR si `"true"` (usage AI Studio)  |

### Alias de paths

| Alias | Résolution          |
|-------|---------------------|
| `@/*` | Racine du projet    |

Configuré en miroir dans `tsconfig.json` et `vite.config.ts`.

## Configuration TypeScript

Fichier : [tsconfig.json](../tsconfig.json)

| Option clé                    | Valeur        | Note                                     |
|-------------------------------|---------------|------------------------------------------|
| `target`                      | `ES2022`      | —                                        |
| `module`                      | `ESNext`      | —                                        |
| `moduleResolution`            | `bundler`     | Résolution optimisée pour Vite           |
| `jsx`                         | `react-jsx`   | Nouveau transform JSX (pas besoin d'import React) |
| `noEmit`                      | `true`        | TypeScript utilisé uniquement pour le type-checking |
| `experimentalDecorators`      | `true`        | Activé mais non utilisé dans le code     |
| `allowImportingTsExtensions`  | `true`        | Permet `import "./file.tsx"`             |

## Structure des fichiers

```
timeLineManager/
├── index.html                 # Point d'entrée HTML (SPA)
├── metadata.json              # Métadonnées Google AI Studio
├── package.json
├── tsconfig.json
├── vite.config.ts
├── .env.local                 # Variables d'environnement (non versionné)
├── documentation/             # Documentation technique (ce dossier)
│   ├── architecture.md
│   ├── components.md
│   ├── data_model.md
│   ├── dev_setup.md
│   └── utilities.md
└── src/
    ├── main.tsx               # Bootstrapping React (createRoot + StrictMode)
    ├── App.tsx                # Composant racine + state management
    ├── types.ts               # Interfaces TypeScript (modèle de données)
    ├── index.css              # Imports Tailwind + font Inter
    ├── components/
    │   ├── ProjectInit.tsx    # Écran d'initialisation / import
    │   ├── Timeline.tsx       # Visualisation timeline (forwardRef)
    │   ├── ActionModal.tsx    # Modal CRUD action
    │   └── ActorModal.tsx     # Modal CRUD acteur
    └── utils/
        ├── cn.ts              # Utilitaire clsx + tailwind-merge
        └── time.ts            # Formatage / parsing temporel mm:ss
```

## Styling

- **Framework** : Tailwind CSS 4 via le plugin Vite (pas de `tailwind.config.js`)
- **Thème** : configuré via `@theme` dans [src/index.css](../src/index.css)
- **Police** : Inter (Google Fonts, chargée via CDN)
- **Design system** : palette `neutral` pour les bases, `indigo` pour les accents

## Dépendances non utilisées

Les packages suivants sont déclarés dans `package.json` mais **absents du code source** :

| Package           | Origine probable               |
|-------------------|--------------------------------|
| `@google/genai`   | Scaffold Google AI Studio      |
| `better-sqlite3`  | Scaffold Google AI Studio      |
| `express`         | Scaffold Google AI Studio      |
| `dotenv`          | Scaffold Google AI Studio      |
| `motion`          | Prévu pour animations futures  |

Ces dépendances peuvent être retirées via `npm uninstall` pour alléger le projet.
