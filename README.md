# CliffDivers Balance Lab

Prototype interactif d’équilibrage des modules, de l’énergie et des expéditions.

## Version 1.7

- Les commandes « Modèle de sac » et « Créer un sac » sont alignées sur une même ligne dans Équipement.
- Les indicateurs « énergie au retour », « valeur de gameplay » et « énergie payée en actions » disposent d’une aide `?` utilisable au survol, au clavier et au clic.
- Le Catalogue permet de créer un module entièrement nouveau, de le nommer, de définir ses flux, son mode, ses conditions, ses effets et ses slots, puis de l’équiper immédiatement.
- Les modules personnalisés sont conservés localement et inclus dans les exports JSON.
- Les événements manuels à l’instant observé ont quitté l’écran Scénario. Ils restent disponibles dans un bloc avancé replié sous la chronologie, pour reproduire un événement exact sans alourdir la création de scénario.
- Un résumé analytique explique le résultat déterministe, puis détaille chaque segment : variation d’énergie, flux dominants, événements importants et accès direct au moment concerné sur la courbe.

## Version 1.6

- Trois modèles de sac prêts à l’emploi : Éclaireur (4 slots), Explorateur (6) et Porteur (8).
- Créateur de sacs personnalisés avec 0 à 4 connecteurs Top, Side et Down.
- Un module peut être équipé sur plusieurs connecteurs compatibles ; chaque exemplaire contribue séparément à la simulation.
- Les familles Top, Side et Down sont signalées par des repères renforcés autour du visuel du sac.
- Tous les résultats sont placés dans Équipement, sous le sac : chronologie, comparaison, analyse automatique et Monte-Carlo.
- L’analyse automatique utilise la disposition du sac actif et autorise les compositions avec plusieurs exemplaires.
- Les profils JSON conservent le sac actif et les modèles personnalisés.

## Version 1.5

- Modèles pilotes de valeur de gameplay pour les dégâts, l’armure et la lumière.
- Valeur, famille, déclencheur, politique d’action et politique de toggle éditables dans le catalogue.
- Les analyses automatiques déclenchent les actions selon leur politique et paient leur coût énergétique.
- Formule, limites, couverture du modèle et niveau de confiance visibles avec les résultats.
- Parcours conseillé, introduction courte et exemple commenté chargeable en un clic.
- Bloc Résultats réunissant déterministe, comparaison A/B, Monte-Carlo et analyse en lot.
- Retrait des modules utilisable au clavier et graphique de Pareto composé de points sélectionnables.
- Typographie secondaire relevée pour rester lisible sur ordinateur.

## Version 1.4

- Sac 2D au centre d’un corridor dégagé, avec trois connecteurs sur chaque rail latéral : Top, Side et Down.
- Glisser-déposer, placement au clic, retrait et lecture instantanée des flux.
- Fiches RPG au survol des modules avec rôle, compatibilité, description et statistiques.
- Catalogue de 53 modules, dont 13 prototypes chiffrés entièrement modifiables.
- Scénarios composés d’un nombre libre de segments, réordonnables, duplicables et supprimables.
- Chaque segment définit son activité, sa durée, son milieu, son mouvement, le vent, un multiplicateur de perte, des variations d’énergie et de PV, des ressources et une action au début.
- Conditions initiales complètes, dont une perte passive libre acceptant le point ou la virgule.
- Variations Monte-Carlo définies par segment : occurrence, durée, détour, biome, pluie, nuit, grotte, blessure, ressources et zone sûre.
- Monte-Carlo fondée sur la chronologie réellement créée dans le scénario ; seules les itérations et la graine restent globales.
- Aide `?` sur les paramètres, avec explication et impact attendu.
- Aide contextuelle étendue aux métriques de télémétrie et aux résultats d’analyse.
- Création de prototypes configurables pour les modules incomplets du catalogue.
- Contrat de simulation éditable dans l’onglet Règles.
- Analyse exhaustive de 2 904 builds, Pareto, sensibilité, ruptures et taux d’équipement.
- Monte-Carlo reproductible par biome, avec POI, détours, météo, combats, blessures, zones sûres et ressources.
- Profils JSON/CSV, versions nommées, notes et historique local.

Les distances de POI (400–800 m), la vitesse de référence (8 m/s) et les niveaux des biomes proviennent des onglets P.O.I. et L.D. Biomes du GDD Monde et Level Design. Les probabilités précises restent des hypothèses visibles et modifiables.

## Ouvrir l’application

L’application publique est disponible ici :

**https://lazysmokies.github.io/cliffdivers-balance-lab/**

Elle fonctionne sans installation ni création de compte. Les profils et l’historique restent enregistrés dans le navigateur de chaque utilisateur ; l’export JSON permet de partager un état complet.

## Validation

- Syntaxe des trois scripts vérifiée.
- 37 tests de non-régression réussis : 24 moteur, 5 configuration et 8 analyse.
- Contrôles supplémentaires couvrant les variations de segment, la Monte-Carlo et l’activation d’un module incomplet.
- Parcours navigateur vérifié sur ordinateur : sac, création de segment, perte passive avec virgule, aide contextuelle, création et équipement d’un module personnalisé, analyse segment par segment, emplacement des paramètres Monte-Carlo et résultat probabiliste.

## Limites actuelles

Le moteur mesure précisément l’énergie et les risques de survie du profil choisi. Les dégâts, l’armure, la lumière, la détection, la récolte et la coopération utilisent encore des proxys ou ne disposent pas de modèle de gameplay complet.
