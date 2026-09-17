# ADR-001 : Système de Layers pour la Timeline

## Statut

**Proposé — non implémenté.**

> Cet ADR provient de la
> [PR #1](https://github.com/ElProton/timeLineManager/pull/1), ouverte le 23/03/2026.
> Le raisonnement reste valable et la décision est retenue sur le principe. En
> revanche, le code de cette PR a été écrit contre une version antérieure de la base
> (état dans `App.tsx` via `useState`, pas de `schemaVersion`, logique de migration
> dupliquée dans `ProjectInit`) et ne peut pas être repris tel quel. L'implémentation
> est à refaire sur l'architecture actuelle, en même temps que le schéma v2 — voir
> [ROADMAP.md](../../ROADMAP.md) §4.
>
> Le format JSON décrit ci-dessous est donc **indicatif** : il devra intégrer
> `schemaVersion` et le vocabulaire générique (`Track` / `Cue`) retenu pour le
> schéma v2.

## Date

2026-03-23

## Contexte

L'application permet actuellement de gérer une timeline unique avec des acteurs et
des actions. Cependant, pour un même spectacle (même musique, même durée), il est
nécessaire de pouvoir représenter plusieurs couches d'information :

- **Couche artistique** : mouvements des danseurs, chorégraphie, jeu scénique
- **Couche technique** : éclairages, sons, effets spéciaux, changements de décor
- **Autres couches** possibles selon les besoins de production

Actuellement, toutes les informations sont mélangées sur une seule vue, ce qui rend
la lecture confuse lorsque le nombre d'acteurs et d'actions augmente.

Hors du contexte spectacle, le même besoin se retrouve sous d'autres noms :
séparer les équipes des prestataires, les pistes son des pistes vidéo, les
intervenants des transitions.

## Décision

### Modèle de données

Introduction d'un concept de **Layer** (couche) dans le modèle de données.

**Avant :**

```json
{
  "metadata": { "title": "...", "musicName": "...", "durationSeconds": 900 },
  "actors": [...],
  "actions": [...]
}
```

**Après :**

```json
{
  "metadata": { "title": "...", "musicName": "...", "durationSeconds": 900 },
  "layers": [
    { "id": "uuid", "name": "Artistique", "actors": [...], "actions": [...] },
    { "id": "uuid", "name": "Technique",  "actors": [...], "actions": [...] }
  ]
}
```

### Règles de conception

1. **Éléments communs** : `metadata` (titre, bande son, durée totale) est partagé
   entre tous les layers.
2. **Éléments propres à chaque layer** : chaque layer possède ses propres pistes et
   ses propres cues.
3. **Nom unique** : chaque layer a un nom unique pour l'identifier facilement.
4. **Layer par défaut** : à la création d'un projet, un layer par défaut est créé
   automatiquement.
5. **Rétrocompatibilité** : l'import d'un fichier au format antérieur est géré par
   la chaîne de migration de `src/utils/migration.ts` — **et non par une logique
   dupliquée dans `ProjectInit`**, contrairement à ce que faisait la PR d'origine.

### Interface utilisateur

1. Un **sélecteur** dans la barre d'outils permet de choisir le layer actif et d'en
   ajouter un.
2. Les opérations existantes s'appliquent au layer actuellement sélectionné.
3. L'export image porte sur le **layer actif** ; l'export JSON porte sur le **projet
   complet**, tous layers confondus.

### Interface TypeScript

```typescript
interface Layer {
  id: string;
  name: string;
  tracks: Track[];
  cues: Cue[];
}

interface ProjectData {
  schemaVersion: number;
  metadata: ProjectMetadata;
  layers: Layer[];
}
```

## Conséquences

### Positives

- **Séparation des préoccupations** : organisation des informations par domaine.
- **Clarté visuelle** : chaque couche n'affiche que ce qui la concerne.
- **Flexibilité** : nombre de layers non borné.
- **Rétrocompatibilité** : les anciens fichiers sont migrés automatiquement.
- **Généricité** : le concept se transpose hors du spectacle sans renommage.

### Négatives

- **Complexité accrue du modèle** : la gestion d'état gagne l'indirection du layer
  actif, y compris dans le reducer et l'historique undo/redo.
- **Risque de confusion** : l'utilisateur doit savoir sur quel layer il travaille.

### Neutres

- Le format JSON évolue mais reste un fichier unique par projet.
- L'export image ne capture que le layer actif (choix délibéré, pour la lisibilité).
