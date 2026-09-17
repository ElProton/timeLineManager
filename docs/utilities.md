# Fonctions Utilitaires

## `cn` — Merge de classes CSS

**Fichier :** [src/utils/cn.ts](../src/utils/cn.ts)

```typescript
cn(...inputs: ClassValue[]): string
```

Combine `clsx` (concaténation conditionnelle de classes) et `tailwind-merge` (résolution des conflits Tailwind CSS). Pattern standard dans les projets Tailwind.

**Usage :** appliquer des classes conditionnelles sans conflit de spécificité Tailwind.

```tsx
className={cn(
  "base-class",
  isActive && "bg-blue-500",   // clsx : inclusion conditionnelle
  "bg-red-500"                 // tailwind-merge : résout le conflit → bg-red-500 gagne
)}
```

---

## Module `time` — Manipulation temporelle

**Fichier :** [src/utils/time.ts](../src/utils/time.ts)

Toutes les fonctions opèrent sur le format `mm:ss` ↔ secondes (entiers).

### `formatTime`

```typescript
formatTime(seconds: number): string
```

Convertit un nombre de secondes en chaîne `mm:ss` (zéro-paddé).

| Entrée | Sortie    |
| ------ | --------- |
| `0`    | `"00:00"` |
| `75`   | `"01:15"` |
| `600`  | `"10:00"` |

### `parseTime`

```typescript
parseTime(timeStr: string): number
```

Convertit une chaîne `mm:ss` en nombre de secondes. Retourne `0` si le format est invalide.

| Entrée    | Sortie |
| --------- | ------ |
| `"01:15"` | `75`   |
| `"10:00"` | `600`  |
| `"abc"`   | `0`    |

### `isValidTimeFormat`

```typescript
isValidTimeFormat(timeStr: string): boolean
```

Valide qu'une chaîne respecte le format `mm:ss` via la regex `/^\d{2,}:\d{2}$/`.

| Entrée     | Sortie  |
| ---------- | ------- |
| `"01:15"`  | `true`  |
| `"100:00"` | `true`  |
| `"1:5"`    | `false` |
| `"ab:cd"`  | `false` |

> **Note :** la regex accepte les minutes à plus de 2 chiffres (`100:00`), mais les secondes doivent être exactement 2 chiffres. Aucune validation de borne (ex: `99:99` est considéré valide par le format).

### `sanitiseFilename`

```typescript
sanitiseFilename(name: string): string
```

Rend une chaîne libre utilisable comme nom de fichier téléchargé. Les titres de projet
étant saisis librement, un projet nommé « Gala 1/2 » produisait auparavant un nom de
fichier tronqué ou rejeté selon le système.

| Entrée               | Sortie               |
| -------------------- | -------------------- |
| `"Opening ceremony"` | `"Opening_ceremony"` |
| `"Gala 1/2"`         | `"Gala_1-2"`         |
| `"  spaced   out "`  | `"spaced_out"`       |
| `""`                 | `"timeline"`         |

Les caractères interdits (`/ \ : * ? " < > |`) deviennent des tirets, les caractères
de contrôle sont supprimés, les espaces deviennent des underscores, et le résultat est
plafonné à 100 caractères. Les caractères accentués sont conservés.

---

## Module `timeline` — Échelle temporelle

**Fichier :** [src/utils/timeline.ts](../src/utils/timeline.ts)

### `markerStep` et `markerTimes`

```typescript
markerStep(durationSeconds: number): number
markerTimes(durationSeconds: number): number[]
```

Choisit un intervalle entre marqueurs dans une échelle de valeurs rondes
(1, 2, 5, 10, 15, 30, 60, 120, 300, 600, 900, 1800, 3600 s), de façon à ne jamais
dépasser 40 marqueurs sur l'axe.

| Durée     | Pas retenu | Marqueurs |
| --------- | ---------- | --------- |
| 3 min     | 5 s        | 37        |
| 15 min    | 30 s       | 31        |
| 1 h       | 2 min      | 31        |
| `9999:00` | 15 min     | 40        |

> **Historique.** La règle précédente — 30 s en dessous de dix minutes, 60 s au-dessus —
> générait **10 000 marqueurs par ligne de piste** pour une durée mal saisie telle que
> `9999:00`, ce qui figeait l'onglet. Elle laissait par ailleurs une timeline de trois
> minutes avec seulement sept repères.

---

## Module `validation` — Validation structurelle

**Fichier :** [src/utils/validation.ts](../src/utils/validation.ts)

### `isValidProjectData`

```typescript
isValidProjectData(data: unknown): data is ProjectData
```

Point de passage unique pour toute donnée non fiable — cache navigateur comme fichier
importé —, exécuté après la migration. Le détail des règles est dans
[data_model.md](data_model.md#validation).

---

## Module `migration` — Migration de schéma

**Fichier :** [src/utils/migration.ts](../src/utils/migration.ts)

### `migrateProject`

```typescript
migrateProject(data: unknown): Record<string, unknown> | null
```

Applique la chaîne `v0 → v1 → v2`. Retourne `null` si la donnée est inexploitable ou
porte une version inconnue. **Ne mute jamais son entrée** : chaque étape reconstruit
les objets champ par champ, sans `structuredClone` — que jsdom ne fournit pas.
