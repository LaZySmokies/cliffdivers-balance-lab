# CliffDivers Balance Lab

Prototype interactif d’équilibrage des modules, de l’énergie et des expéditions.

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
- Parcours navigateur vérifié sur un écran 1440 × 1000 : sac, création de segment, perte passive avec virgule, aide contextuelle, emplacement des paramètres Monte-Carlo et résultat probabiliste.

## Limites actuelles

Le moteur mesure précisément l’énergie et les risques de survie du profil choisi. Les dégâts, l’armure, la lumière, la détection, la récolte et la coopération utilisent encore des proxys ou ne disposent pas de modèle de gameplay complet.

