# Spécification : Système de Cache Local (Auto-save)

## 1. Résumé Exécutif
**Objectif :** Éliminer le risque de perte de données en persistant automatiquement l'état du projet dans le `localStorage` du navigateur, et proposer la restauration au relancement de l'application.
**Consommateurs :** Utilisateur de l'application (humain via le navigateur)
**Criticité :** Haute — c'est actuellement le principal point faible de l'application (aucune persistance).

---

## 2. Périmètre

### 2.1 Dans le scope (MVP)
- Sauvegarde automatique de `ProjectData` dans `localStorage` à chaque mutation
- Restauration au lancement avec choix utilisateur ("Reprendre" / "Nouveau projet")
- Purge manuelle du cache (bouton dans le header)
- Protection contre la fermeture accidentelle (`beforeunload`)

### 2.2 Hors scope (Évolutions futures)
- Indicateur visuel "dernière sauvegarde il y a Xs" — *Confort UX, non critique pour le MVP*
- Support multi-projet en cache — *Nécessite un refactoring du modèle de stockage (clés indexées, sélecteur de projet)*

---

## 3. Spécifications Fonctionnelles

### 3.1 Acteurs
| Acteur | Type | Description |
|--------|------|-------------|
| Utilisateur | Humain | Crée/modifie un projet via l'interface |
| Navigateur | Système | Fournit `localStorage` et l'événement `beforeunload` |

