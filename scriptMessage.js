/*
Page des messages : liste des amis, affichage, envoi et réception en direct.
Les règles de sécurité (RLS) font que chacun ne voit que les messages qu'il a envoyés ou reçus.
*/


// 1. Outils :


const FICHIERS_AVATARS = {
  avatar1: "avatar1renard",
  avatar2: "avatar2zebre",
  avatar3: "avatar3perroquet",
  avatar4: "avatar4hibou",
  avatar5: "avatar5parresseux",
  avatar6: "avatar6giraffe",
  avatar7: "avatar7pingouin",
  avatar8: "avatar8dinosaure",
  avatar9: "avatar9lion",
  avatar10: "avatar10ours",
};

// Retourne l'avatar d'un profil : l'image, ou la première lettre du prénom s'il n'en a pas.
function creerAvatar(profil) {
  const fichier = FICHIERS_AVATARS[profil.avatar];

  if (fichier) {
    const image = document.createElement("img");
    image.className = "avatar";
    image.src = "ressources/avatars/" + fichier + ".png";
    image.alt = "";
    return image;
  }

  const pastille = document.createElement("div");
  pastille.className = "avatar";
  pastille.textContent = (profil.prenom || "?").charAt(0).toUpperCase();
  return pastille;
}

// Pour la liste des amis : l'heure si c'est aujourd'hui, sinon la date (ex. « 7 nov. »).
function formaterQuand(iso) {
  const date = new Date(iso);
  if (date.toDateString() === new Date().toDateString()) {
    return date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  }
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

// Pour les bulles : l'heure, avec la date si le message n'est pas d'aujourd'hui.
function formaterHeureMessage(iso) {
  const date = new Date(iso);
  if (date.toDateString() === new Date().toDateString()) {
    return date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  }
  return date.toLocaleString("fr-FR", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"
  });
}

// Mémoire du navigateur : retient l'ami ouvert si on recharge la page.
const Local = {
  CLE_AMI: "cleAmiCourant",

  lireAmiCourant() {
    try {
      return sessionStorage.getItem(this.CLE_AMI);
    } catch (erreur) {
      return null;
    }
  },

  ecrireAmiCourant(id) {
    try {
      sessionStorage.setItem(this.CLE_AMI, id);
    } catch (erreur) {
      console.warn("Impossible de retenir la conversation ouverte.", erreur);
    }
  },

  effacerAmiCourant() {
    try {
      sessionStorage.removeItem(this.CLE_AMI);
    } catch (erreur) {
      console.warn("Impossible d'oublier la conversation ouverte.", erreur);
    }
  },

  // Appelée à la déconnexion
  effacerSession() {
    try {
      sessionStorage.clear();
    } catch (erreur) {
      console.warn("Impossible d'effacer la session.", erreur);
    }
  },
};


// 2. Données (Supabase) :
// Le reste du fichier n'écrit jamais de requête : il appelle Data.quelqueChose().


