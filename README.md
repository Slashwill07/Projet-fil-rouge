# Projet-fil-rouge
membres de l'équipe : Alec Germain et William Comsel

## Fonctionnalités
- Inscription (prénom, adresse courriel et mot de passe), connexion, déconnexion
- Création de salons de discussion automatique (noms uniques)
- Envoi et réception de messages en temps réel
- Le salon ouvert est conservé lors d'un rechargement de la page
- Mot de passe oublié : un lien est envoyé par courriel pour en choisir un nouveau

## Fonctionnalité supplémentaire : Les utilisateurs vont avoir un avatar qui leur est attribué. Cela implique : 
- À l'inscription, chaque personne choisit son avatar parmi 10 animaux
- L'avatar des amis est affiché à côté de leur nom (liste d'amis, en-tête de la conversation et messages reçus)
- Une conversation privée avec chaque ami
- Interface adaptée au mobile (un seul panneau à la fois sur petit écran)
- Dans la liste d'amis : dernier message, heure, pastille du nombre de messages non lus et recherche par prénoml

## Technologies
| Rôle | Choix |
|---|---|
| Interface | HTML, CSS, JavaScript |
| Authentification et base de données (incluant le temps réel) | [Supabase](https://supabase.com) (PostgreSQL) |
| Bibliothèque côté client | `supabase-js` |
| Hébergement | GitHub Pages |

Il n'y a pas de serveur Web à configurer : le navigateur communique directement avec Supabase.

## Structure du projet

```
Projet-fil-rouge/
├── index.html             Accueil (logo et bouton « C'est parti ! »)
├── Connexion.html         Connexion, inscription et mot de passe oublié
├── ChoixAvatar.html       Choix de l'avatar après l'inscription
├── Message.html           Page principale (amis + messages)
├── Reinitialiser.html     Choix d'un nouveau mot de passe
├── Regles.css             Tous les styles du site
├── supabaseConfig.js      Création du client Supabase
├── scriptConnexion.js     Logique de la page de connexion
├── scriptChoixAvatar.js   Logique du choix d'avatar
├── scriptMessage.js       Logique de la page des messages
├── scriptReinitialiser.js Logique du changement de mot de passe
└── ressources/
    ├── logoMessagesKids.png
    └── avatars/           Les 10 images d'avatars
```

## Architecture
### Le parcours d'une personne

```
index.html → Connexion.html ─┬─ pas d'avatar → ChoixAvatar.html ─┐
                             │                                    ▼
                             └─ avatar déjà choisi ───────────→ Message.html
```

Après la connexion, `scriptConnexion.js` regarde dans la table `profils` si la personne a déjà un avatar. Si oui, elle va directement aux messages, sinon elle passe par le choix d'avatar. Une personne déjà connectée sur l'appareil saute la page de connexion.
 
### Les pages et leur style
Le `body` de chaque page a une classe qui choisit son apparence dans `Regles.css` :
 
### Circulation des données (envoi et réception d'un message)
- **Envoi** : le message est enregistré dans la base, puis la base renvoie la ligne créée et c'est cette ligne qui est affichée.
- **Réception** : `Data.ecouterMessages` utilise le temps réel de Supabase. Dès qu'un message est adressé à la personne connectée, la page l'affiche, ou ajoute une pastille « non lu » si la conversation n'est pas ouverte.
- Un message n'est jamais affiché deux fois (chaque `id` affiché est mémorisé).
  
### Gestion des sessions
Chaque page protégée vérifie auprès de Supabase que la session est valide. Sinon, la personne est renvoyée à `Connexion.html`. Si la session se termine (déconnexion dans un autre onglet, expiration), la page des messages redirige aussi vers la connexion.
 
## Base de données
Deux tables. `message` a le temps réel activé.
 
### Table `profils`
 
| Colonne | Type | Remarque |
|---|---|---|
| `id` | uuid | clé primaire, clé étrangère → `auth.users.id` |
| `prenom` | text | prénom choisi à l'inscription |
| `avatar` | text | `avatar1` à `avatar10` (vide tant que l'avatar n'est pas choisi) |
| `created_at` | timestamptz | par défaut `now()` |
 
### Table `message`
 
| Colonne | Type | Remarque |
|---|---|---|
| `id` | bigint | clé primaire (identité) |
| `created_at` | timestamptz | par défaut `now()` |
| `create_by` | uuid | expéditeur, clé étrangère → `auth.users.id`, par défaut `auth.uid()` |
| `destinataire_id` | uuid | destinataire, clé étrangère → `auth.users.id` |
| `text` | text | contenu du message |
 
### Sécurité (RLS)
La clé « publishable » de `supabaseConfig.js` est visible par tout le monde. La protection repose sur la **sécurité au niveau des lignes (RLS)** de PostgreSQL, activée sur les deux tables :
 
**`profils`**
- **Lecture** : toute personne connectée peut lire tous les profils (pour afficher les amis).
- **Création et modification** : seulement son propre profil.
**`message`**
- **Lecture** : seulement les messages qu'on a envoyés ou reçus.
- **Création** : seulement en son propre nom (`create_by` = son identifiant), et jamais à soi-même.
- **Modification et suppression** : aucune règle, donc interdites.
Le client **n'envoie jamais** `create_by` : la base le remplit avec `auth.uid()`, donc impossible de se faire passer pour quelqu'un d'autre.
 
Le script SQL de ces deux tables :
 
```sql
-- Profils
alter table public.profils enable row level security;
 
create policy "lire les profils" on public.profils
  for select to authenticated using (true);
create policy "creer son profil" on public.profils
  for insert to authenticated with check ((select auth.uid()) = id);
create policy "modifier son profil" on public.profils
  for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
 
-- Messages privés
alter table public.message
  add column destinataire_id uuid not null references auth.users(id) on delete cascade;
 
create index message_destinataire_idx on public.message (destinataire_id, created_at desc);
create index message_auteur_idx on public.message (create_by, created_at desc);
 
alter table public.message enable row level security;
 
create policy "voir ses messages" on public.message
  for select to authenticated
  using (create_by = (select auth.uid()) or destinataire_id = (select auth.uid()));
create policy "envoyer un message" on public.message
  for insert to authenticated
  with check (create_by = (select auth.uid()) and destinataire_id <> (select auth.uid()));
 
-- Temps réel
alter publication supabase_realtime add table public.message;
```

> Ne jamais mettre la clé `secret` / `service_role` dans le code du navigateur.
> Si le lien de réinitialisation du mot de passe arrive sur l'accueil au lieu de `Reinitialiser.html`, c'est que l'adresse de la page n'est pas dans cette liste. Dans tous les cas, `index.html` renvoie vers `Reinitialiser.html` un lien de réinitialisation qui arriverait sur l'accueil.
 
## Limites connues
- **Tous les profils sont des amis.** Il n'y a pas encore de système de demandes d'amis : la liste affiche toutes les personnes inscrites.
- Les messages ne peuvent être ni modifiés ni supprimés.
- Le nombre de messages non lus est perdu quand on recharge la page.
- Les images des avatars sont des fichiers du projet (dossier `ressources/avatars/`).
  
## Corrections et pistes d'amélioration
- Ajouter un vrai système d'amis (demandes, acceptation) : il suffira alors de changer `Data.chargerProfils` dans `scriptMessage.js`.
- Mémoriser les messages non lus dans la base.
- Charger les messages plus anciens que les 50 derniers (pagination).
- Permettre de changer d'avatar après l'inscription.
- Supprimer ou modifier un message.
- Défiler automatiquement vers le dernier message reçu uniquement si la fenêtre des messages est déjà vers le bas.
