const rechercheAmi = document.querySelector("#recherche-ami");
const boutonRecherche = document.querySelector("#bouton-recherche");
const resultatRecherche = document.querySelector("#resultat-recherche");
const listeAmis = document.querySelector("#liste-amis");
const demandesRecues = document.querySelector("#demandes-recues");
const historique = document.querySelector("#historique-messages");

let moi;
let canalAccueil;

function creerElement(tag, texte) {
  const element = document.createElement(tag);
  element.textContent = texte;
  return element;
}

function creerLienMessage(id, prenom) {
  const lien = document.createElement("a");
  lien.href = `Message.html?ami=${encodeURIComponent(id)}`;
  lien.textContent = `Écrire à ${prenom}`;
  return lien;
}

async function chargerProfil() {
  const { data: { user }, error } = await client.auth.getUser();

  if (error || !user) {
    window.location.href = "connexion.html";
    return false;
  }

  moi = user;

  const { data: profil, error: erreurProfil } = await client
    .from("profils")
    .select("prenom")
    .eq("id", moi.id)
    .single();

  if (erreurProfil) {
    alert("Impossible de charger ton profil : " + erreurProfil.message);
    return false;
  }

  document.querySelector("#mon-prenom").textContent = profil.prenom;
  return true;
}

async function chargerDemandes() {
  demandesRecues.replaceChildren();

  const { data, error } = await client
    .from("demandes_amis")
    .select("id, expediteur")
    .eq("destinataire", moi.id)
    .eq("statut", "en_attente");

  if (error) {
    console.error(error);
    return;
  }

  for (const demande of data) {
    const { data: profil } = await client
      .from("profils")
      .select("prenom")
      .eq("id", demande.expediteur)
      .single();

    if (!profil) continue;

    const li = document.createElement("li");
    li.append(creerElement("span", profil.prenom + " veut être ton ami "));

    const bouton = creerElement("button", "Accepter");
    bouton.type = "button";

    bouton.addEventListener("click", async () => {
      const { error } = await client
        .from("demandes_amis")
        .update({ statut: "acceptee" })
        .eq("id", demande.id)
        .eq("statut", "e  n_attente");

      if (error) {
        alert("Impossible d'accepter : " + error.message);
      } else {
        await chargerDemandes();
        await chargerAmis();
      }
    });

    li.append(bouton);
    demandesRecues.append(li);
  }
}

async function chargerAmis() {
  listeAmis.replaceChildren();

  const { data: demandes, error } = await client
    .from("demandes_amis")
    .select("expediteur, destinataire")
    .eq("statut", "acceptee")
    .or(`expediteur.eq.${moi.id},destinataire.eq.${moi.id}`);

  if (error) {
    console.error(error);
    return;
  }

  const ids = demandes.map(d =>
    d.expediteur === moi.id ? d.destinataire : d.expediteur
  );

  if (ids.length === 0) {
    listeAmis.append(creerElement("li", "Ajoute ton premier ami !"));
    historique.replaceChildren();
    return;
  }

  const { data: profils, error: erreurProfils } = await client
    .from("profils")
    .select("id, prenom")
    .in("id", ids);

  if (erreurProfils) {
    console.error(erreurProfils);
    return;
  }

  const derniersMessages = [];

  for (const ami of profils) {
    const li = document.createElement("li");
    li.append(creerElement("strong", ami.prenom + " "));
    li.append(creerLienMessage(ami.id, ami.prenom));
    listeAmis.append(li);

    const { data: messages, error: erreurMessages } = await client
      .from("messages")
      .select("expediteur, destinataire, contenu, created_at")
      .or(
        `and(expediteur.eq.${moi.id},destinataire.eq.${ami.id}),` +
        `and(expediteur.eq.${ami.id},destinataire.eq.${moi.id})`
      )
      .order("created_at", { ascending: false })
      .limit(1);

    if (erreurMessages) {
      console.error(erreurMessages);
      continue;
    }

    if (messages.length > 0) {
      derniersMessages.push({
        ami,
        message: messages[0]
      });
    }
  }

  historique.replaceChildren();

  derniersMessages.sort((a, b) =>
    new Date(b.message.created_at) - new Date(a.message.created_at)
  );

  for (const item of derniersMessages) {
    const li = document.createElement("li");
    const auteur = item.message.expediteur === moi.id ? "Toi : " : "";
    const apercu = item.message.contenu.length > 45
      ? item.message.contenu.slice(0, 45) + "…"
      : item.message.contenu;

    li.append(creerElement(
      "div",
      `${item.ami.prenom} — ${auteur}${apercu}`
    ));

    li.append(creerElement(
      "small",
      new Date(item.message.created_at).toLocaleString("fr-CA")
    ));

    li.append(creerLienMessage(item.ami.id, item.ami.prenom));
    historique.append(li);
  }

  if (derniersMessages.length === 0) {
    historique.append(creerElement("li", "Pas encore de messages."));
  }
}

boutonRecherche.addEventListener("click", async () => {
  const prenom = rechercheAmi.value.trim();

  if (!prenom) {
    resultatRecherche.textContent = "Entre un prénom.";
    return;
  }

  const { data: profils, error } = await client
    .from("profils")
    .select("id, prenom")
    .ilike("prenom", prenom)
    .neq("id", moi.id)
    .limit(10);

  if (error) {
    resultatRecherche.textContent = "Erreur : " + error.message;
    return;
  }

  resultatRecherche.replaceChildren();

  if (profils.length === 0) {
    resultatRecherche.textContent = "Aucun utilisateur trouvé.";
    return;
  }

  for (const profil of profils) {
    const bloc = document.createElement("div");
    bloc.append(creerElement("span", profil.prenom + " "));

    const bouton = creerElement("button", "Ajouter");
    bouton.type = "button";

    bouton.addEventListener("click", async () => {
      const { data: existantes, error: erreurLecture } = await client
        .from("demandes_amis")
        .select("id, statut")
        .or(
          `and(expediteur.eq.${moi.id},destinataire.eq.${profil.id}),` +
          `and(expediteur.eq.${profil.id},destinataire.eq.${moi.id})`
        );

      if (erreurLecture) {
        alert(erreurLecture.message);
        return;
      }

      if (existantes.length > 0) {
        alert("Une demande existe déjà ou vous êtes déjà amis.");
        return;
      }

      const { error } = await client
        .from("demandes_amis")
        .insert({
          expediteur: moi.id,
          destinataire: profil.id
        });

      if (error) {
        alert("Erreur : " + error.message);
      } else {
        bouton.disabled = true;
        bouton.textContent = "Demande envoyée";
      }
    });

    bloc.append(bouton);
    resultatRecherche.append(bloc);
  }
});

document.querySelector("#deconnexion").addEventListener("click", async () => {
  if (canalAccueil) await client.removeChannel(canalAccueil);

  const { error } = await client.auth.signOut();

  if (error) {
    alert(error.message);
  } else {
    window.location.href = "connexion.html";
  }
});

async function demarrer() {
  if (!(await chargerProfil())) return;

  await chargerDemandes();
  await chargerAmis();

  canalAccueil = client
    .channel("accueil-" + moi.id)
    .on("postgres_changes", {
      event: "*",
      schema: "public",
      table: "messages"
    }, async () => {
      await chargerAmis();
    })
    .on("postgres_changes", {
      event: "*",
      schema: "public",
      table: "demandes_amis"
    }, async () => {
      await chargerDemandes();
      await chargerAmis();
    })
    .subscribe();
}

demarrer();
