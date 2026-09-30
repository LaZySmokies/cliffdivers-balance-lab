# Analyse du prototype — CliffDivers Balance Lab

## Mise à jour 1.7 — modules personnalisés et explication des résultats

- Le sélecteur de modèle et le créateur de sac partagent désormais le même alignement visuel. Le choix principal reste immédiatement lisible et l’action secondaire n’introduit plus de décalage.
- Les trois indicateurs de décision du profil énergétique expliquent leur définition et leur portée via la même aide contextuelle que le reste de l’application.
- Une nouvelle fiche part de zéro dans le Catalogue. Elle reçoit un identifiant stable, peut être renommée et accepte tous les paramètres énergétiques, les règles d’usage, la famille de gameplay, les slots et une description. Elle apparaît ensuite dans la bibliothèque d’Équipement.
- La sauvegarde automatique et l’export JSON conservent les modules créés. Chaque champ dispose de son propre délai de saisie afin que deux modifications rapides ne s’annulent pas mutuellement.
- Les commandes d’événement manuel servent à injecter une activation exacte au curseur de la chronologie. Elles sont utiles pour reproduire un cas de test ou vérifier un coût ponctuel, mais elles ne décrivent pas la structure générale d’un scénario. Elles ont donc été déplacées sous la courbe dans « Événements manuels avancés », replié par défaut.
- Le résumé analytique commence par la cause principale du résultat, puis déroule chaque segment avec ses bornes temporelles, son milieu, son bilan énergétique, ses trois flux dominants et ses événements critiques. Le bouton « Observer » place le curseur au milieu du segment correspondant.

### Contrôles effectués

- Alignement des commandes du sac contrôlé dans l’interface ordinateur.
- Aide « Énergie au retour » ouverte et lue depuis le bloc Résultats.
- Module personnalisé créé, renommé, réglé à `+1,25 énergie/s`, retrouvé par la recherche, puis équipé sur Down 2 ; le sac est passé de 5/6 à 6/6 et le flux net a été recalculé.
- Persistance d’un module personnalisé contrôlée après rechargement.
- L’écran Scénario ne contient plus les actions manuelles ; le bloc avancé reste présent sous la chronologie d’Équipement.
- Les trois boutons « Observer » du scénario de démonstration déplacent bien l’instant observé vers le segment choisi.

## Mise à jour 1.6 — sacs configurables et résultats intégrés

- Le modèle de sac définit désormais le nombre de slots par famille. Les presets proposent 4, 6 ou 8 emplacements.
- Le créateur de sacs accepte jusqu’à quatre connecteurs par famille et conserve les modèles personnalisés dans le navigateur et les exports JSON.
- Le placement duplique le module choisi sur le nouveau slot. Le moteur additionne les capacités, flux et effets de chaque exemplaire.
- L’analyse en lot construit ses compositions à partir des slots du sac actif et inclut les répétitions de modules. Le plafond de calcul reste affiché quand l’espace de recherche est trop grand.
- Les libellés Top, Side et Down sont visibles comme des badges cyan au centre de chaque rangée de connecteurs.
- Le bloc Résultats appartient maintenant à l’écran Équipement et commence sous le composeur de sac. La chronologie énergétique retrouve ainsi sa proximité avec la composition testée.
- La validation a couvert un sac personnalisé de sept slots, trois batteries cumulées et deux panneaux solaires équipés simultanément.

## Mise à jour 1.5 — décisions de balance et parcours

- Les diffuseurs de dégâts et d’armure ainsi que la lampe disposent d’effets de gameplay mesurés pendant les segments pertinents.
- Les actions déclarent leur politique d’usage ; l’analyse en lot et la Monte-Carlo génèrent les activations puis intègrent leur coût réel.
- Les modules dormants ou encore non modélisés sont signalés et pénalisés dans le classement.
- La formule de classement, ses limites, le nombre de scénarios et un indicateur de couverture sont visibles.
- La probabilité de retour Monte-Carlo affiche un intervalle de confiance de Wilson à 95 %.
- Une vue Résultats regroupe courbe déterministe, comparaison A/B, analyse en lot et Monte-Carlo.
- Un exemple commenté, un parcours en quatre étapes et une synthèse de session facilitent la première utilisation.
- Les slots disposent de boutons distincts pour sélectionner et retirer un module au clavier.
- Les points du Pareto sont des boutons avec un libellé complet et un panneau de lecture persistant.

## Mise à jour 1.3 — éditeur de scénarios et lisibilité

### Résultat vérifié

