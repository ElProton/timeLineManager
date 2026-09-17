# Plan de passage à l'open-source — Timeline Manager

> **Rôle de ce fichier.** Document de travail interne, destiné à porter le contexte
> d'une session de travail à l'autre. Il n'est pas la documentation utilisateur ni
> le backlog public (voir `ROADMAP.md` une fois le lot 1 livré).
> Toute session qui reprend le projet doit lire ce fichier en premier et mettre à
> jour la colonne **Statut** des lots.

- **Dernière mise à jour :** 2026-09-17 (lot 4)
- **Dépôt :** https://github.com/ElProton/timeLineManager
- **Branche de travail courante :** `claude/serene-galileo-x8rf85`

---

## 1. Décisions actées

Ces arbitrages sont validés par le propriétaire du projet. Ne pas les rouvrir sans
demande explicite de sa part.

| #   | Sujet                  | Décision                                                               | Conséquence                                                                                                                                                                    |
| --- | ---------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| D1  | Licence                | **MIT**                                                                | Adoption et réutilisation maximales, zéro friction. Cohérent avec l'ensemble des dépendances (MIT/ISC).                                                                        |
| D2  | Vocabulaire du modèle  | **`Actor` → `Track`, `Action` → `Cue`**, `musicName` devient optionnel | Schéma **v2** + migration automatique v1 → v2. Les fichiers JSON existants continuent de s'ouvrir.                                                                             |
| D3  | Gouvernance            | **Faible entretien assumé**                                            | `MAINTENANCE.md` annonce le niveau de service. Automatisation maximale (CI, Dependabot, stale bot). Règle écrite d'accès au statut de co-mainteneur.                           |
| D4  | Ordre d'exécution      | Plan en fichier, puis **lot 0 + lot 1**                                | Les lots 2 à 4 ont suivi. Tous livrés.                                                                                                                                         |
| D7  | Persistance de l'audio | **Ré-attaché à chaque session**                                        | Le fichier n'entre ni dans `localStorage` (~5 Mo contre 3–50 Mo) ni dans le JSON exporté. `metadata.soundtrack` porte le nom ; l'app le redemande. IndexedDB reste au ROADMAP. |
| D8  | Périmètre du lot 4     | **Cœur audio + forme d'onde**                                          | Attacher, lire, tête de lecture, clic pour se positionner, durée déduite, forme d'onde. BPM et marqueurs de section restent au ROADMAP, gradués.                               |

### Contrainte structurante

Le propriétaire **n'a plus de temps à consacrer au projet**, ni pour la remise à
niveau ni pour la suite. Tout arbitrage se tranche en faveur de la solution qui
**réduit la sollicitation future**, même si elle coûte plus cher à mettre en place
maintenant. Concrètement : préférer une règle automatisée à une règle écrite, et une
règle écrite à une décision au cas par cas.

---

## 2. État des lieux (vérifié le 2026-09-17)

### 2.1 Ce qui va bien

Le projet est en bien meilleur état que son README ne le laisse croire.

- **Architecture saine** : `useReducer` + hooks dédiés (`useProjectManager`,
  `useModals`, `useExport`), composant `Modal` générique, séparation
  composants / hooks / utils nette.
- **120 tests passent** sur 8 fichiers (`npm test`), couvrant les utils, le reducer
  et les hooks.
- **`npm run build` passe** (270 kB / 84 kB gzip).
- **Undo/redo fonctionnel**, historique borné à 50 snapshots.
- **Persistance localStorage** avec validation structurelle et purge des entrées
  corrompues.
- **Versionnement du schéma** (`schemaVersion`) et chaîne de migration déjà en place —
  le socle exact dont la décision D2 a besoin.

Les points P1 du backlog `docs/optimisation.md` (supprimé au lot 3) (refactoring hooks,
`useReducer`, undo/redo, modale générique, versionnement du schéma) ainsi que le
point P2 « tests » ont donc **déjà été livrés**. Ce backlog est à jour côté
priorités mais périmé côté statut.

### 2.2 Le dépôt est déjà public

`visibility: public` côté API GitHub, **sans fichier `LICENSE`**. En droit d'auteur,
un dépôt public sans licence reste « tous droits réservés » : personne ne peut
légalement le forker, le réutiliser ni contribuer. C'est le point bloquant n°1 et il
est déjà actif aujourd'hui — pas au moment d'un futur basculement en public.

### 2.3 Résidus Google AI Studio

