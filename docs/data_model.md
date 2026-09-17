# Modèle de Données

## Diagramme des types

```
ProjectData
├── schemaVersion: number
├── metadata: ProjectMetadata
│     ├── title: string
│     ├── soundtrack?: string     (facultatif)
│     └── durationSeconds: number
├── tracks: Track[]
│     ├── id: string (UUID)
│     └── name: string
└── cues: Cue[]
      ├── id: string (UUID)
      ├── description: string
      ├── timeStart: number (secondes)
      ├── timeEnd: number (secondes)
      ├── trackIds: string[] (refs → Track.id)
      └── color: string (hex)
```

Fichier source : [src/types.ts](../src/types.ts)

## Vocabulaire

Le schéma v1 employait le vocabulaire du spectacle vivant : un `Actor` exécutait des
`Action`. Ces termes ne voyageaient pas hors du théâtre — un pupitre lumière, un
essaim de drones ou un traiteur ne sont pas des « acteurs ». Le v2 emploie des termes
que tous les métiers concernés reconnaissent.

| Concept | Définition                                                                    |
| ------- | ----------------------------------------------------------------------------- |
| `Track` | Une ligne de la timeline : une personne, une équipe, un appareil, un circuit. |
| `Cue`   | Un bloc temporel posé sur une ou plusieurs pistes. « Top », en régie.         |

## Interfaces TypeScript

### `ProjectMetadata`

| Propriété         | Type      | Description                                                                                                                     |
| ----------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `title`           | `string`  | Nom du projet. Requis, non vide.                                                                                                |
| `soundtrack`      | `string?` | **Facultatif.** Bande son de référence. Absent si le calage se fait sur une voix off, un time-code vidéo ou un simple minutage. |
| `durationSeconds` | `number`  | Durée totale. Strictement positive, plafonnée à `MAX_DURATION_SECONDS` (12 h).                                                  |

### `Track`

| Propriété | Type     | Description                                                        |
| --------- | -------- | ------------------------------------------------------------------ |
| `id`      | `string` | Identifiant unique (`crypto.randomUUID()`). Unique dans le projet. |
| `name`    | `string` | Libellé affiché en tête de ligne.                                  |

### `Cue`

| Propriété     | Type       | Description                                               |
| ------------- | ---------- | --------------------------------------------------------- |
| `id`          | `string`   | Identifiant unique (UUID v4).                             |
| `description` | `string`   | Libellé affiché sur le bloc.                              |
| `timeStart`   | `number`   | Début en secondes, inclus. `>= 0`.                        |
| `timeEnd`     | `number`   | Fin en secondes, exclue. Strictement `> timeStart`.       |
| `trackIds`    | `string[]` | Pistes concernées (relation N:N). Chaque id doit exister. |
| `color`       | `string`   | Couleur hex, `#rgb` ou `#rrggbb`.                         |

### `ProjectData`

| Propriété       | Type              | Description                         |
| --------------- | ----------------- | ----------------------------------- |
| `schemaVersion` | `number`          | Version du schéma. Voir ci-dessous. |
| `metadata`      | `ProjectMetadata` | Métadonnées du projet               |
| `tracks`        | `Track[]`         | Lignes de la timeline               |
| `cues`          | `Cue[]`           | Blocs temporels                     |

## Relations

```
Track (1) ←──── (N) Cue.trackIds (N) ────→ (1) Track
                    Relation N:N implicite
                    via tableau d'identifiants
```

- Un **Cue** référence une ou plusieurs **Track** via `trackIds`.
- À la suppression d'une piste, son identifiant est retiré de tous les `trackIds`.
  Un cue qui se retrouve sans aucune piste est supprimé.
- Aucune contrainte d'unicité temporelle : les cues peuvent se chevaucher.

## Versions du schéma et migration

`CURRENT_SCHEMA_VERSION` vaut **2**.

| Version | Forme                                                                |
| ------- | -------------------------------------------------------------------- |
| v0      | Sans `schemaVersion`. Fichiers antérieurs au versionnement.          |
| v1      | `actors` / `actions` / `actorIds`, `metadata.musicName` obligatoire. |
| v2      | `tracks` / `cues` / `trackIds`, `metadata.soundtrack` facultatif.    |

La chaîne de migration vit dans [src/utils/migration.ts](../src/utils/migration.ts)
et s'applique **à l'import fichier comme au chargement du cache**. Elle ne mute jamais
son entrée.

> **Toute évolution du modèle exige** : incrémenter `CURRENT_SCHEMA_VERSION`, ajouter
> une étape de migration, et un test couvrant **chaque** version antérieure. Voir
> [CONTRIBUTING.md](../CONTRIBUTING.md). Un fichier d'exemple v1 est conservé dans
> [`examples/`](../examples/) précisément pour éprouver cette chaîne.

## Validation

[src/utils/validation.ts](../src/utils/validation.ts) expose `isValidProjectData`,
**point de passage unique** pour toute donnée non fiable : cache navigateur comme
fichier importé. Elle s'exécute après la migration.

Auparavant, deux chemins divergeaient : le cache était solidement validé tandis que
l'import fichier — l'entrée la plus exposée — ne vérifiait que deux champs, laissant
passer par exemple une durée négative.

| Règle                                           | Vérifiée dans   |
| ----------------------------------------------- | --------------- |
| `schemaVersion` entier `>= 1`                   | `validation.ts` |
| `title` non vide                                | `validation.ts` |
| `0 < durationSeconds <= MAX_DURATION_SECONDS`   | `validation.ts` |
| `soundtrack` absent ou chaîne                   | `validation.ts` |
| `tracks` et `cues` sont des tableaux            | `validation.ts` |
| identifiants de piste présents et uniques       | `validation.ts` |
| `0 <= timeStart < timeEnd`, tous deux finis     | `validation.ts` |
| chaque `trackIds` référence une piste existante | `validation.ts` |
| `color` au format `#rgb` ou `#rrggbb`           | `validation.ts` |
| `timeEnd <= durationSeconds`                    | `CueModal`      |
| `trackIds.length >= 1`                          | `CueModal`      |
| format temporel `mm:ss`, secondes `<= 59`       | `time.ts`       |

## Palette de couleurs proposée

Définie dans `CueModal.tsx` :

```
#ef4444  #f97316  #f59e0b  #84cc16  #22c55e
#06b6d4  #3b82f6  #6366f1  #a855f7  #ec4899
```

Dix couleurs de la palette Tailwind. La validation accepte n'importe quelle couleur
hexadécimale, pas seulement celles-ci.
