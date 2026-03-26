# Architecture Applicative

## Vue d'ensemble

**Scenic Timeline Manager** est une SPA React/TypeScript permettant de modéliser visuellement une timeline scénique synchronisée sur une piste musicale, avec gestion multi-acteurs et export image.

```
┌─────────────────────────────────────────────────────────┐
│                       index.html                        │
│                     Point d'entrée                      │
└────────────────────────┬────────────────────────────────┘
                         │
                    src/main.tsx
                    (React root)
                         │
                    src/App.tsx
                  (State manager)
                         │
        ┌────────────────┼────────────────────┐
        │                │                    │
   ProjectInit      Timeline          Modals (x2)
   (Init/Import)   (Visualisation)   (CRUD Actor/Action)
```

## Stack Technique

| Couche          | Technologie                      | Version  |
|-----------------|----------------------------------|----------|
| Runtime         | React 19 (StrictMode)            | ^19.0.0  |
| Langage         | TypeScript                       | ~5.8.2   |
| Build           | Vite 6                           | ^6.2.0   |
| Styling         | Tailwind CSS 4 (plugin Vite)     | ^4.1.14  |
| Icônes          | Lucide React                     | ^0.546.0 |
| Animations      | Motion                           | ^12.23.24|
| Export image    | html-to-image                    | ^1.11.13 |
| CSS Utilities   | clsx + tailwind-merge            | —        |

> **Note :** Les dépendances `@google/genai`, `better-sqlite3`, `express`, `dotenv` sont présentes dans `package.json` mais **non utilisées** dans le code source actuel. Elles sont probablement des résidus du scaffold Google AI Studio.

## Flux de données

L'application suit un pattern **state-lifting** classique sans store externe.

```
                    ┌──────────────┐
                    │   App.tsx    │
                    │              │
                    │ projectData  │  ← useState<ProjectData | null>
                    │ filteredActor│  ← useState<string | null>
                    │ modal states │  ← useState<boolean> × 2
                    │ editing refs │  ← useState<Action|Actor|null> × 2
                    └──────┬───────┘
                           │
          ┌────────────────┼──────────────────┐
          │                │                  │
          ▼                ▼                  ▼
    ┌───────────┐   ┌───────────┐   ┌──────────────┐
    │ProjectInit│   │ Timeline  │   │ ActionModal  │
    │           │   │           │   │ ActorModal   │
    │ onInit ───┼──►│ callbacks─┼──►│ onSave ──────┼──► App.setState
    └───────────┘   └───────────┘   └──────────────┘
```

### Cycle de vie applicatif

1. **Phase Init** — `projectData === null` → affichage de `ProjectInit`
   - Création manuelle (formulaire) **ou** import JSON
   - Le callback `onInit` hydrate `projectData`

2. **Phase Édition** — `projectData !== null` → affichage Header + Toolbar + Timeline + Modals
   - Toutes les mutations passent par `setProjectData` via des handlers dans `App.tsx`
   - Aucune persistance automatique (export JSON manuel uniquement)

3. **Phase Export**
   - **JSON** : sérialisation de `projectData` → téléchargement `.json`
   - **Image** : capture DOM du composant `Timeline` via `html-to-image` → `.jpeg`

## Gestion du State

| State              | Type                   | Portée | Rôle                                         |
|--------------------|------------------------|--------|----------------------------------------------|
| `projectData`      | `ProjectData \| null`  | App    | Source de vérité unique du projet             |
| `filteredActorId`  | `string \| null`       | App    | Filtre acteur actif sur la timeline           |
| `isActionModalOpen`| `boolean`              | App    | Contrôle d'affichage du modal Action          |
| `isActorModalOpen` | `boolean`              | App    | Contrôle d'affichage du modal Actor           |
| `editingAction`    | `Action \| null`       | App    | Action en cours d'édition (null = création)   |
| `editingActor`     | `Actor \| null`        | App    | Acteur en cours d'édition (null = création)   |
| `hoveredActionId`  | `string \| null`       | Timeline| Survol pour highlight multi-acteur           |

## Pattern d'import/export

Le format de persistance est un fichier JSON conforme à l'interface `ProjectData` :

```json
{
  "metadata": { "title": "...", "musicName": "...", "durationSeconds": 900 },
  "actors": [{ "id": "uuid", "name": "Pierre" }],
  "actions": [{
    "id": "uuid",
    "description": "Entrée côté cour",
    "timeStart": 30,
    "timeEnd": 120,
    "actorIds": ["uuid-1", "uuid-2"],
    "color": "#3b82f6"
  }]
}
```

La validation à l'import est minimale : vérification de la présence de `metadata.title` et `metadata.durationSeconds`.

## Points d'attention architecturaux

- **Pas de persistance** : aucune sauvegarde automatique (localStorage, IndexedDB ou backend). Tout repose sur l'export JSON explicite.
- **Pas de routing** : application mono-page sans navigation.
- **Pas de state manager** : le state lifting dans `App.tsx` est suffisant pour la complexité actuelle mais deviendra un goulot si le nombre de features augmente.
- **Identifiants** : tous les IDs sont générés via `crypto.randomUUID()`.
- **Alias path** : `@/*` pointe vers la racine du projet (configuré dans `tsconfig.json` et `vite.config.ts`).