Le projet a été généré depuis Google AI Studio et n'a jamais été décontaminé.

| Fichier             | Problème                                                                                                                                                                        |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `README.md`         | Boilerplate « Run and deploy your AI Studio app », bannière pointant vers un asset GitHub tiers, lien vers une app AI Studio privée, instruction de renseigner `GEMINI_API_KEY` |
| `.env.example`      | Documente `GEMINI_API_KEY` et `APP_URL`, **aucun des deux n'est lu par le code** (vérifié : zéro occurrence de `process.env` dans `src/` et `vite.config.ts`)                   |
| `metadata.json`     | Artefact de manifeste AI Studio, inutilisé par Vite                                                                                                                             |
| `index.html`        | `<title>My Google AI Studio App</title>`, `lang="en"`, ni favicon ni meta description                                                                                           |
| `docs/dev_setup.md` | Documente `GEMINI_API_KEY` et `DISABLE_HMR` comme variables d'environnement actives — les deux sont inexistantes                                                                |

Un visiteur arrivant sur le dépôt lit donc, en premier écran, qu'il lui faut une clé
d'API Gemini pour faire tourner une application qui n'appelle aucune API.

### 2.4 Défauts de typage et d'outillage

- **`@types/react` et `@types/react-dom` sont absents des `devDependencies`.**
  Conséquence directe : `npm run lint` (`tsc --noEmit`) **passe en donnant une
  fausse assurance**. Comme `strict` est désactivé, chaque élément JSX et chaque
  import React est typé implicitement `any`. Vérifié : `tsc --noEmit --strict`
  produit des centaines de `TS7026: JSX element implicitly has type 'any'`.
  Le type-checking du code composant est aujourd'hui **nul**.
- Symptôme concret laissé passer : `Timeline.tsx:163` pose `ringColor` dans un objet
  `style` inline. Ce n'est pas une propriété CSS du DOM ; React l'ignore. Les classes
  `ring-2 ring-offset-1` s'affichent donc avec la couleur d'anneau par défaut au lieu
  de la couleur de l'action. Un `@types/react` correct aurait rejeté cette ligne.
- `tsconfig.json` : pas de `strict`, pas de `include`, `allowJs: true` et
  `experimentalDecorators: true` hérités du scaffold et inutilisés.
- **Ni Prettier, ni ESLint, ni `.editorconfig`.** Sur un projet ouvert aux
  contributions, c'est la garantie que chaque PR arrive avec un style différent et
  que l'arbitrage retombe sur le mainteneur — exactement ce qu'on cherche à éviter.
- **29 fichiers versionnés commencent par un BOM UTF-8** (`EF BB BF`), dont
  `vite.config.ts`, 8 fichiers de `src/` et toute la documentation. Bruit de diff
  garanti dès qu'un contributeur édite depuis un éditeur normalisé.
- `@testing-library/jest-dom` est installé mais **jamais importé** : aucun
  `setupFiles` dans `vite.config.ts`. Dépendance morte.
- **Aucune CI.** `.github/` ne contient que `agents/`, pas de `workflows/`. Une PR
  externe ne peut pas se valider elle-même.

### 2.5 Bugs et fragilités identifiés (vérifiés par exécution)