### 3.2 Règles de Gestion
| ID | Règle | Justification |
|----|-------|---------------|
| RG-01 | Le cache est écrit à chaque mutation de `projectData` (création, édition, suppression d'acteur/action, modification des métadonnées) | Mutations discrètes via modals — pas besoin de debounce |
| RG-02 | Une seule entrée `localStorage` est utilisée (clé unique) | Un seul projet géré simultanément |
| RG-03 | Si un cache valide existe au lancement, l'utilisateur choisit entre "Reprendre" et "Nouveau projet" | Éviter de charger silencieusement un vieux projet |
| RG-04 | Cliquer "Nouveau projet" dans le flow de restauration NE purge PAS le cache immédiatement — il sera écrasé dès que le nouveau projet est initialisé | Filet de sécurité en cas de mauvaise manipulation |
| RG-05 | Le bouton "Purge cache" supprime l'entrée `localStorage` ET réinitialise le state `projectData` à `null` (retour à `ProjectInit`) | Retour à l'état initial propre |
| RG-06 | Si `localStorage` est indisponible ou plein, l'app fonctionne normalement sans cache (dégradation gracieuse) | Ne jamais bloquer l'utilisateur pour un problème de stockage |
| RG-07 | Le cache est écrasé (et non supprimé) quand l'utilisateur importe un JSON ou crée un nouveau projet | L'import/création deviennent la nouvelle source de vérité |

### 3.3 Scénarios d'Usage

#### Scénario Nominal — Sauvegarde automatique
1. L'utilisateur modifie le projet (ajout d'acteur, modification d'action, etc.)
2. Le `useEffect` détecte le changement de `projectData`
3. `projectData` est sérialisé en JSON et écrit dans `localStorage`
4. Aucun feedback visuel (opération transparente)

#### Scénario Nominal — Restauration au lancement
1. L'utilisateur ouvre l'application
2. L'app détecte une entrée valide dans `localStorage`
3. L'écran `ProjectInit` affiche un bandeau/section : *"Un projet précédent a été trouvé : **{titre}** ({durée}). Reprendre ?"*
4. **Si "Reprendre"** → `onInit(cachedData)` — le projet est chargé directement
5. **Si "Nouveau projet"** → l'utilisateur voit le formulaire de création normal

#### Scénario Nominal — Purge manuelle
1. L'utilisateur clique sur le bouton de purge dans le header
2. Une confirmation est demandée : *"Voulez-vous supprimer le projet en cache et repartir de zéro ?"*
3. **Si confirmé** → `localStorage.removeItem(...)`, `setProjectData(null)` → retour à `ProjectInit`
4. **Si annulé** → aucun effet

#### Scénarios Alternatifs et d'Erreur
| ID | Condition | Comportement attendu | Code/Message erreur |
|----|-----------|---------------------|---------------------|
| ALT-01 | Cache vide au lancement | Afficher `ProjectInit` normalement (formulaire + import), aucun bandeau de restauration | — |
| ALT-02 | Cache contient un JSON invalide/corrompu | Supprimer silencieusement l'entrée corrompue, afficher `ProjectInit` normalement | Console: `warn("Cached project data is corrupted, clearing cache.")` |
| ALT-03 | `localStorage` indisponible (navigation privée, quota dépassé) | L'app fonctionne sans cache, aucune erreur visible pour l'utilisateur | Console: `warn("localStorage unavailable, auto-save disabled.")` |
| ERR-01 | Écriture en cache échoue (`QuotaExceededError`) | Ignorer l'erreur, log en console | Console: `warn("Failed to save to cache:", error)` |

---

## 4. Spécifications Techniques

### 4.1 Architecture

**Nouveau module :** `src/utils/storage.ts` — encapsule toutes les opérations `localStorage`.

**Pattern :** Module utilitaire pur (fonctions stateless) + `useEffect` dans `App.tsx` pour la réactivité.

```
App.tsx
  │
  ├── useState<ProjectData | null>(null)
  │
  ├── [INIT] Au montage : loadCachedProject() → si valide, passe à ProjectInit via prop
  │
  ├── [SYNC] useEffect([projectData]) → saveCachedProject(projectData)
  │
  └── [PURGE] handleClearCache() → clearCachedProject() + setProjectData(null)
          │
          ▼
   src/utils/storage.ts
     ├── saveCachedProject(data: ProjectData): void
     ├── loadCachedProject(): ProjectData | null
     ├── clearCachedProject(): void
     └── isCacheAvailable(): boolean
```

### 4.2 Contrat d'Interface — Module `storage.ts`

```typescript
// Clé localStorage
const STORAGE_KEY = "stm_project_cache";

/**
 * Sauvegarde le projet dans localStorage.
 * Échoue silencieusement si localStorage est indisponible ou plein.
 */
function saveCachedProject(data: ProjectData): void

/**
 * Charge le projet depuis localStorage.
 * Retourne null si :
 *   - Aucune donnée en cache
 *   - JSON invalide
 *   - Structure ProjectData invalide
 * Supprime automatiquement les entrées corrompues.
 */
function loadCachedProject(): ProjectData | null

/**
 * Supprime l'entrée cache.
 */
function clearCachedProject(): void

/**
 * Vérifie la disponibilité de localStorage (test write/read/delete).
 */
function isCacheAvailable(): boolean
```

### 4.3 Modifications des composants existants

#### `App.tsx`

| Modification | Description |
|---|---|
| Chargement initial | Au montage, appeler `loadCachedProject()`. Si résultat non-null, stocker dans un state `cachedProject` passé à `ProjectInit`. |
| `useEffect` de sync | Écouter `projectData` — si non-null, appeler `saveCachedProject(projectData)`. |
| Handler `handleClearCache` | `clearCachedProject()` + `setProjectData(null)` + confirmation préalable. |
| Bouton header | Ajouter une icône de purge (ex: `Trash2` ou `RotateCcw`) dans le header, à côté des exports. |

#### `ProjectInit.tsx`

| Modification | Description |
|---|---|
| Nouvelle prop | `cachedProject?: ProjectData \| null` — le projet trouvé en cache. |
| Bandeau de restauration | Si `cachedProject` est fourni, afficher une section au-dessus du formulaire avec le titre/durée du projet en cache et deux boutons : "Resume Project" / "New Project". |
| Action "Resume" | Appel `onInit(cachedProject)`. |
| Action "New Project" | Masquer le bandeau, afficher le formulaire normal. |

### 4.4 Validation du cache à la lecture

La fonction `loadCachedProject` doit vérifier la structure minimale :
```
data !== null
data.metadata !== undefined
data.metadata.title (typeof string, non vide)
data.metadata.durationSeconds (typeof number, > 0)
data.actors (Array.isArray)
data.actions (Array.isArray)
```

Si la validation échoue → `clearCachedProject()` + return `null`.

### 4.5 Contraintes Techniques
| Contrainte | Valeur | Justification |
|------------|--------|---------------|
| Taille max cache | ~5 Mo (limite `localStorage`) | Suffisant pour des projets de petite taille |
| Clé `localStorage` | `"stm_project_cache"` | Préfixe `stm_` pour éviter les collisions |
| Sérialisation | `JSON.stringify` (pas de minification) | Lisibilité en debug, taille négligeable |
| Fréquence d'écriture | Synchrone à chaque mutation | Mutations discrètes (modals), aucun impact perf |

### 4.6 Dépendances
| Dépendance | Type | Statut | Impact si indisponible |
|------------|------|--------|------------------------|
| `localStorage` (Web API) | Navigateur | Existant | Dégradation gracieuse — app fonctionne sans cache (RG-06) |

---

## 5. Sécurité

### 5.1 Authentification & Autorisation
- **Non applicable** — application locale sans backend, pas d'authentification.

### 5.2 Données Sensibles
| Donnée | Classification | Mesures de protection |
|--------|---------------|----------------------|
| `ProjectData` (titre, acteurs, actions) | Public / Non sensible | Aucune mesure spécifique — stockage en clair dans `localStorage` |

### 5.3 Menaces Identifiées
| Menace | Probabilité | Mitigation |
|--------|-------------|------------|
| Corruption du cache (écriture partielle, manipulation manuelle) | Basse | Validation structurelle à la lecture + suppression automatique si invalide (ALT-02) |
| `localStorage` plein | Très basse | `try/catch` sur l'écriture, dégradation gracieuse (ERR-01) |

---

## 6. Observabilité
- **Logs critiques :**
  - `console.warn` si le cache est corrompu et purgé automatiquement
  - `console.warn` si `localStorage` est indisponible
  - `console.warn` si l'écriture échoue (`QuotaExceededError`)
- **Métriques :** Non applicable (app locale sans télémétrie)
- **Alertes :** Non applicable

---

## 7. Critères d'Acceptation (Definition of Done)

### Fonctionnels
- [ ] Modifier un acteur/action/métadonnée persiste automatiquement le projet en `localStorage`
- [ ] Fermer et rouvrir l'onglet affiche un bandeau de restauration avec le titre du projet en cache
- [ ] Cliquer "Resume Project" charge le projet depuis le cache
- [ ] Cliquer "New Project" affiche le formulaire de création (sans purger le cache)
- [ ] Le bouton de purge dans le header supprime le cache et ramène à l'écran d'initialisation après confirmation
- [ ] Importer un JSON ou créer un projet écrase le cache précédent
- [ ] L'import d'un JSON corrompu en cache ne crash pas l'app (fallback formulaire)

### Techniques
- [ ] Le module `src/utils/storage.ts` est indépendant et testable (fonctions pures + try/catch)
- [ ] `localStorage` indisponible → aucune erreur visible, app fonctionne normalement
- [ ] `tsc --noEmit` passe sans erreur

### Sécurité
- [ ] Aucune donnée sensible exposée (déjà le cas — pas de PII dans le modèle)

---

## 8. Notes pour l'Agent de Développement

> **Instructions prioritaires :**
> - Créer `src/utils/storage.ts` en premier — module autonome avec les 4 fonctions (`save`, `load`, `clear`, `isAvailable`)
> - Modifier `App.tsx` : ajouter le `useEffect` de sync, le chargement initial, le handler de purge, et le bouton header
> - Modifier `ProjectInit.tsx` : ajouter la prop `cachedProject` et le bandeau de restauration conditionnel
> - La clé `localStorage` doit être `"stm_project_cache"` — ne pas la changer
> - Toujours wrapper les accès `localStorage` dans un `try/catch` — ne jamais laisser une erreur de stockage remonter à l'utilisateur

> **Fichiers/Modules de référence :**
> - [src/utils/time.ts](../src/utils/time.ts) — pattern à suivre pour le module utilitaire (fonctions pures exportées)
> - [src/App.tsx](../src/App.tsx) — composant racine, point d'intégration du `useEffect` et du state
> - [src/components/ProjectInit.tsx](../src/components/ProjectInit.tsx) — écran d'initialisation à enrichir avec le bandeau de restauration
> - [src/types.ts](../src/types.ts) — interface `ProjectData` utilisée pour la sérialisation/validation

> **Pièges à éviter :**
> - Ne pas déclencher le `useEffect` de sync quand `projectData` est `null` (sinon on purge le cache au retour à l'écran init)
> - Ne pas appeler `saveCachedProject` lors du chargement initial depuis le cache (éviter une écriture redondante — mais ce n'est pas bloquant)
> - Le `useEffect` doit avoir `projectData` comme dépendance (pas un spread de ses champs), pour capturer toutes les mutations
> - Attention au early return `if (!projectData)` dans `App.tsx` — le `useEffect` de sync doit être déclaré AVANT ce return pour respecter les règles des hooks React

> **Questions en suspens :**
> - Aucune