- Le sac occupe maintenant un corridor central de largeur fixe. Les six cartes sont distribuées sur deux rails latéraux ; aucune ne masque le visuel à 1440 × 1000.
- L’éditeur accepte un nombre libre de segments. Ils peuvent être ajoutés, renommés, déplacés, dupliqués et supprimés.
- Un segment décrit une activité, une durée, un milieu, un mouvement, le vent, un multiplicateur de perte passive, une variation immédiate d’énergie ou de PV, une récompense en ressources et une action au début.
- Les scénarios peuvent être nommés, enregistrés et rappelés. Leur chronologie, leurs actions et leur profil probabiliste restent groupés.
- Tous les paramètres Monte-Carlo se trouvent dans Scénario. Analyse ne conserve que le résumé du profil et le bouton de lancement.
- La perte passive accepte désormais toute valeur comprise entre 0 et 10 000 %, avec point ou virgule. Un aperçu affiche immédiatement la perte réelle en points par seconde selon l’assiette choisie.
- Chaque paramètre global, probabiliste, de segment ou de module dispose d’un bouton `?` lisible au survol, au focus clavier ou au clic.
- L’export JSON contient aussi les scénarios enregistrés ; l’import reste compatible avec les profils 1.2.

### Contrôles effectués

- 37 tests existants réussis et 4 assertions supplémentaires sur le multiplicateur de perte, l’énergie, les PV et les ressources d’un segment.
- Création d’un quatrième segment contrôlée dans l’interface.
- Saisie `1,25` contrôlée : l’aperçu devient `−1,250 énergie / s` sur une base de 100.
- Infobulle de la perte passive vérifiée au clic.
- Les contrôles Monte-Carlo sont présents dans Scénario et absents d’Analyse.
- Une simulation de 500 expéditions a produit ses probabilités, percentiles et événements sans erreur dans la console.

### Améliorations recommandées

1. Relier les catégories de modules à des effets de gameplay mesurables : DPS, dégâts évités, visibilité, détection, récolte et temps gagné.
2. Remplacer les variations immédiates génériques par une bibliothèque d’événements réutilisables : combat, chute, escalade, récolte, soin, abri et retour forcé.
3. Ajouter une vue graphique du scénario avec blocs proportionnels à leur durée et marqueurs d’événements déplaçables.
4. Rejouer les mêmes graines dans le jeu et dans l’outil afin de vérifier l’ordre des événements, les arrondis et les cooldowns.
5. Ajouter un mode daltonien, une navigation clavier complète du sac et des unités configurables.
6. Stocker les profils dans un espace partagé avec auteurs, commentaires et résolution de conflits quand le processus d’équipe sera défini.

## État vérifié

La version 1.1 couvre le parcours principal : composer un sac, lire les effets énergétiques, modifier les valeurs d’un module, configurer les conditions d’une expédition et observer immédiatement les courbes, alertes et métriques.

### Changements validés

- Le catalogue expose les 53 entrées consolidées et distingue clairement les 13 modules simulables des fiches encore incomplètes.
- Les modules simulables peuvent être réglés : mode, condition, slots compatibles, production, consommation, réduction de perte, capacité, coût d’action, recharge et description.
- Toute modification d’un module alimente le moteur courant et recalcule la télémétrie. Un bouton restaure un module ou tous les modules.
- L’écran Scénario permet de modifier les segments et toutes les constantes initiales utilisées par le moteur : charge, PV, combustible, multiplicateur des flux, énergie maximale, perte passive, dégâts de famine, régénération en zone sûre, durée d’agonie et durée d’un combustible.
- Les cartes et slots disposent d’une fiche au survol ou au focus avec rôle, compatibilités, description et statistiques énergétiques.
- Sur ordinateur, la zone du sac a été réduite et alignée avec la bibliothèque et la télémétrie. Le début du profil d’expédition apparaît désormais dans le premier écran à une hauteur de fenêtre courante.
- Les changements restent annulables dans la session, y compris les modifications des modules.

## Vérifications effectuées

- Validation syntaxique des scripts de l’application.
- 24 tests de non-régression sur les règles énergétiques historiques.
- 5 tests dédiés aux paramètres configurables : capacité, perte passive, famine, agonie, zone sûre et combustible.
- Parcours visuel sur écran ordinateur : catalogue, modification d’une production, retour à l’équipement, propagation de la nouvelle valeur dans le flux net et la saturation.
- Vérification visuelle de la fiche RPG sur un module consommateur.
- Vérification de la présence de tous les nouveaux champs dans l’écran Scénario.

## Ce qui manque encore pour un outil d’équilibrage de production

### Priorité 1 — Relier énergie et valeur de gameplay

La simulation sait mesurer le coût énergétique, mais pas encore le bénéfice réel. Il faut ajouter des modèles pour les dégâts, l’armure, la lumière, la détection, la récolte et le confort. Sans eux, deux modules ayant le même coût restent difficiles à comparer.