| #   | Localisation                                             | Défaut                                                                                                                        | Effet                                                                                                               |
| --- | -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| B1  | `utils/time.ts:17`                                       | `isValidTimeFormat` = `/^\d{2,}:\d{2}$/` : aucune borne sur les secondes                                                      | `"00:99"` est accepté et vaut 99 s, réaffiché `01:39`. `"03:60"` devient `04:00`. Saisie silencieusement corrompue. |
| B2  | `components/Timeline.tsx:40`                             | Boucle de marqueurs non bornée sur `durationSeconds`                                                                          | Une faute de frappe `9999:00` (599 940 s) génère 10 000 marqueurs, × 2 par ligne de piste. Gel de l'onglet.         |
| B3  | `components/ProjectInit.tsx:58`                          | Validation d'import faible : teste seulement `metadata.title` et la véracité de `metadata.durationSeconds`                    | `durationSeconds: -5` est truthy donc accepté → division par un négatif → rendu cassé.                              |
| B4  | `ProjectInit` vs `storage.ts`                            | **Deux chemins de validation divergents** : `isValidProjectData` (robuste) n'est appliqué qu'au cache, pas à l'import fichier | Le chemin le plus exposé (fichier fourni par un tiers) est le moins protégé.                                        |
| B5  | `utils/migration.ts:19`                                  | `migrateProject` **mute l'objet reçu** (`record.schemaVersion = 1`) au lieu de le copier                                      | Effet de bord sur l'entrée ; piège pour toute évolution de la chaîne de migration.                                  |
| B6  | `utils/storage.ts:10`                                    | `isCacheAvailable()` est exporté et testé mais **jamais appelé** par l'application                                            | La règle ALT-03 de la spec (avertir quand `localStorage` est indisponible) n'est pas implémentée. Code mort.        |
| B7  | `hooks/useExport.ts:15,39`                               | Nom de fichier construit par `title.replace(/\s+/g,"_")` sans assainir `/ \ : * ?`                                            | Un titre « Gala 1/2 » produit un nom de fichier invalide ou tronqué selon l'OS.                                     |
| B8  | `components/Modal.tsx`                                   | Ni `Escape`, ni piège de focus, ni fermeture au clic sur l'arrière-plan, ni `role="dialog"` / `aria-modal`                    | Modale inutilisable au clavier et pour un lecteur d'écran.                                                          |
| B9  | `hooks/useProjectManager.ts`, `ProjectInit`, `useExport` | 5 `confirm()` / `alert()` natifs                                                                                              | Non stylables, non traduisibles, bloqués dans certains contextes embarqués, difficiles à tester.                    |
| B10 | `components/MetadataModal.tsx`                           | Messages d'erreur et d'avertissement **en français** dans une interface sinon entièrement anglaise                            | Incohérence visible en production.                                                                                  |
| B11 | `docs/specs/cache_local_autosave.md` §2.1                | La protection `beforeunload` est spécifiée mais **absente du code**                                                           | Écart spec / implémentation non tracé.                                                                              |
| B12 | —                                                        | Aucun _error boundary_ React                                                                                                  | Une exception de rendu vide la page sans message.                                                                   |

### 2.6 Documentation périmée

`docs/` décrivait une version du code qui n'existe plus. Un contributeur qui la
lit part sur de fausses bases :

- `architecture.md` décrit la gestion d'état par `useState` dans `App.tsx` et affirme
  « **Pas de persistance** : aucune sauvegarde automatique » — alors que
  `storage.ts` + `useProjectManager` font exactement l'inverse depuis.
- `architecture.md` liste `motion`, `@google/genai`, `better-sqlite3`, `express`,
  `dotenv` comme dépendances : aucune n'est dans `package.json` aujourd'hui.
- `components.md` ignore `Modal`, `MetadataModal` et les trois hooks.
- `data_model.md` ne mentionne pas `schemaVersion`.
- `dev_setup.md` documente des variables d'environnement inexistantes et une
  arborescence obsolète.
- `optimisation.md` liste comme « à faire » six chantiers déjà livrés.

### 2.7 PR #1 ouverte, périmée

[PR #1 « feat: Layer system for timeline with ADR »](https://github.com/ElProton/timeLineManager/pull/1)
(23/03/2026) introduit un système de calques (`Layer` regroupant ses propres
`actors`/`actions`) avec un ADR de qualité.

**L'idée est bonne et générique** : séparer couche artistique / couche technique est
exactement ce dont un utilisateur hors spectacle a besoin (pistes son / lumière /
vidéo, ou prestataires / équipes).

**Mais le code est écrit contre l'ancienne base** : `useState` dans `App.tsx`,
aucune prise en compte de `schemaVersion`, logique de migration dupliquée dans
`ProjectInit` au lieu de `migration.ts`. Il entrera en conflit frontal avec `main`.

→ **Décision à prendre en lot 2** : fermer la PR en conservant l'ADR (rebasé dans
`docs/adr/`), et réimplémenter les calques sur l'architecture actuelle en même temps
que le schéma v2. Ne pas tenter de rebaser la PR telle quelle.

---

## 3. Analyse produit : ce qui bloque l'usage hors du contexte spectacle

### 3.1 Ce qui est trop spécifique au métier

