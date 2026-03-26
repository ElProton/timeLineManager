# Composants React

## Arbre des composants

```
App (default export)
├── ProjectInit          ← si projectData === null
│
├── Header (inline)      ← si projectData !== null
├── Toolbar (inline)
├── Timeline (forwardRef)
├── ActionModal
└── ActorModal
```

> Header et Toolbar ne sont pas extraits en composants dédiés — ils sont rendus inline dans `App.tsx`.

---

## `App` — Orchestrateur principal

**Fichier :** [src/App.tsx](../src/App.tsx)

Composant racine. Gère l'intégralité du state applicatif et expose les handlers CRUD aux composants enfants.

### Responsabilités

- Stockage et mutation de `ProjectData` via `useState`
- Gestion du filtre acteur
- Contrôle d'ouverture/fermeture des modals
- Export JSON (sérialisation + téléchargement Blob)
- Export JPEG (capture DOM via `html-to-image`)

### Handlers exposés

| Handler              | Signature                          | Description                                                    |
|----------------------|------------------------------------|----------------------------------------------------------------|
| `handleSaveJson`     | `() => void`                       | Sérialise `projectData` en JSON et déclenche un téléchargement |
| `handleExportImage`  | `() => Promise<void>`              | Capture le DOM de la timeline en JPEG                          |
| `handleSaveAction`   | `(action: Action) => void`         | Crée ou met à jour une action (upsert par `id`)               |
| `handleDeleteAction` | `(actionId: string) => void`       | Supprime une action après confirmation                         |
| `handleSaveActor`    | `(actor: Actor) => void`           | Crée ou met à jour un acteur (upsert par `id`)                |
| `handleDeleteActor`  | `(actorId: string) => void`        | Supprime un acteur + cascade sur les actions                   |

### Logique de suppression d'acteur (cascade)

Lors de la suppression d'un acteur :
1. L'`actorId` est retiré de tous les `actorIds` de chaque action.
2. Les actions dont `actorIds` devient vide sont supprimées.
3. Si l'acteur supprimé était le filtre actif, le filtre est réinitialisé.

---

## `ProjectInit` — Initialisation du projet

**Fichier :** [src/components/ProjectInit.tsx](../src/components/ProjectInit.tsx)

Écran affiché au lancement (aucun projet chargé). Deux modes d'entrée :

### Props

| Prop     | Type                            | Description                                |
|----------|---------------------------------|--------------------------------------------|
| `onInit` | `(data: ProjectData) => void`   | Callback d'hydratation du projet           |

### Création manuelle

Formulaire avec trois champs :
- **Project Title** → `metadata.title`
- **Music Track Name** → `metadata.musicName`
- **Total Duration** (mm:ss) → `metadata.durationSeconds`

Initialise `actors: []` et `actions: []`.

### Import JSON

Lecture d'un fichier `.json` via `FileReader`. Validation minimale : présence de `metadata.title` et `metadata.durationSeconds`.

---

## `Timeline` — Visualisation de la timeline

**Fichier :** [src/components/Timeline.tsx](../src/components/Timeline.tsx)

Composant principal de visualisation. Utilise `React.forwardRef` pour permettre la capture DOM (export image).

### Props

| Prop              | Type                              | Description                              |
|-------------------|-----------------------------------|------------------------------------------|
| `data`            | `ProjectData`                     | Données complètes du projet              |
| `filteredActorId` | `string \| null`                  | ID de l'acteur filtré (null = tous)      |
| `onEditAction`    | `(action: Action) => void`        | Ouvre le modal d'édition d'action        |
| `onDeleteAction`  | `(actionId: string) => void`      | Supprime une action                      |
| `onEditActor`     | `(actor: Actor) => void`          | Ouvre le modal d'édition d'acteur        |
| `onDeleteActor`   | `(actorId: string) => void`       | Supprime un acteur                       |

### Structure du rendu

```
┌──────────────────────────────────────────────────────┐
│ [Music Name]  │  00:00 ... 00:30 ... 01:00 ...      │  ← Header temporel
├───────────────┼──────────────────────────────────────┤
│ Actor 1  [✎🗑]│  ██████  ████████████                │  ← Ligne acteur
│ Actor 2  [✎🗑]│       ████████       ██████████      │
│ Actor 3  [✎🗑]│  ██████████████████████████          │
└───────────────┴──────────────────────────────────────┘
```

### Calcul des positions

Les blocs d'action sont positionnés en CSS `absolute` :
- `left` = `(action.timeStart / durationSeconds) * 100%`
- `width` = `((action.timeEnd - action.timeStart) / durationSeconds) * 100%`

### Marqueurs temporels

- Intervalle de **30s** si durée totale ≤ 10 minutes
- Intervalle de **60s** si durée totale > 10 minutes

### Highlight multi-acteur

Au survol d'une action multi-acteur, des lignes verticales en pointillé relient visuellement les instances de l'action sur les différentes lignes d'acteurs.

### Comportement au clic

- **Clic sur un bloc action** → ouvre le modal d'édition avec les données pré-remplies
- **Boutons ✎/🗑 sur le label acteur** → visibles au hover, déclenchent édition/suppression

---

## `ActionModal` — CRUD des actions

**Fichier :** [src/components/ActionModal.tsx](../src/components/ActionModal.tsx)

Modal de création/édition d'une action.

### Props

| Prop            | Type                          | Description                                  |
|-----------------|-------------------------------|----------------------------------------------|
| `isOpen`        | `boolean`                     | Contrôle de visibilité                       |
| `onClose`       | `() => void`                  | Fermeture du modal                           |
| `onSave`        | `(action: Action) => void`    | Callback de sauvegarde                       |
| `initialAction` | `Action \| null \| undefined` | Action existante (édition) ou null (création)|
| `actors`        | `Actor[]`                     | Liste des acteurs disponibles                |
| `maxDuration`   | `number`                      | Durée max en secondes (borne de validation)  |

### Champs du formulaire

| Champ          | Type            | Validation                                      |
|----------------|-----------------|--------------------------------------------------|
| Description    | `text`          | Requis, non vide                                 |
| Start Time     | `text` (mm:ss)  | Format mm:ss, < endTime, ≥ 00:00                |
| End Time       | `text` (mm:ss)  | Format mm:ss, > startTime, ≤ maxDuration         |
| Actors         | Multi-select    | Au moins 1 acteur sélectionné                    |
| Color          | Color picker    | Sélection parmi 10 couleurs prédéfinies          |

### Comportement

- En **mode création** : `initialAction` est `null`, l'ID sera généré par `crypto.randomUUID()`
- En **mode édition** : les champs sont pré-remplis via `useEffect` sur `initialAction`
- Le `useEffect` se déclenche aussi sur `isOpen` pour réinitialiser le formulaire

---

## `ActorModal` — CRUD des acteurs

**Fichier :** [src/components/ActorModal.tsx](../src/components/ActorModal.tsx)

Modal de création/édition d'un acteur.

### Props

| Prop           | Type                          | Description                                  |
|----------------|-------------------------------|----------------------------------------------|
| `isOpen`       | `boolean`                     | Contrôle de visibilité                       |
| `onClose`      | `() => void`                  | Fermeture du modal                           |
| `onSave`       | `(actor: Actor) => void`      | Callback de sauvegarde                       |
| `initialActor` | `Actor \| null \| undefined`  | Acteur existant (édition) ou null (création) |

### Champ unique

| Champ      | Type   | Validation           |
|------------|--------|----------------------|
| Actor Name | `text` | Requis, non vide (trimmed) |
