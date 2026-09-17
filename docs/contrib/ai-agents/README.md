# Agents IA (optionnel)

Ce dossier contient des **définitions d'agents personnalisés pour VS Code**, écrites
pour ce projet. Ils décrivent des rôles — planification, spécification, scénarios
Gherkin, tests, développement, revue, documentation — avec leurs prompts système et
leurs enchaînements.

## Vous n'avez pas besoin de ça

Ces fichiers sont **entièrement facultatifs**. Ils ne font partie ni du build, ni des
tests, ni de la CI. Vous pouvez contribuer à ce projet sans jamais les ouvrir.

Ils sont versionnés pour deux raisons : ils documentent les conventions attendues
(Clean Code, tests avant implémentation, documentation tenue à jour depuis le code),
et ils évitent de repartir de zéro à ceux qui travaillent déjà avec des assistants de
code.

## Utilisation

Ces définitions ciblent le format d'agents personnalisés de VS Code. Pour les
utiliser, copiez les fichiers `.agent.md` à l'emplacement attendu par votre éditeur —
il change selon la version, référez-vous à sa documentation.

| Agent           | Rôle                                                      |
| --------------- | --------------------------------------------------------- |
| `specificateur` | Co-construit une spécification fonctionnelle et technique |
| `scenariste`    | Traduit une spécification en scénarios Gherkin            |
| `techLead`      | Valide la faisabilité technique et arbitre l'architecture |
| `customPlan`    | Produit un plan d'implémentation atomique, sans coder     |
| `test`          | Écrit les tests en échec à partir des scénarios           |
| `develop`       | Implémente jusqu'à faire passer les tests                 |
| `review`        | Audite le code produit sans le modifier                   |
| `document`      | Met à jour `/docs` à partir du code source                |

## Avertissements

- **Ils sont rédigés en français**, contrairement aux documents destinés aux
  contributeurs (README, CONTRIBUTING, ROADMAP), qui sont en anglais.
- **Ils ne sont pas tenus à jour automatiquement.** Ils peuvent décrire des
  conventions qui ont évolué. En cas de contradiction, [CONTRIBUTING.md](../../../CONTRIBUTING.md)
  fait foi.
- **Le code produit par un agent est votre responsabilité.** Une pull request est
  jugée sur son contenu, pas sur la façon dont elle a été écrite. La CI et la revue
  s'appliquent de la même manière.