const Data = {

  // Tous les profils sauf le sien = la liste des amis
  async chargerProfils(monId) {
    return await client
      .from("profils")
      .select("id, prenom, avatar")
      .neq("id", monId)
      .order("prenom");
  },

  // Les derniers messages envoyés ou reçus, du plus récent au plus ancien
  // (sert à afficher le dernier message de chaque conversation).
  async chargerDerniersMessages(monId) {
    return await client
      .from("message")
      .select("id, text, created_at, create_by, destinataire_id")
      .or("create_by.eq." + monId + ",destinataire_id.eq." + monId)
      .order("created_at", { ascending: false })
      .limit(300);
  },

  // Les 50 derniers messages entre moi et un ami.
  // On trie du plus récent au plus ancien AVANT de limiter pour garder les derniers :
  // le tableau arrive donc « à l'envers », on le remet dans l'ordre avec reverse().
  async chargerConversation(monId, amiId) {
    return await client
      .from("message")
      .select("id, text, created_at, create_by, destinataire_id")
      .or(
        "and(create_by.eq." + monId + ",destinataire_id.eq." + amiId + ")," +
        "and(create_by.eq." + amiId + ",destinataire_id.eq." + monId + ")"
      )
      .order("created_at", { ascending: false })
      .limit(50);
  },

  // `create_by` n'est volontairement pas envoyé : la base le remplit avec
  // l'identifiant de la personne connectée (auth.uid()), impossible de le falsifier.
  // `.select().single()` demande de retourner la ligne créée.
  async envoyerMessage(amiId, texte) {
    return await client
      .from("message")
      .insert({ text: texte, destinataire_id: amiId })
      .select()
      .single();
  },

  // Écoute en direct : Supabase nous prévient dès qu'un message m'est adressé.
  // Retourne une fonction pour arrêter l'écoute.
  ecouterMessages(monId, quandNouveau) {
    const abonnement = client
      .channel("messages-recus-" + monId)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "message",
          filter: "destinataire_id=eq." + monId,
        },
        (payload) => quandNouveau(payload.new)
      )
      .subscribe((statut) => {
        if (statut === "CHANNEL_ERROR" || statut === "TIMED_OUT") {
          console.warn("Écoute des messages en direct impossible :", statut);
        }
      });

    return () => client.removeChannel(abonnement);
  },
};


// 3. État de la page et éléments du DOM :


let moi = null;          // la personne connectée
let amis = [];           // les autres profils : { id, prenom, avatar }
let amiOuvert = null;    // l'ami dont la conversation est ouverte (ou null)
let apercus = {};        // id de l'ami -> dernier message de la conversation
let nonLus = {};         // id de l'ami -> nombre de nouveaux messages non ouverts
let arreterEcoute = null;
const idsAffiches = new Set(); // évite d'afficher deux fois le même message

const inputChannel = document.getElementById("input-channel");
const ulChannels = document.getElementById("ul-channels");
const spanChannelAvatar = document.getElementById("span-channel-avatar");
const spanChannelTitle = document.getElementById("span-channel-title");
const divMessages = document.getElementById("div-messages");
const formMessage = document.getElementById("form-message");
const inputMessage = document.getElementById("input-message");
const boutonEnvoyer = formMessage.querySelector("button");


// 4. Historique des conversations / liste de contacts :


async function chargerAmis() {
  const [reponseAmis, reponseMessages] = await Promise.all([
    Data.chargerProfils(moi.id),
    Data.chargerDerniersMessages(moi.id),
  ]);

  if (reponseAmis.error) {
    console.error("Impossible de charger les amis.", reponseAmis.error);
    return;
  }
  amis = reponseAmis.data.map((profil) => ({ ...profil, prenom: profil.prenom || "Ami" }));

  apercus = {};
  if (reponseMessages.error) {
    console.error("Impossible de charger les derniers messages.", reponseMessages.error);
    return;
  }
  // Du plus récent au plus ancien : le premier message trouvé pour un ami
  // est donc le dernier de sa conversation.
  reponseMessages.data.forEach((message) => {
    const autreId = message.create_by === moi.id ? message.destinataire_id : message.create_by;
    if (!apercus[autreId]) apercus[autreId] = message;
  });
}

function texteApercu(message) {
  if (!message) return "Dis bonjour !";
  return (message.create_by === moi.id ? "Toi : " : "") + message.text;
}

// Les conversations avec un message d'abord (la plus récente en haut), puis les autres par prénom.
function trierAmis(a, b) {
  const quandA = apercus[a.id] ? new Date(apercus[a.id].created_at) : null;
  const quandB = apercus[b.id] ? new Date(apercus[b.id].created_at) : null;

  if (quandA && quandB) return quandB - quandA;
  if (quandA) return -1;
  if (quandB) return 1;
  return a.prenom.localeCompare(b.prenom);
}

function afficherAmis() {
  const recherche = inputChannel.value.trim().toLowerCase();
  const visibles = amis
    .filter((ami) => ami.prenom.toLowerCase().includes(recherche))
    .sort(trierAmis);

  ulChannels.replaceChildren();

  if (visibles.length === 0) {
    const vide = document.createElement("li");
    vide.className = "liste-vide";
    vide.textContent = amis.length === 0 ? "Aucun ami pour l'instant." : "Aucun ami trouvé.";
    ulChannels.appendChild(vide);
    return;
  }

  visibles.forEach(afficherAmi);
}

