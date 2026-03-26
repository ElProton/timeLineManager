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
|--------|-----------|
| `0`    | `"00:00"` |
| `75`   | `"01:15"` |
| `600`  | `"10:00"` |

### `parseTime`

```typescript
parseTime(timeStr: string): number
```

Convertit une chaîne `mm:ss` en nombre de secondes. Retourne `0` si le format est invalide.

| Entrée    | Sortie |
|-----------|--------|
| `"01:15"` | `75`   |
| `"10:00"` | `600`  |
| `"abc"`   | `0`    |

### `isValidTimeFormat`

```typescript
isValidTimeFormat(timeStr: string): boolean
```

Valide qu'une chaîne respecte le format `mm:ss` via la regex `/^\d{2,}:\d{2}$/`.

| Entrée    | Sortie  |
|-----------|---------|
| `"01:15"` | `true`  |
| `"100:00"`| `true`  |
| `"1:5"`   | `false` |
| `"ab:cd"` | `false` |

> **Note :** la regex accepte les minutes à plus de 2 chiffres (`100:00`), mais les secondes doivent être exactement 2 chiffres. Aucune validation de borne (ex: `99:99` est considéré valide par le format).
