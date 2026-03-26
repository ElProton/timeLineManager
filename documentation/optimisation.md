# Matrice de priorisation — Scenic Timeline Manager

> Analyse réalisée sur la base de code v0.1.0

---

## Légende

| Priorité | Signification | Critères |
|----------|--------------|----------|
| **P1** | Critique | Impact fort sur la maintenabilité ou bloquant pour d'autres évolutions |
| **P2** | Important | Amélioration significative de l'UX ou de la qualité du code |
| **P3** | Souhaitable | Confort utilisateur, ne bloque rien |
| **P4** | Futur | Fonctionnalité avancée, à planifier à moyen terme |

---

## Matrice

| # | Amélioration | Priorité | Effort | Impact | Catégorie |
|---|-------------|----------|--------|--------|-----------|
| 1 | **Refactoring App.tsx → custom hooks** | P1 | Moyen | ★★★★★ | Architecture |
| 2 | **Migration vers `useReducer`** | P1 | Moyen | ★★★★☆ | Architecture |
| 3 | **Système Undo / Redo** | P1 | Élevé | ★★★★★ | Fonctionnel |
| 4 | **Composant Modal générique** | P1 | Faible | ★★★★☆ | Architecture |
| 5 | **Versioning du schéma d'export** | P1 | Faible | ★★★★☆ | Robustesse |
| 6 | **Raccourcis clavier** | P2 | Faible | ★★★☆☆ | UX |
| 7 | **Validation des chevauchements** | P2 | Moyen | ★★★★☆ | Fonctionnel |
| 8 | **Mémoïsation Timeline** (`React.memo`, `useMemo`) | P2 | Faible | ★★★☆☆ | Performance |
| 9 | **Couleurs par acteur** | P2 | Faible | ★★★☆☆ | UX |
| 10 | **Internationalisation (i18n)** | P2 | Moyen | ★★★☆☆ | UX |
| 11 | **Tests unitaires & intégration** | P2 | Élevé | ★★★★★ | Qualité |
| 12 | **Drag & drop sur la timeline** | P3 | Élevé | ★★★★☆ | UX |
| 13 | **Zoom / échelle variable** | P3 | Moyen | ★★★☆☆ | UX |
| 14 | **Responsive / mobile** | P3 | Moyen | ★★★☆☆ | UX |
| 15 | **Accessibilité (ARIA)** | P3 | Moyen | ★★★☆☆ | Qualité |
| 16 | **Support multi-projets** | P4 | Élevé | ★★★★☆ | Fonctionnel |
| 17 | **Synchronisation cloud** | P4 | Très élevé | ★★★★★ | Fonctionnel |

---

## Détails par priorité

### P1 — Critique

#### 1. Refactoring App.tsx → custom hooks
- **Problème** : `App.tsx` (362 lignes) concentre toute la logique métier, les handlers CRUD, la gestion du cache et l'orchestration des modales.
- **Solution** : Extraire la logique dans des hooks dédiés (`useProjectManager`, `useModals`).
- **Bénéfice** : Testabilité, lisibilité, séparation des responsabilités.

#### 2. Migration vers `useReducer`
- **Problème** : 8+ appels `useState` indépendants avec des transitions d'état interconnectées.
- **Solution** : Centraliser l'état dans un `useReducer` avec des actions typées discriminées.
- **Bénéfice** : Transitions atomiques, historique des actions pour undo/redo, état prédictible.

#### 3. Système Undo / Redo
- **Problème** : Aucune possibilité d'annuler une modification (suppression d'acteur, modification d'action, etc.).
- **Solution** : Pattern Command avec pile d'historique ou snapshot-based (plus simple avec `useReducer`).
- **Bénéfice** : Sécurité utilisateur, workflow non destructif.

#### 4. Composant Modal générique
- **Problème** : 3 modales (`ActionModal`, `ActorModal`, `MetadataModal`) avec du code dupliqué (overlay, fermeture, animation).
- **Solution** : Composant `<Modal>` wrapper avec `title`, `onClose`, `children`.
- **Bénéfice** : DRY, cohérence visuelle, maintenance simplifiée.

#### 5. Versioning du schéma d'export
- **Problème** : Si la structure de `ProjectData` évolue, les anciens fichiers JSON deviennent incompatibles.
- **Solution** : Ajouter `schemaVersion` au JSON + migration automatique au chargement.
- **Bénéfice** : Compatibilité ascendante, robustesse à long terme.

---

### P2 — Important

#### 6. Raccourcis clavier
- `Ctrl+S` → export JSON, `Ctrl+Z` → undo, `Suppr` → suppression, `Ctrl+N` → nouvelle action.

#### 7. Validation des chevauchements
- Avertissement visuel quand un acteur a des actions qui se superposent temporellement.

#### 8. Mémoïsation Timeline
- Envelopper `Timeline` et les blocs d'actions dans `React.memo` + `useMemo` pour les calculs de position.

#### 9. Couleurs par acteur
- Attribuer une couleur par défaut à chaque acteur, utilisée quand aucune couleur d'action n'est définie.

#### 10. Internationalisation (i18n)
- Extraire les chaînes de caractères dans des fichiers de traduction (FR/EN minimum).

#### 11. Tests unitaires & intégration
- Vitest + React Testing Library. Priorité : `storage.ts`, `time.ts`, handlers CRUD.

---

### P3 — Souhaitable

#### 12. Drag & drop sur la timeline
- Déplacer et redimensionner les blocs d'action directement sur la timeline.

#### 13. Zoom / échelle variable
- Permettre un zoom avant/arrière sur l'axe temporel.

#### 14. Responsive / mobile
- Adapter le layout pour les écrans < 768px.

#### 15. Accessibilité (ARIA)
- Ajouter les rôles ARIA, la navigation au clavier, et le contraste suffisant.

---

### P4 — Futur

#### 16. Support multi-projets
- Gestion de plusieurs projets dans le cache localStorage avec un sélecteur.

#### 17. Synchronisation cloud
- Backend léger + authentification pour partager/sauvegarder les projets en ligne.

---

## Ordre d'implémentation recommandé

```
1. Refactoring App.tsx → hooks        ← fondation pour tout le reste
2. Composant Modal générique          ← rapide, réduit la dette technique
3. Migration useReducer               ← prépare le terrain pour undo/redo
4. Versioning schéma                  ← protège les données existantes
5. Undo / Redo                        ← feature clé, dépend de useReducer
6. Tests                              ← sécurise les évolutions suivantes
7. Raccourcis clavier                  ← quick win UX
8. Validation chevauchements          ← intégrité des données
```
