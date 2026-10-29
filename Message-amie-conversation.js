
const listeConversations = document.querySelector("#conversations");
const titreConversation = document.querySelector("#titre-conversation");
const fil = document.querySelector("#fil");
const formulaireMessage = document.querySelector("#form-message");
const champMessage = document.querySelector("#texte-message");
const statutMessage = document.querySelector("#statut-message");

let utilisateur;
let amiActuel = null;
let canalMessages = null;
let canalListe = null;

function elementTexte(tag, texte) {
  const element = document.createElement(tag);
  element.textContent = texte;
  return element;
}

async function verifierConnexion() {
  const { data: { user }, error } = await client.auth.getUser();

  if (error || !user) {
    window.location.href = "connexion.html";
    return false;
  }

  utilisateur = user;
  return true;
}

async function chargerListeAmis() {
  const { data: demandes, error } = await client
    .from("demandes_amis")
    .select("expediteur, destinataire")
    .eq("statut", "acceptee")
    .or(`expediteur.eq.${utilisateur.id},destinataire.eq.${utilisateur.id}`);

  if (error) {
    statutMessage.textContent = error.message;
    return;
  }

  listeConversations.replaceChildren();

  const ids = demandes.map(d =>
    d.expediteur === utilisateur.id ? d.destinataire : d.expediteur
  );

  if (ids.length === 0) {
    listeConversations.append(
      elementTexte("li", "Tu n'as pas encore d'amis.")
    );
    return;
  }

  const { data: profils, error: erreurProfils } = await client
    .from("profils")
    .select("id, prenom")
    .in("id", ids);

  if (erreurProfils) {
    statutMessage.textContent = erreurProfils.message;
    return;
  }

  for (const profil of profils) {
    const li = document.createElement("li");
    const bouton = elementTexte("button", profil.prenom);
    bouton.type = "button";

    bouton.addEventListener("click", () => {
      ouvrirConversation(profil);
    });

    li.append(bouton);
    listeConversations.append(li);
  }

  if (!amiActuel && profils.length > 0) {
    const idDemande = new URLSearchParams(window.location.search).get("ami");
    const ami = profils.find(p => p.id === idDemande) || profils[0];
    await ouvrirConversation(ami);
  }
}

function afficherMessage(message) {
  // Évite d'afficher deux fois un message déjà chargé
  if (fil.querySelector(`[data-message-id="${message.id}"]`)) {
    return;
  }

  const paragraphe = elementTexte("p", message.contenu);
  paragraphe.dataset.messageId = message.id;
  paragraphe.className =
    message.expediteur === utilisateur.id ? "envoye" : "recu";

  fil.append(paragraphe);
  fil.scrollTop = fil.scrollHeight;
}

async function chargerMessages() {
  if (!amiActuel) return;

  const amiId = amiActuel.id;

  const { data, error } = await client
    .from("messages")
    .select("id, expediteur, destinataire, contenu, created_at")
    .or(
      `and(expediteur.eq.${utilisateur.id},destinataire.eq.${amiId}),` +
      `and(expediteur.eq.${amiId},destinataire.eq.${utilisateur.id})`
    )
    .order("created_at", { ascending: true })
    .limit(500);

  if (error) {
    statutMessage.textContent = "Erreur : " + error.message;
    return;
  }

  fil.replaceChildren();

  if (data.length === 0) {
    fil.append(elementTexte("p", "Commence la conversation !"));
    return;
  }

  for (const message of data) {
    afficherMessage(message);
  }
}

async function ouvrirConversation(profil) {
  if (canalMessages) {
    await client.removeChannel(canalMessages);
    canalMessages = null;
  }

  amiActuel = profil;
  titreConversation.textContent = profil.prenom;
  statutMessage.textContent = "";
  champMessage.disabled = false;
  formulaireMessage.querySelector("button").disabled = false;

  const url = new URL(window.location.href);
  url.searchParams.set("ami", profil.id);
  history.replaceState({}, "", url);

  await chargerMessages();

  const idConversation = profil.id;

  canalMessages = client
    .channel("messages-" + utilisateur.id + "-" + idConversation)
    .on("postgres_changes", {
      event: "INSERT",
      schema: "public",
      table: "messages"
    }, payload => {
      const message = payload.new;

      if (
        amiActuel?.id === idConversation &&
        (
          (message.expediteur === utilisateur.id &&
           message.destinataire === idConversation) ||
          (message.expediteur === idConversation &&
           message.destinataire === utilisateur.id)
        )
      ) {
        afficherMessage(message);
      }
    })
    .subscribe();
}

formulaireMessage.addEventListener("submit", async event => {
  event.preventDefault();

  if (!amiActuel) {
    statutMessage.textContent = "Choisis d'abord un ami.";
    return;
  }

  const contenu = champMessage.value.trim();

  if (!contenu) return;

  const destinataire = amiActuel.id;
  const bouton = formulaireMessage.querySelector("button");

  bouton.disabled = true;

  try {
    const { data, error } = await client
      .from("messages")
      .insert({
        expediteur: utilisateur.id,
        destinataire,
        contenu
      })
      .select("id, expediteur, destinataire, contenu, created_at")
      .single();

    if (error) throw error;

    afficherMessage(data);
    champMessage.value = "";
    statutMessage.textContent = "";
  } catch (error) {
    statutMessage.textContent =
      "Impossible d'envoyer le message : " + error.message;
  } finally {
    bouton.disabled = false;
    champMessage.focus();
  }
});

async function demarrerMessagerie() {
  if (!(await verifierConnexion())) return;

  await chargerListeAmis();

  canalListe = client
    .channel("amis-messagerie-" + utilisateur.id)
    .on("postgres_changes", {
      event: "*",
      schema: "public",
      table: "demandes_amis"
    }, () => {
      chargerListeAmis();
    })
    .subscribe();
}

window.addEventListener("pagehide", () => {
  if (canalMessages) client.removeChannel(canalMessages);
  if (canalListe) client.removeChannel(canalListe);
});

demarrerMessagerie();