Métriques recommandées : dégâts gagnés par point d’énergie, dégâts évités par point, ressources collectées par minute, portée utile, temps gagné et taux d’utilisation du module.

### Priorité 2 — Simuler des expéditions plus réalistes

Les scénarios reposent sur des segments déterministes. Un outil de balancing robuste devrait gérer des événements probabilistes : durée de combat, météo, temps d’escalade, blessures, détours et quantité de ressources. Une simulation Monte-Carlo donnerait une probabilité de retour plutôt qu’un seul résultat.

### Priorité 3 — Import, export et historique

Les réglages sont actuellement conservés pendant la session. Il faut pouvoir exporter/importer un profil JSON ou CSV, nommer des versions, conserver un historique des changements et joindre une note de balance. Cela rendrait les résultats partageables entre game design et programmation.

### Priorité 4 — Analyse automatique des builds

Ajouter un mode lot qui teste toutes les compositions valides sur plusieurs scénarios, puis affiche :

- les builds dominants ou jamais choisis ;
- les frontières de Pareto entre autonomie, puissance et polyvalence ;
- la sensibilité à chaque paramètre ;
- les ruptures brutales de viabilité ;
- les modules dont le taux d’équipement est trop élevé ou trop faible.

### Priorité 5 — Coopération et interactions systémiques

Les auras, transferts d’énergie, modules de groupe, doublons et règles de cumul restent à formaliser. La prochaine version devrait représenter plusieurs joueurs, les distances entre eux, les priorités de transfert et les effets de mort ou d’agonie d’un équipier.

### Priorité 6 — Parité avec le jeu

Le moteur devra partager des données versionnées avec l’implémentation du jeu ou importer ses tables. Des tests de parité devraient rejouer les mêmes scénarios dans le prototype et dans le jeu pour détecter les différences d’arrondi, d’ordre des événements et de cooldown.

### Priorité 7 — Finition UX

Les améliorations utiles restantes sont la navigation clavier complète du glisser-déposer, un mode daltonien, des unités éditables, une aide contextuelle sur chaque règle, des préréglages de modules et l’affichage simultané de plusieurs courbes de comparaison.

## Recommandation de prochaine étape

Construire d’abord un format de données versionné commun aux modules et au moteur du jeu, puis ajouter le calcul de valeur de gameplay pour trois familles pilotes : dégâts, armure et lumière. Cela permettra de vérifier que l’application répond à la vraie question de balance : combien de puissance ou d’utilité le joueur reçoit pour l’autonomie qu’il sacrifie.

## Mise à jour 1.2

### Fonctions ajoutées

- Implantation du sac élargie : cartes de slots de 112 px sur ordinateur, connecteurs repoussés vers les bords et visuel central dégagé.
- Sauvegarde locale automatique de la configuration et du catalogue édité.
- Versions nommées avec date, note de balance, restauration et suppression.
- Export du profil complet en JSON, export tabulaire en CSV et import JSON validé par le moteur.
- Journal local des changements.
- Analyse en lot de 2 904 compositions canoniques valides sur les trois scénarios de référence.
- Classement des builds, frontière de Pareto autonomie/puissance/polyvalence, taux d’équipement du top 50, modules jamais choisis, sensibilité du build actif et recherche de ruptures de viabilité.
- Simulation Monte-Carlo reproductible par graine avec 12 biomes et des distributions éditables pour les POI, distances, météo, combats, escalade, blessures, détours, moulins et ressources.

### Sources de la simulation probabiliste

Les onglets P.O.I. et L.D. Biomes du document GDD_05_Monde_et_LevelDesign ont été lus directement. Les valeurs documentées reprises sont : un POI environ tous les 400 à 800 mètres, environ 200 mètres parcourus en 25 secondes de sprint, 12 biomes classés en six niveaux et une progression conjointe du danger, de la densité de créatures et de la richesse des ressources.

Les probabilités précises d’événement ne sont pas définies dans le GDD. Elles sont donc affichées comme paramètres de prototype. Les résultats ne doivent pas encore être traités comme une prédiction du jeu final.

### Limites restantes

- Le score de puissance est un proxy pondéré : les effets réels de dégâts, armure, lumière et récolte ne sont pas encore simulés.
- Les actions ponctuelles reçoivent une valeur de puissance mais l’analyse en lot ne construit pas encore une politique optimale d’activation.
- Les blessures de la Monte-Carlo réduisent les PV initiaux ; leur instant exact n’est pas encore injecté dans la chronologie.
- Les ressources sont estimées par une distribution liée au niveau de biome, faute de tables de loot consolidées.
- La recherche de ruptures teste pour l’instant une hausse de 10 % de la perte passive sur les 250 meilleurs builds.
- Les profils sont stockés dans le navigateur. Un espace partagé avec identités, commentaires et conflits de fusion demanderait un service serveur.
