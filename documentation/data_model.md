# Modèle de Données

## Diagramme des types

```
ProjectData
├── metadata: ProjectMetadata
│     ├── title: string
│     ├── musicName: string
│     └── durationSeconds: number
├── actors: Actor[]
│     ├── id: string (UUID)
│     └── name: string
└── actions: Action[]
      ├── id: string (UUID)
      ├── description: string
      ├── timeStart: number (secondes)
      ├── timeEnd: number (secondes)
      ├── actorIds: string[] (refs → Actor.id)
      └── color: string (hex)
```

## Interfaces TypeScript

Fichier source : [src/types.ts](../src/types.ts)

### `ProjectMetadata`

Métadonnées globales du projet, définies à l'initialisation.

| Propriété         | Type     | Description                                      |
|-------------------|----------|--------------------------------------------------|
| `title`           | `string` | Nom du projet                                    |
| `musicName`       | `string` | Nom de la piste musicale de référence            |
| `durationSeconds` | `number` | Durée totale de la timeline en secondes           |

### `Actor`

Représente un acteur/performeur positionné sur une ligne de la timeline.

| Propriété | Type     | Description                                |
|-----------|----------|--------------------------------------------|
| `id`      | `string` | Identifiant unique (UUID v4 via `crypto.randomUUID()`) |
| `name`    | `string` | Nom d'affichage de l'acteur                |

### `Action`

Représente un bloc temporel sur la timeline, lié à un ou plusieurs acteurs.

| Propriété     | Type       | Description                                          |
|---------------|------------|------------------------------------------------------|
| `id`          | `string`   | Identifiant unique (UUID v4)                         |
| `description` | `string`   | Libellé affiché sur le bloc timeline                 |
| `timeStart`   | `number`   | Début de l'action en secondes (inclus)               |
| `timeEnd`     | `number`   | Fin de l'action en secondes (exclus)                 |
| `actorIds`    | `string[]` | Liste d'IDs d'acteurs associés (relation N:N)        |
| `color`       | `string`   | Couleur hex du bloc (ex: `#3b82f6`)                  |

### `ProjectData`

Agrégat racine contenant l'intégralité de l'état persistable du projet.

| Propriété  | Type              | Description                    |
|------------|-------------------|--------------------------------|
| `metadata` | `ProjectMetadata` | Métadonnées du projet          |
| `actors`   | `Actor[]`         | Liste des acteurs              |
| `actions`  | `Action[]`        | Liste des actions              |

## Relations

```
Actor (1) ←──── (N) Action.actorIds (N) ────→ (1) Actor
                    Relation many-to-many implicite
                    via tableau d'IDs
```

- Une **Action** référence un ou plusieurs **Actors** via `actorIds`.
- Lors de la suppression d'un Actor, les `actorIds` de toutes les Actions sont nettoyées. Si une Action se retrouve sans acteur, elle est supprimée.
- Il n'y a pas de contrainte d'unicité sur les plages temporelles : les actions peuvent se chevaucher.

## Contraintes de validation

| Règle                                       | Vérifiée dans        |
|---------------------------------------------|----------------------|
| `timeStart < timeEnd`                       | `ActionModal`        |
| `0 ≤ timeStart` et `timeEnd ≤ maxDuration`  | `ActionModal`        |
| `actorIds.length ≥ 1`                       | `ActionModal`        |
| `description` non vide                      | `ActionModal`        |
| `name` non vide (trim)                      | `ActorModal`         |
| `durationSeconds > 0`                       | `ProjectInit`        |
| Format temporel `mm:ss`                     | `ProjectInit`, `ActionModal` |

## Palette de couleurs disponibles

Définie en dur dans `ActionModal.tsx` :

```
#ef4444  #f97316  #f59e0b  #84cc16  #22c55e
#06b6d4  #3b82f6  #6366f1  #a855f7  #ec4899
```

10 couleurs de la palette Tailwind CSS (red→pink, nuances 400-500).
