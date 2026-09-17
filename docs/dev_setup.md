# Environnement de Développement

## Prérequis

- **Node.js 20 ou plus** (le projet est validé en CI sur Node 20 et 22)
- **npm** (fourni avec Node.js)

Aucune clé d'API, aucun service externe, aucune base de données : l'application
s'exécute intégralement dans le navigateur.

## Installation

```bash
npm install
npm run dev
```

L'application est alors servie sur <http://localhost:3000>.

## Scripts npm

| Script                 | Commande                          | Description                                    |
| ---------------------- | --------------------------------- | ---------------------------------------------- |
| `npm run dev`          | `vite --port=3000 --host=0.0.0.0` | Serveur de développement avec HMR              |
| `npm run build`        | `vite build`                      | Build de production dans `dist/`               |
| `npm run preview`      | `vite preview`                    | Sert le build de production localement         |
| `npm run clean`        | `rm -rf dist`                     | Supprime le dossier de build                   |
| `npm run typecheck`    | `tsc --noEmit`                    | Vérification TypeScript sans émission          |
| `npm run lint`         | `eslint .`                        | Analyse statique ESLint                        |
| `npm run format`       | `prettier --write .`              | Reformate les fichiers                         |
| `npm run format:check` | `prettier --check .`              | Échoue si un fichier n'est pas formaté         |
| `npm test`             | `vitest run`                      | Exécute la suite de tests une fois             |
| `npm run test:watch`   | `vitest`                          | Exécute la suite de tests en continu           |
| `npm run verify`       | enchaînement                      | typecheck + lint + format:check + test + build |

`npm run verify` reproduit exactement la séquence exécutée par la CI. **Lancez-le
avant d'ouvrir une pull request** : si elle passe en local, elle passera en CI.

## Configuration Vite

Fichier : [../vite.config.ts](../vite.config.ts)

### Plugins

| Plugin                 | Rôle                                      |
| ---------------------- | ----------------------------------------- |
| `@vitejs/plugin-react` | Support JSX/React                         |
| `@tailwindcss/vite`    | Intégration Tailwind CSS 4 (sans PostCSS) |

### Variables d'environnement

**Aucune.** L'application ne lit aucune variable d'environnement — il n'y a ni
`.env`, ni `.env.local`, ni appel à `process.env` dans `src/`.

### Alias de paths

| Alias | Résolution |
| ----- | ---------- |
| `@/*` | `./src/*`  |

Configuré en miroir dans `tsconfig.json` et `vite.config.ts`.

### Tests

Vitest est configuré dans le même fichier que Vite :

- environnement `jsdom`
- `globals: true` (pas besoin d'importer `describe` / `it` / `expect`)
- `setupFiles: ./src/__tests__/setup.ts`, qui charge les matchers
  `@testing-library/jest-dom` et purge le DOM après chaque test
- les fichiers de test sont `src/**/*.test.{ts,tsx}`

## Configuration TypeScript

Fichier : [../tsconfig.json](../tsconfig.json)

| Option clé             | Valeur      | Note                                                      |
| ---------------------- | ----------- | --------------------------------------------------------- |
| `strict`               | `true`      | Mode strict complet, non négociable                       |
| `noUnusedLocals`       | `true`      | Refuse les variables et imports morts                     |
| `noUnusedParameters`   | `true`      | Préfixer par `_` pour ignorer volontairement un paramètre |
| `verbatimModuleSyntax` | `true`      | Impose `import type` pour les imports de types            |
| `moduleResolution`     | `bundler`   | Résolution optimisée pour Vite                            |
| `jsx`                  | `react-jsx` | Nouveau transform JSX, pas d'import de `React` nécessaire |
| `noEmit`               | `true`      | TypeScript sert uniquement au type-checking               |

> **Historique.** `@types/react` et `@types/react-dom` étaient absents du projet
> jusqu'à sa remise à niveau. Comme `strict` était par ailleurs désactivé, tout le
> code JSX était typé implicitement `any` et `tsc --noEmit` passait sans rien
> vérifier. Ne retirez pas ces deux paquets.

## Qualité de code

| Outil          | Fichier de configuration | Portée                                            |
| -------------- | ------------------------ | ------------------------------------------------- |
| ESLint 9       | `eslint.config.js`       | `js` recommandé, `typescript-eslint`, hooks React |
| Prettier 3     | `.prettierrc.json`       | Tout le dépôt sauf `dist`, `coverage`, le lock    |
| EditorConfig   | `.editorconfig`          | Indentation, fins de ligne, encodage              |
| Git attributes | `.gitattributes`         | Force les fins de ligne LF                        |

Les fichiers sources sont en **UTF-8 sans BOM**. Le dépôt en a été purgé ; ne
réintroduisez pas de BOM (certains éditeurs Windows en ajoutent un par défaut).

## Structure des fichiers

```
timeLineManager/
├── index.html                 # Point d'entrée HTML (SPA)
├── eslint.config.js
├── package.json
├── tsconfig.json
├── vite.config.ts
├── public/
│   └── favicon.svg
├── docs/                      # Documentation technique (ce dossier)
└── src/
    ├── main.tsx               # Bootstrapping React (createRoot + StrictMode)
    ├── App.tsx                # Composition de l'interface
    ├── types.ts               # Modèle de données et version du schéma
    ├── index.css              # Imports Tailwind + police Inter
    ├── components/
    │   ├── ProjectInit.tsx    # Écran d'initialisation / import
    │   ├── Timeline.tsx       # Visualisation timeline (forwardRef)
    │   ├── Modal.tsx          # Coquille de modale générique
    │   ├── ActionModal.tsx    # Modale CRUD action
    │   ├── ActorModal.tsx     # Modale CRUD acteur
    │   └── MetadataModal.tsx  # Modale des métadonnées projet
    ├── hooks/
    │   ├── projectReducer.ts  # Reducer + historique undo/redo
    │   ├── useProjectManager.ts
    │   ├── useModals.ts
    │   └── useExport.ts
    ├── utils/
    │   ├── cn.ts              # clsx + tailwind-merge
    │   ├── time.ts            # Formatage / parsing mm:ss
    │   ├── storage.ts         # Persistance localStorage
    │   └── migration.ts       # Migration de schéma
    └── __tests__/
        ├── setup.ts           # Setup Vitest (jest-dom + cleanup)
        └── *.test.ts
```

## Styling

- **Framework** : Tailwind CSS 4 via le plugin Vite (pas de `tailwind.config.js`)
- **Thème** : configuré via `@theme` dans [../src/index.css](../src/index.css)
- **Police** : Inter, chargée depuis Google Fonts
- **Design system** : palette `neutral` pour les fonds, `indigo` pour les accents