// Construit <li><button>…</button></li>.
// textContent (et non innerHTML) : le texte reste du texte brut, aucune faille XSS.
function afficherAmi(ami) {
  const liElement = document.createElement("li");
  const buttonElement = document.createElement("button");
  buttonElement.type = "button";
  buttonElement.className = "channel-item";

  // Marque la conversation ouverte (le CSS la met en évidence avec [aria-current=true])
  if (amiOuvert && amiOuvert.id === ami.id) {
    buttonElement.setAttribute("aria-current", "true");
  }

  const texte = document.createElement("div");
  texte.className = "channel-text";
  const nom = document.createElement("span");
  nom.className = "channel-name";
  nom.textContent = ami.prenom;
  const apercu = document.createElement("span");
  apercu.className = "channel-apercu";
  apercu.textContent = texteApercu(apercus[ami.id]);
  texte.append(nom, apercu);

  const infos = document.createElement("div");
  infos.className = "channel-meta";
  const dernier = apercus[ami.id];
  if (dernier) {
    const heure = document.createElement("time");
    heure.dateTime = dernier.created_at;
    heure.textContent = formaterQuand(dernier.created_at);
    infos.appendChild(heure);
  }
  if (nonLus[ami.id] > 0) {
    const badge = document.createElement("span");
    badge.className = "badge";
    badge.textContent = nonLus[ami.id];
    infos.appendChild(badge);
  }

  buttonElement.append(creerAvatar(ami), texte, infos);
  buttonElement.addEventListener("click", () => ouvrirAmi(ami));

  liElement.appendChild(buttonElement);
  ulChannels.appendChild(liElement);
}

async function ouvrirAmi(ami) {
  amiOuvert = ami;
  Local.ecrireAmiCourant(ami.id);
  nonLus[ami.id] = 0;

  spanChannelAvatar.replaceChildren(creerAvatar(ami));
  spanChannelTitle.textContent = ami.prenom;
  document.body.classList.add("open"); // le CSS affiche/masque les panneaux selon cette classe

  afficherAmis();
  divMessages.replaceChildren();
  idsAffiches.clear();
  await chargerMessages();

  // Sur téléphone, on évite d'ouvrir le clavier tout de suite
  if (window.matchMedia("(min-width: 701px)").matches) {
    inputMessage.focus();
  }
}

function fermerConversation() {
  amiOuvert = null;
  Local.effacerAmiCourant();
  divMessages.replaceChildren();
  idsAffiches.clear();
  spanChannelAvatar.replaceChildren();
  spanChannelTitle.textContent = "";
  document.body.classList.remove("open");
  afficherAmis();
}


// 5. Messages :


async function chargerMessages() {
  const ami = amiOuvert;
  const { data: messages, error } = await Data.chargerConversation(moi.id, ami.id);

  // La personne a changé d'ami pendant le chargement : on ne touche plus à l'écran
  if (ami !== amiOuvert) return;

  if (error) {
    console.error("Impossible de charger les messages.", error);
    return;
  }

  divMessages.replaceChildren();
  idsAffiches.clear();
  // Encore un fois, les messages arrivent du plus récent au plus ancien : reverse() les remets dans l'ordre
  messages.reverse().forEach(afficherMessage);
  defiler();
}

// Construit le corps (avec l'avatar de l'ami devant pour les messages reçus).
function afficherMessage(message) {
  if (idsAffiches.has(message.id)) return;
  idsAffiches.add(message.id);

  const envoye = message.create_by === moi.id;

  const articleElement = document.createElement("article");
  const corps = document.createElement("div");
  corps.className = "corps";
  const pElement = document.createElement("p");
  const timeElement = document.createElement("time");

  pElement.textContent = message.text;
  timeElement.textContent = formaterHeureMessage(message.created_at);
  timeElement.dateTime = message.created_at;

  if (envoye) {
    // Les messages de la personne connectée sont à droite (classe .sent)
    articleElement.classList.add("sent");
  } else {
    const headerElement = document.createElement("header");
    headerElement.textContent = amiOuvert.prenom;
    articleElement.appendChild(creerAvatar(amiOuvert));
    corps.appendChild(headerElement);
  }

  corps.append(pElement, timeElement);
  articleElement.appendChild(corps);
  divMessages.appendChild(articleElement);
}