| Élément                         | Où                                             | Pourquoi ça bloque                                                                                                                                                                                                        |
| ------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`Actor` / « acteur »**        | Modèle de données, toute l'UI                  | Vocabulaire théâtral. Un régisseur lumière, un organisateur de mariage, un chorégraphe de drones ou un monteur vidéo ne pilotent pas des « acteurs ». Le terme est de surcroît ambigu en informatique (modèle d'acteurs). |
| **`Action`**                    | Modèle, UI                                     | Trop vague. Le terme métier universel du spectacle, du broadcast et de l'événementiel est **cue** (« top »).                                                                                                              |
| **« Scenic » Timeline Manager** | `package.json`, `metadata.json`, `ProjectInit` | Enferme le produit dans le spectacle vivant dès le titre.                                                                                                                                                                 |
| **`musicName` obligatoire**     | `ProjectMetadata`, validation                  | Le calage peut se faire sur une voix off, un time-code vidéo, un brief minuté. Doit rester proposé par défaut mais devenir facultatif.                                                                                    |
| **Placeholders**                | `ProjectInit`, `ActionModal`, `ActorModal`     | « Final Tableau », « Boléro », « Enter Stage Left », « Pierre ». Un visiteur en déduit immédiatement que l'outil n'est pas pour lui.                                                                                      |
| **`.github/agents/`**           | 8 fichiers                                     | Configuration d'agents VS Code personnelle, en français, dont deux se présentent comme « Expert **Python** » sur un projet TypeScript. Artefact de workflow privé exposé publiquement.                                    |

### 3.2 Ce qui manque pour que l'outil serve à quelqu'un d'autre

Classé par rapport valeur / effort.

**Le manque le plus important d'abord.** Le positionnement annoncé est « timeline
synchronisée sur un timing musical ». Or l'application **ne connaît rien à la
musique** : elle affiche une grille `mm:ss` et rien d'autre. Pas de fichier audio,
pas de lecture, pas de forme d'onde, pas de BPM, pas de grille de mesures. En l'état
c'est un diagramme de Gantt à l'échelle des minutes. **C'est là que se joue la
différence entre « un Gantt de plus » et « l'outil qu'on cherchait ».**

