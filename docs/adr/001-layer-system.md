# ADR-001 : Système de Layers pour la Timeline

## Statut

Accepté

## Date

2026-03-23

## Contexte

L'application Scenic Timeline Manager permet actuellement de gérer une timeline unique avec des acteurs et des actions. Cependant, pour un même spectacle (même musique, même durée), il est nécessaire de pouvoir représenter plusieurs couches d'information :

- **Couche artistique** : mouvements des danseurs, chorégraphie, jeu scénique
- **Couche technique** : éclairages, sons, effets spéciaux, changements de décor
- **Autres couches** possibles selon les besoins de production

Actuellement, toutes les informations sont mélangées sur une seule vue, ce qui rend la lecture confuse lorsque le nombre d'acteurs et d'actions augmente.

## Décision

### Modèle de données

Nous introduisons un concept de **Layer** (couche) dans le modèle de données. La structure `ProjectData` évolue comme suit :

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
    {
      "id": "uuid",
      "name": "Artistique",
      "actors": [...],
      "actions": [...]
    },
    {
      "id": "uuid",
      "name": "Technique",
      "actors": [...],
      "actions": [...]
    }
  ]
}
```

### Règles de conception

1. **Éléments communs** : `metadata` (titre du projet, nom de la musique, durée totale) est partagé entre tous les layers.
2. **Éléments propres à chaque layer** : chaque layer possède ses propres `actors` et `actions`.
3. **Nom unique** : chaque layer a un nom unique pour l'identifier facilement.
4. **Layer par défaut** : à la création d'un nouveau projet, un layer par défaut nommé "Principal" est créé automatiquement.
5. **Rétrocompatibilité** : l'import de fichiers JSON au format ancien (sans layers) est géré par migration automatique vers le nouveau format, en encapsulant `actors` et `actions` dans un layer nommé "Principal".

### Interface utilisateur

1. Un **sélecteur déroulant** est ajouté dans la barre d'outils permettant de :
   - Voir et choisir le layer actif parmi les layers existants
   - Ajouter un nouveau layer (avec saisie du nom)
2. Les opérations existantes (ajout/édition/suppression d'acteurs et d'actions) s'appliquent au **layer actuellement sélectionné**.
3. L'export JSON et l'export image s'appliquent au **layer actif** pour l'image, et au **projet complet** (tous les layers) pour le JSON.

### Interface TypeScript

```typescript
interface Layer {
  id: string;
  name: string;
  actors: Actor[];
  actions: Action[];
}

interface ProjectData {
  metadata: ProjectMetadata;
  layers: Layer[];
}
```

## Conséquences

### Positives

- **Séparation des préoccupations** : les utilisateurs peuvent organiser les informations par domaine (artistique, technique, etc.)
- **Clarté visuelle** : chaque couche affiche uniquement les acteurs et actions pertinents
- **Flexibilité** : nombre illimité de layers selon les besoins
- **Rétrocompatibilité** : les anciens fichiers JSON sont automatiquement migrés
- **Même UX** : le fonctionnement de l'application reste identique, seul le contexte (layer) change

### Négatives

- **Complexité accrue du modèle** : la gestion d'état devient légèrement plus complexe avec l'indirection du layer actif
- **Risque de confusion** : l'utilisateur doit être conscient du layer sur lequel il travaille pour éviter de créer des acteurs/actions dans le mauvais layer

### Neutres

- Le format de fichier JSON évolue, mais reste un fichier unique par projet
- L'export image ne capture que le layer actif (choix délibéré pour la lisibilité)