// Fait défiler jusqu'en bas : on voit toujours le dernier message.
function defiler() {
  divMessages.scrollTop = divMessages.scrollHeight;
}

// Appelée par l'écoute en direct à chaque message qu'on reçoit.
async function recevoirMessage(message) {
  const amiId = message.create_by;

  // Expéditeur inconnu (compte créé depuis l'ouverture de la page) : on recharge la liste
  if (!amis.some((ami) => ami.id === amiId)) {
    await chargerAmis();
  }
  apercus[amiId] = message;

  if (amiOuvert && amiOuvert.id === amiId) {
    afficherMessage(message);
    defiler();
  } else {
    nonLus[amiId] = (nonLus[amiId] || 0) + 1;
  }
  afficherAmis();
}


// 6. Événements :


formMessage.addEventListener("submit", async (event) => {
  event.preventDefault();
  const texte = inputMessage.value.trim();
  // Garde-fou : message vide ou aucune conversation ouverte
  if (!texte || !amiOuvert) return;

  const ami = amiOuvert;
  boutonEnvoyer.disabled = true;
  const { data: message, error } = await Data.envoyerMessage(ami.id, texte);
  boutonEnvoyer.disabled = false;

  if (error) {
    console.error("Impossible d'envoyer le message.", error);
    alert("Impossible d'envoyer ton message : " + error.message);
    return;
  }

  // On vide le champ seulement si l'envoi a réussi
  inputMessage.value = "";
  apercus[ami.id] = message;
  if (amiOuvert === ami) {
    afficherMessage(message);
    defiler();
  }
  afficherAmis();
  inputMessage.focus();
});

// Recherche : on filtre la liste des amis pendant qu'on écrit
inputChannel.addEventListener("input", afficherAmis);
document.getElementById("form-channel").addEventListener("submit", (event) => {
  event.preventDefault();
});

// Bouton « Retour » (visible seulement sur téléphone) : on ferme la conversation
document.getElementById("button-back").addEventListener("click", fermerConversation);

// Déconnexion : on ferme la session et on retourne à la page de connexion
document.getElementById("deconnexion").addEventListener("click", async () => {
  arreterEcoute?.(); // `?.()` : appelle la fonction seulement si elle existe
  await client.auth.signOut();
  Local.effacerSession();
  window.location.href = "Connexion.html";
});

// Si la session se termine (autre onglet, session expirée), retour à la connexion
client.auth.onAuthStateChange((evenement) => {
  if (evenement === "SIGNED_OUT") {
    Local.effacerSession();
    window.location.replace("Connexion.html");
  }
});


// 7. Démarrage (init) :


async function init() {
  const { data: { user }, error } = await client.auth.getUser();

  // Pas connecté (ou session périmée) : retour à la connexion
  if (error || !user) {
    await client.auth.signOut();
    window.location.replace("Connexion.html");
    return;
  }
  moi = user;

  // Donne à l'écoute en direct le jeton de la personne connectée
  try {
    const { data: { session } } = await client.auth.getSession();
    await client.realtime.setAuth(session.access_token);
  } catch (erreur) {
    console.warn("Impossible de transmettre la session à l'écoute en direct.", erreur);
  }

  await chargerAmis();
  afficherAmis();
  arreterEcoute = Data.ecouterMessages(moi.id, recevoirMessage);

  // Rechargement de la page avec une conversation déjà ouverte : on la réouvre
  const idMemorise = Local.lireAmiCourant();
  const ami = amis.find((a) => a.id === idMemorise);
  if (ami) await ouvrirAmi(ami);
}

init();