| Manque                                                           | Valeur | Effort     | Commentaire                                                                                                                         |
| ---------------------------------------------------------------- | ------ | ---------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| **Charger un audio + lecture + tête de lecture + forme d'onde**  | ★★★★★  | Élevé      | 100 % local via Web Audio API, aucun serveur. C'est la fonction signature.                                                          |
| **BPM / grille de mesures / aimantation sur les temps**          | ★★★★★  | Moyen      | Donne son sens au mot « musical ». Se pose sur la couche audio.                                                                     |
| **Glisser-déposer et redimensionnement des blocs**               | ★★★★★  | Élevé      | Aujourd'hui chaque ajustement impose d'ouvrir une modale et de retaper `mm:ss`. Premier frein à l'usage réel.                       |
| **Zoom sur l'axe temporel**                                      | ★★★★☆  | Moyen      | Indispensable dès qu'on cale à la seconde sur un morceau de 15 min.                                                                 |
| **Multi-projets**                                                | ★★★★☆  | Moyen      | Un seul créneau `localStorage` aujourd'hui. Bloque tout usage répété.                                                               |
| **Calques / groupes de pistes** (cf. PR #1)                      | ★★★★☆  | Moyen      | Sépare artistique / technique, ou équipes / prestataires.                                                                           |
| **Export PDF / impression**                                      | ★★★★☆  | Faible     | Une timeline sert d'abord de feuille de route papier en régie. Le JPEG actuel s'imprime mal.                                        |
| **Marqueurs de sections sur l'axe** (intro, refrain, top départ) | ★★★★☆  | Faible     | Très demandé dès qu'on cale sur une structure musicale.                                                                             |
| **Internationalisation (FR / EN)**                               | ★★★☆☆  | Moyen      | Corrige au passage B10. Ouvre le produit hors francophonie.                                                                         |
| **Accessibilité clavier et ARIA**                                | ★★★☆☆  | Moyen      | Cf. B8. Conditionne aussi l'usage en régie, souvent au clavier.                                                                     |
| **Responsive / tablette**                                        | ★★★☆☆  | Moyen      | Une timeline se consulte sur place, sur tablette.                                                                                   |
| **Couleur par piste, palette personnalisable**                   | ★★★☆☆  | Faible     | 10 couleurs codées en dur dans `ActionModal`.                                                                                       |
| **Détection des chevauchements**                                 | ★★★☆☆  | Moyen      | Alerte quand une même piste a deux cues simultanés.                                                                                 |
| **Export CSV**                                                   | ★★☆☆☆  | Faible     | Reprise dans un tableur, conduite manuelle.                                                                                         |
| **Mode sombre**                                                  | ★★☆☆☆  | Faible     | Confort en régie, lumière basse.                                                                                                    |
| **Partage par URL / synchronisation**                            | ★★★★☆  | Très élevé | Nécessite un serveur : sort du modèle « 100 % navigateur, zéro coût d'exploitation ». À laisser au backlog public sans s'y engager. |

### 3.3 Positionnement cible proposé

> **Timeline Manager** — Construire, caler et partager une timeline de production
> synchronisée sur une bande son. Tout se passe dans le navigateur : aucun compte,
> aucun serveur, vos fichiers restent chez vous.

Publics visés au-delà du spectacle vivant : régie son / lumière / vidéo, spectacles
de drones et pyrotechnie, chorégraphie et danse, événementiel et mariages, podcast et
montage, conduites de conférence, spectacles équestres et sportifs.

L'absence de serveur n'est pas un manque, c'est **l'argument** : rien à héberger,
rien à administrer, rien à facturer. C'est aussi ce qui rend le projet tenable sans
mainteneur à temps plein.

---

## 4. Lots de travail

| Lot | Objet                                               | Statut         |
| --- | --------------------------------------------------- | -------------- |
| 0   | Décontamination et outillage                        | **Livré**      |
| 1   | Ouverture open-source du dépôt                      | **Livré**      |
| 2   | Dé-spécialisation : schéma v2 + correction des bugs | **Livré**      |
| 3   | Réécriture documentaire depuis le code réel         | **Livré**      |
| 4   | Fonctionnalités d'adoption                          | Backlog public |

### Lot 0 — Décontamination et outillage

Aucun changement fonctionnel. Objectif : qu'un contributeur inconnu puisse cloner,
installer et valider son travail sans poser de question.

1. Supprimer `.env.example` et `metadata.json` (résidus AI Studio, non lus).
2. Réécrire `README.md` : ce que fait l'outil, pour qui, capture, installation, scripts.
3. `index.html` : titre réel, `lang`, meta description, favicon.
4. Retirer le BOM UTF-8 des 29 fichiers versionnés concernés.
5. Ajouter `@types/react` et `@types/react-dom`.
6. `tsconfig.json` : activer `strict`, ajouter `include`, retirer `allowJs` et
   `experimentalDecorators`. **Corriger les erreurs de type révélées** — c'est le
   vrai contenu du lot, `ringColor` n'étant que le premier symptôme.
7. Prettier + ESLint (`typescript-eslint`, `eslint-plugin-react-hooks`) +
   `.editorconfig` + `.gitattributes`. Scripts `format`, `format:check`, `lint`,
   `typecheck`.
8. Brancher `@testing-library/jest-dom` via `setupFiles`, ou le retirer.
9. Compléter `package.json` : `description`, `license`, `repository`, `bugs`,
   `homepage`, `engines`.
10. `git mv documentation docs` et réparer les liens internes (le contenu est
    réécrit en lot 3 ; ici on ne fait que déplacer).

**Critère de sortie :** `npm run typecheck && npm run lint && npm run format:check && npm test && npm run build` passe à neuf sur un clone vierge.

### Lot 1 — Ouverture open-source du dépôt

1. `LICENSE` MIT au nom de Ryan Lefebvre.
2. CI GitHub Actions sur `push` et `pull_request` : typecheck, lint, format, tests, build.
3. Workflow de déploiement de la démo sur GitHub Pages + `base` dans `vite.config.ts`.
   **Une démo en ligne est le premier levier d'adoption d'un outil navigateur**, et
   elle ne coûte rien à exploiter.
4. `CONTRIBUTING.md` : prérequis, commandes, conventions de commit, attentes de PR,
   ce qui sera accepté et ce qui ne le sera pas.
5. `CODE_OF_CONDUCT.md` (Contributor Covenant 2.1).
6. `SECURITY.md` : application 100 % cliente, pas de serveur, pas de données
   collectées, canal de signalement.
7. `MAINTENANCE.md` : niveau de service annoncé, règle d'accès au statut de
   co-mainteneur, critères de fusion. **C'est le document qui protège le temps du
   propriétaire** ; il doit être lié depuis le README.
8. `ROADMAP.md` : le backlog public dérivé de la section 3.2, avec un marqueur clair
   « aidez-vous servir » sur les sujets accessibles à un nouveau venu.
9. Templates d'issues (bogue, fonctionnalité, question) et de PR, qui obligent le
   demandeur à qualifier lui-même sa demande.
10. `dependabot.yml` groupé mensuel, fusion automatique des mises à jour mineures si
    la CI est verte.
11. Statuer sur `.github/agents/` : déplacer vers `docs/contrib/ai-agents/` avec un
    README d'usage, et neutraliser les mentions « Expert Python ».

**Critère de sortie :** un contributeur inconnu ouvre une PR, la CI la valide seule, et il sait sans demander sous quel délai elle sera regardée.

### Lot 2 — Dé-spécialisation (livré)

1. Schéma **v2** : `Actor` → `Track`, `Action` → `Cue`, `musicName` optionnel,
   renommé en `soundtrack`. Migration v1 → v2 dans `migration.ts`, couverte par des
   tests sur des fichiers d'exemple v1 réels.
2. Placeholders et libellés neutralisés.
3. Correction de B1 à B12.
4. Unification des deux chemins de validation (B3/B4) : `isValidProjectData` devient
   le point de passage unique, import fichier compris.
5. Modale accessible : `Escape`, piège de focus, `role="dialog"`, clic sur l'arrière-plan.
6. Remplacement des `confirm()` / `alert()` par des modales internes.
7. Fermeture de la PR #1 et réimplémentation des calques sur l'architecture actuelle.
8. Jeux de données d'exemple dans `examples/`, non théâtraux.

### Lot 3 — Documentation (livré)

Réécriture de `docs/` depuis le code réel, avec une règle de tenue : la documentation
d'architecture est vérifiée à chaque PR qui touche `src/hooks/` ou `src/types.ts`
(point ajouté à la checklist du template de PR).

### Lot 4 — Rendre la timeline réellement musicale (livré)

Le README promettait « une timeline synchronisée sur une bande son » et l'application
ne savait rien du son : une grille `mm:ss`, et rien d'autre. Placer un top sur un
refrain supposait de connaître le morceau par cœur — ce que le propriétaire sait
faire, et personne d'autre.

1. `timeToPercent` / `percentToTime` dans `utils/timeline.ts` : la conversion était
   recopiée à quatre endroits et l'inverse, qu'exige le clic pour se positionner,
   n'existait pas.
2. `LaneOverlay` : un seul repère de coordonnées. La bande de survol multi-pistes se
   positionnait contre la pleine largeur alors que les cues qu'elle encadre vivent
   dans une piste décalée de 192 px — mesurée au navigateur, elle était **144 px trop
   à gauche et 48 px trop large** depuis toujours, cachée par `opacity-30`.
3. `utils/waveform.ts` : `computePeaks`, trente lignes d'arithmétique pure. Aucune
   dépendance ajoutée — une bibliothèque de forme d'onde aurait été la septième et
   aurait doublé le bundle.
4. `useAudio` : `<audio>` pour la lecture, `OfflineAudioContext` pour le seul
   décodage des échantillons. L'audio **n'entre jamais dans `ProjectData`**.
5. `AudioBar` et `Waveform` : transport, raccourcis clavier (espace, flèches), forme
   d'onde sur canvas, adoption de la durée réelle via le chemin de troncature
   existant, donc annulable.

**Hors lot, découvert en vérifiant :** l'application faisait un appel réseau —
`index.css` chargeait Inter depuis Google Fonts à chaque ouverture, ce qui livrait
l'adresse IP de chaque lecteur. C'est précisément la règle que `CONTRIBUTING.md`
déclare non négociable. Corrigé : pile de polices système, zéro requête sortante,
vérifié au navigateur sur une session complète.

### Lot 5 — Éditer la timeline sans passer par une modale (livré)

Le ROADMAP disait lui-même que retaper `mm:ss` dans une modale était « la première
chose qui rend l'usage réel pénible ». Le lot 4 l'avait aggravé : on entend où placer
le top, et il faut quand même taper le chiffre.

1. `utils/dragCue.ts` : tout le calcul du glissement, pur et testé. Arrondi à la
   seconde — **contrainte, pas préférence** : `isValidTimeFormat` n'accepte que
   `mm:ss` et `formatTime` tronque, donc un cue laissé à 12,37 s se rouvrirait à
   `00:12` et se déplacerait à l'enregistrement.
2. `markerStep(durée, largeur?)` : l'axe tient compte de la place qu'une étiquette
   occupe. Corrige le chevauchement à 40 s (41 étiquettes à 26 px) **et** rend le
   zoom utile — 4× gagne des étiquettes au lieu de les espacer.
3. `useCueDrag` : **un geste = une entrée d'annulation.** `MAX_HISTORY = 50` et le
   reducer photographie à chaque `SAVE_CUE` : dispatcher à chaque `pointermove`
   aurait effacé tout l'historique en un glissement. Vérifié au navigateur en
   comptant les `Undo`, pas en le supposant.
4. Clavier : flèches pour déplacer, `Shift` pour le bord de fin, `Alt` pour le début.
   Conflit avec le transport du lot 4 résolu par `preventDefault` /
   `defaultPrevented`.
5. Zoom : une seule largeur sur le nœud de contenu, libellés de piste collants,
   contrôle placé dans `App` pour rester hors du JPEG exporté.

**Deux corrections que seul le navigateur a trouvées :** les poignées de
redimensionnement déclenchaient aussi le glissement du bloc derrière elles
(`stopPropagation` manquant) ; et l'aimantation aux marqueurs de l'axe rendait un
tiers de la timeline inatteignable — elle ne vise plus que la tête de lecture et les
bords des autres cues.

### Lot 6 — Mettre `Timeline` et `AudioBar` sous test (livré)

`Timeline.tsx` fait 480 lignes et porte trois lots — positionnement, bande de survol,
forme d'onde, tête de lecture, clic pour se positionner, glissement, redimensionnement,
clavier, zoom. Rien ne le testait. Pour un projet censé survivre à son auteur, c'est
le fichier qu'un inconnu n'ose pas toucher.

48 tests ajoutés (255 → 303). Le plus utile porte sur le glissement : un geste émet
**exactement un** `onMoveCue`, à la fin, jamais pendant ; la poignée droite ne change
que `timeEnd` ; un appui qui ne va nulle part reste un clic. Et le contrat des flèches
introduit au lot 5 est épinglé **des deux côtés** — il traverse deux composants, donc
rien de local ne l'aurait attrapé en se cassant.

`src/__tests__/browserStubs.ts` porte ce que jsdom n'implémente pas — une largeur pour
des éléments qu'il déclare à zéro, un `ResizeObserver`, un `getContext` silencieux.
**Importés et appelés par le test qui en a besoin, jamais posés dans `setup.ts`** : un
global y cacherait l'API manquante à tous les autres tests, et ce qui manque à jsdom
est justement ce qu'il faut savoir — cela a décidé l'architecture de ce projet trois
fois.

**Cinq mutations passées avant de retenir les tests** : retirer `stopPropagation`,
retirer `preventDefault`, dispatcher à chaque `pointermove`, retirer la garde
`defaultPrevented`, retirer la garde de saisie. Chacune fait tomber le test prévu,
nommément. Un test qui ne tombe pas quand le code casse ne teste rien.

La ligne de partage est consignée dans `dev_setup.md` : les tests épinglent le
comportement et les contrats, le navigateur épingle la géométrie. Les deux bogues du
lot 5 étaient un de chaque.

Aucun code de production modifié ; les vérifications navigateur du lot 5 repassent à
l'identique.

### Suite — backlog public

Section 3.2, priorisée dans `ROADMAP.md`. Aucun engagement de délai. Les sujets sont
découpés pour être pris par un contributeur extérieur sans arbitrage du propriétaire.
Le BPM (🔵) et les marqueurs de section (🟢) sont les deux suites directes du lot 4,
avec leurs pièges consignés dans le ROADMAP.

---

## 5. Journal des sessions

| Date       | Session          | Livré                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ---------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 2026-09-17 | Analyse initiale | État des lieux vérifié (tests, build, typage, bugs), décisions D1-D4 actées, ce plan.                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| 2026-09-17 | Lot 0            | Décontamination AI Studio, BOM purgés, `@types/react` + `strict` (38 erreurs corrigées, dont `ringColor`), ESLint + Prettier + EditorConfig, `npm run verify`.                                                                                                                                                                                                                                                                                                                                                                                         |
| 2026-09-17 | Lot 1            | LICENSE MIT, CI (Node 20/22), déploiement GitHub Pages, CONTRIBUTING / CODE_OF_CONDUCT / SECURITY / MAINTENANCE / ROADMAP, templates issues et PR, Dependabot, ADR-001 récupéré de la PR #1, agents déplacés vers `docs/contrib/ai-agents/`.                                                                                                                                                                                                                                                                                                           |
| 2026-09-17 | Lot 2            | Schéma v2 (`Track`/`Cue`, `soundtrack` optionnel) et migration v0→v1→v2 non mutante. `isValidProjectData` devient le point de passage unique, import fichier compris. Modale accessible écrite à la main (jsdom n'implémente ni `showModal()` ni `close()`), `confirm()`/`alert()` natifs remplacés. Bugs B1–B12 corrigés.                                                                                                                                                                                                                             |
| 2026-09-17 | Lot 3            | Documentation remise en phase avec le code. `architecture.md` et `components.md` réécrits depuis les sources ; `utilities.md` réparé — deux modifications du lot 2 n'y étaient jamais arrivées (un `str.replace` non asserté) et le fichier se contredisait ; `dev_setup.md` corrigé (arborescence) ; `ROADMAP.md` corrigé (accessibilité et i18n périmées) et complété (performance de rendu). **Toute la doc passe en anglais.** `optimisation.md` supprimé au profit du ROADMAP. Vérificateur de liens `scripts/check-links.mjs` branché sur la CI. |
| 2026-09-17 | Lot 4            | L'audio. `timeToPercent`/`percentToTime` et `LaneOverlay` (la bande de survol était 144 px hors de son repère depuis toujours), `computePeaks` sans dépendance, `useAudio`, `AudioBar`, `Waveform`, tête de lecture hors rendu React, clic pour se positionner, adoption de la durée via le chemin de troncature existant. **Et un appel réseau supprimé** : `index.css` chargeait Inter depuis Google Fonts. Bundle 86,8 → 89,9 ko gzip.                                                                                                              |
| 2026-09-17 | Lot 5            | L'édition directe. `dragCue` (calcul pur, arrondi à la seconde imposé par `mm:ss`), `markerStep` tenant compte de la largeur — l'axe empilait 41 étiquettes sur 26 px à 40 s —, `useCueDrag` (**un geste = une entrée d'annulation**, mesuré au navigateur), clavier avec résolution du conflit de flèches hérité du lot 4, zoom et libellés collants. Deux bogues trouvés au navigateur seulement : poignées sans `stopPropagation`, et aimantation aux marqueurs rendant un tiers de la timeline inatteignable.                                      |
| 2026-09-17 | Lot 6            | `Timeline` et `AudioBar` sous test — 255 → 303. Le glissement épinglé (un geste = un `onMoveCue`, la poignée droite ne bouge que la fin), le contrat des flèches épinglé des deux côtés. `browserStubs.ts` pour ce que jsdom n'a pas, importé par les tests et jamais dans `setup.ts`. **Cinq mutations** passées avant de retenir quoi que ce soit. Aucun code de production modifié.                                                                                                                                                                 |

## 6. À faire à la main, hors dépôt

Ces actions ne peuvent pas être réalisées depuis le code. **Elles sont toutes
faites** — conservées ici pour qui reprendrait le dépôt ou en monterait un semblable.

| Action                                                                 | Où                            | Pourquoi                                                                                                   |
| ---------------------------------------------------------------------- | ----------------------------- | ---------------------------------------------------------------------------------------------------------- |
| **Activer GitHub Pages**, source « GitHub Actions »                    | Settings → Pages              | Sans cela le workflow `deploy.yml` échoue et la démo annoncée dans le README renvoie une 404.              |
| **Activer Discussions**                                                | Settings → General → Features | Le `config.yml` des templates d'issues y redirige les questions d'usage, ce qui les sort du flux d'issues. |
| **Activer le signalement privé de vulnérabilités**                     | Settings → Security           | `SECURITY.md` pointe vers ce formulaire.                                                                   |
| **Créer les labels** `good first issue`, `help wanted`, `needs triage` | Issues → Labels               | Référencés par le ROADMAP, CONTRIBUTING et les templates.                                                  |
| **Mettre à jour la description et les sujets du dépôt**                | Page d'accueil du dépôt       | La description est encore « manage timeline to schedule show ».                                            |
| **Fermer la PR #1** en renvoyant vers `docs/adr/001-layer-system.md`   | PR #1                         | L'ADR est conservé ; le code est périmé. Fermée le 2026-09-17.                                             |
| _(optionnel)_ Protéger `main` : CI verte obligatoire                   | Settings → Branches           | Évite qu'une fusion casse `main` sans que personne ne s'en aperçoive.                                      |
