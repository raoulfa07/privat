const chapters = ["intro", "chat", "date", "moments", "ending", "coffee", "message", "home"];
const header = document.querySelector(".story-header");
const progressLabel = document.querySelector(".progress-label");
const progressSegments = [...document.querySelectorAll(".progress-track i")];
const xpPill = document.querySelector(".xp-pill");
const xpValue = xpPill.querySelector("b");
const awardStamp = document.querySelector(".award-stamp");
const revealButton = document.querySelector(".reveal-chat");
const chatMessages = [...document.querySelectorAll(".phone .message")];
const chapterAction = document.querySelector(".chapter-action");
const firstDays = document.querySelector(".first-days");
const routeButton = document.querySelector(".route-button");
const routeMap = document.querySelector(".route-map");
const afterDate = document.querySelector(".after-date");
const apartment = document.querySelector(".apartment");
const homeHeading = document.querySelector(".home-heading");
const prototypeNote = document.querySelector(".prototype-note");
const roomDetail = document.querySelector(".room-detail");
const roomMemoryGrid = document.querySelector(".room-memory-grid");
const roomExtra = document.querySelector(".room-extra");
const memoryDialog = document.querySelector(".memory-dialog");
const groceryDialog = document.querySelector(".grocery-dialog");
const householdDialog = document.querySelector(".household-dialog");
const galleryDialog = document.querySelector(".gallery-dialog");
const groceryForm = document.querySelector(".grocery-form");
const householdForm = document.querySelector(".household-form");
const galleryForm = document.querySelector(".gallery-form");
const groceryList = document.querySelector(".grocery-list");
const householdList = document.querySelector(".household-list");
const galleryList = document.querySelector(".gallery-list");
const groceryCount = document.querySelector(".grocery-open-count");
const householdCount = document.querySelector(".household-open-count");
const galleryCount = document.querySelector(".gallery-count");
const photoInput = householdForm.querySelector('input[name="photo"]');
const photoPreview = householdForm.querySelector(".photo-preview");
const householdSubmit = householdForm.querySelector('button[type="submit"]');
const householdFormStatus = householdForm.querySelector(".household-form-status");
const galleryInput = galleryForm.querySelector('input[name="photos"]');
const galleryPreview = galleryForm.querySelector(".gallery-preview");
const gallerySubmit = galleryForm.querySelector('button[type="submit"]');
const galleryFormStatus = galleryForm.querySelector(".gallery-form-status");
const gallerySort = galleryDialog.querySelector(".gallery-sort");
const gallerySortLabel = gallerySort.closest("label");
const galleryViewButtons = [...galleryDialog.querySelectorAll("[data-gallery-view]")];
const galleryMapWrap = galleryDialog.querySelector(".gallery-map-wrap");
const galleryMapElement = galleryDialog.querySelector(".gallery-map");
const galleryMapNote = galleryDialog.querySelector(".gallery-map-note");
const dailyMemory = document.querySelector(".daily-memory");
const dailyMemoryImage = dailyMemory.querySelector("img");
const dailyMemoryTitle = dailyMemory.querySelector(".daily-memory-title");
const dailyMemoryMeta = dailyMemory.querySelector(".daily-memory-meta");
const photoDialog = document.querySelector(".photo-dialog");

let current = 0;
let shownMessages = 1;
let storyProgress = readStoryProgress();
let groceryItems = [];
let householdItems = [];
let galleryItems = [];
let homeEvents = null;
let homeRetryTimer = null;
let stampTimer;
let galleryView = "wall";
let galleryMap = null;
let galleryMapMarkers = null;
let galleryMapSignature = "";
let leafletPromise = null;
let dailyMemoryPickCurrent = null;
const roomData = {
  kitchen: {
    kicker: "Der Raum, in dem fast alles beginnt",
    title: "Küche",
    symbol: "☕",
    color: "#ead7be",
    intro: "Erst Filterkaffee, später Risotto, Dönerlisten und die Frage, wer noch etwas aus dem Hit braucht. Eure Küche erzählt Fürsorge meistens in essbarer Form.",
    fact: ["Eure kulinarische Konstante", "Kaffee, Döner und die sehr ernsthafte Suche nach dem nächsten Essen."],
    memories: [
      { date: "31. Januar 2025", title: "Der Kaffee-Kompatibilitätstest", teaser: "Noch vor dem ersten Date wurden die wirklich wichtigen Dinge geklärt.", author: "Charleen · 15:40 Uhr", quote: "Ich trinke am liebsten Filterkaffee mit einem Schuss Milch. Von Cappuccino und so weiter bin ich auch gar nicht so ein großer Fan 🙊 ein Schuss Leitungswasser im Kaffee klingt schon etwas abschreckend😜, aber dadurch nicht weniger sympathisch😌", note: "Leitungswasser im Kaffee war offenbar kein Ausschlusskriterium. Das war rückblickend hilfreich." },
      { date: "17. September 2025", title: "Erster richtiger Kochversuch", teaser: "Aus Essen verabreden wurde füreinander kochen.", author: "Charleen · 11:54 Uhr", quote: "Ich Glaub, ich will heute „richtig“ kochen wollen. Hab Risotto überlegt 🤨", note: "Später nannte Charleen es ihren gefühlt ersten richtigen Kochversuch in dieser Küche." },
      { date: "30. Dezember 2025", title: "Acht neue Döner", teaser: "Ein Jahresziel, das realistische Prioritäten setzt.", author: "Charleen · 19:34 Uhr", quote: "Gemeinsam Kochen\n…\n8 neue Döner testen\n4 donnerstags-Dates", note: "Die gemeinsame Jahresliste verbindet große Pläne zuverlässig mit gutem Essen." },
      { date: "8. Juni 2026", title: "Katerbauch-Wünsche", teaser: "Liebe kann auch ein spontaner Einkauf im Hit sein.", author: "Raoul · 15:49 Uhr", quote: "Fühle ich 😂 könnte heute auch alles essen, falls du noch Wünsche aus dem Hit hast, erfülle ich sehr gerne Katerbauch wünsche :))", note: "Der aktuelle Stand eurer Liebessprache: aufmerksam, praktisch und meistens nicht weit vom nächsten Supermarkt entfernt." }
    ]
  },
  animals: {
    kicker: "Drei Tiere, sehr viele Regeln",
    title: "Tierecke",
    symbol: "🐾",
    color: "#dfc7c7",
    intro: "Frieda, Neo und Finn waren nie nur Begleitung. Über Füttern, Tierarzt, Spaziergänge und nächtliches Chaos seid ihr früh zu einer kleinen Familie geworden.",
    fact: ["Der inoffizielle Familienbetrieb", "Getrennt füttern. Auf Finn achten. Frieda nicht unterschätzen."],
    memories: [
      { date: "25. Februar 2025", title: "Frieda ist schon Fan", teaser: "Manche Familienmitglieder entscheiden schneller als Menschen.", author: "Raoul · 14:59 Uhr", quote: "Frieda ist auf jeden Fall auch schon Fan von dir, habe ich noch nie erlebt, dass die weint wenn die jemanden das erste Mal gesehen hat und die Person dann geht", note: "Noch bevor der Funke offiziell fehlte, hatte Frieda ihre Meinung offenbar längst gebildet." },
      { date: "8. August 2025", title: "Der Fütterungsleitfaden", teaser: "Eine Anleitung, die Raoul nach eigener Aussage nicht brauchte.", author: "Charleen · 10:15 Uhr", quote: "Schlüssel hängt an deinem Schlüsselbund. Mikrowelle steht in der Küche wenn du reinkommst links hinten in der Ecke. An der Tür etwas ziehen. Wasser einfach einschätzen, da gibt’s keinen Richtwert. Getrennt füttern, auf Finn achten, dass er nicht an Neos Essen geht :D so, detaillierter gibt es glaub ich nicht 😜😂😂 und ich weiß, dass du nichts von den Infos brauchst 🫶🏽", note: "Spätestens hier war aus Besuch Verantwortung im gemeinsamen Alltag geworden." },
      { date: "17. September 2025", title: "Gras-Kotze, morgens", teaser: "Romantik, aber ehrlich.", author: "Raoul · 07:11 Uhr", quote: "Pass beim aufstehen auf! Da war noch etwas Gras Kotze, bin durchgelaufen heute Morgen hahsh", note: "Ein Zuhause ist auch der Ort, an dem jemand vor dem Aufstehen vor der nächsten Katastrophe warnt." },
      { date: "27. Mai 2026", title: "Finn-Bro-Status", teaser: "Eine inzwischen fest etablierte Rolle.", author: "Charleen · 16:58 Uhr", quote: "Uuund: Essen von Neo und Finn steht im Kühlschrank . Das ist einfach immer noch das Frühstück 🫪 magst du nachher wieder deinen „Finn-Bro-Status“ ausnutzen?", note: "Die Tierecke hat längst eigene Beziehungen, Zuständigkeiten und Titel hervorgebracht." }
    ]
  },
  living: {
    kicker: "Sofa, Bildschirm, Puzzleteile",
    title: "Wohnzimmer",
    symbol: "▱",
    color: "#cdd7ca",
    intro: "Hier geht es weniger darum, einen Film wirklich zu Ende zu schauen. Es geht um gemeinsame Abende, Aufmerksamkeit, Me-Time und die Kunst, auch nebeneinander zur Ruhe zu kommen.",
    fact: ["Euer bevorzugtes Abendformat", "Serie, Snacks und mindestens eine Person, die nicht mehr ganz aufmerksam ist."],
    memories: [
      { date: "25. Mai 2025", title: "Serien oder Filme?", teaser: "Eine Grundsatzfrage mit überraschend klarem Ausgang.", author: "Charleen & Raoul · 17:55–17:57 Uhr", quote: "Charleen: Serien oder Filme?\n\nRaoul: Ich möchte Filme sagen , bin aber leider bei Serie 🥲\n\nCharleen: Hätte ich auch gesagt. Davon hat man länger was😅\nDa fällt mir ein… Wir könnten eigentlich auch mal ne Serie zusammen anfangen.", note: "Eine Grundsatzfrage, aus der direkt ein gemeinsamer Plan wurde." },
      { date: "12. Juli 2025", title: "Puzzle-Arbeit", teaser: "Noch bevor das erste große Puzzle einzog.", author: "Charleen · 14:07 Uhr", quote: "Aber ich mochte gerne die Puzzle Arbeit übernehmen\nDas ist bestimmt auch voll gut nebenbei bei einer Serie 😻", note: "Später wurden aus einzelnen Puzzleteilen Tagesziele und aus dem Sofa ein ziemlich ernsthafter Arbeitsplatz." },
      { date: "16. September 2025", title: "Quality Time", teaser: "Nicht nur zusammen sein, sondern entspannt zusammen sein.", author: "Raoul · 16:00 Uhr", quote: "Ich habe auch mal überlegt, was meine Bedürfnisse sind und da zählt halt auch definitiv zu, dass wir quality time zu zweit haben und das ist nur möglich, wenn wir beide entspannt sind und uns auch aufeinander freuen können, deshalb würde ich das mit dem Büro mal gerne versuchen…", note: "Das Wohnzimmer steht deshalb nicht für Dauer-Nähe, sondern für bewusst gemeinsame Zeit." },
      { date: "19. Mai 2026", title: "Donnerstags-Doku", teaser: "Eine neue Tradition kündigt sich an.", author: "Raoul · 22:26 Uhr", quote: "Donnerstags Doku klingt fast nach einer Tradition 😂😂", note: "Die beste Sorte Tradition entsteht bei euch offenbar beiläufig mitten im Gespräch." }
    ]
  },
  hallway: {
    kicker: "Aus zwei Schlüsseln wird ein Zuhause",
    title: "Flur",
    symbol: "⌕",
    color: "#e6ded0",
    intro: "Im Flur liegen Schlüssel, Einkaufstaschen und die Grenze zwischen Besuch und Zuhause. Bei euch wurde diese Grenze erstaunlich schnell immer unwichtiger.",
    fact: ["Der größte kleine Satz", "Nicht mehr deine oder meine Wohnung, sondern irgendwann ganz selbstverständlich unsere."],
    memories: [
      { date: "17. Juli 2025", title: "Meine Freundin", teaser: "Der neue Status tauchte fast beiläufig im Chat auf.", author: "Raoul · 19:35 Uhr", quote: "Hab ja schon den Freitag mit meiner Freundin alleine für mich höhö", note: "Am selben Tag wurdet ihr euch sicher und dachtet bereits laut über eine gemeinsame Wohnung nach." },
      { date: "17. Juli 2025", title: "Gemeinsame Möbel", teaser: "Von Beziehung direkt zu Sofa und Bett.", author: "Charleen · 21:23 Uhr", quote: "Oha gerade Feier ich es dass ich noch ein paar Urlaubstage übrig habe. Sehe uns schon im\nIkea - dieses Mal\nFür gemeinsame Möbel 😍", note: "Raouls Antwort: eigenes Sofa und Bett erstmal. Ein erstaunlich schneller, aber sehr konkreter Zukunftsentwurf." },
      { date: "8. August 2025", title: "Der Schlüsselbund", teaser: "Kein feierlicher Moment. Einfach bereits normal.", author: "Charleen · 10:15 Uhr", quote: "Schlüssel hängt an deinem Schlüsselbund.", note: "Ein kurzer Satz, in dem der Übergang von Gast zu Zuhause praktisch schon abgeschlossen war." },
      { date: "18. September 2025", title: "Halbe Miete", teaser: "Romantik trifft Dauerauftrag.", author: "Charleen · 08:15 Uhr", quote: "Etwas unangenehm zu fragen.. aber hattest du die halbe Miete schon überwiesen?🤔", note: "Noch am selben Nachmittag schrieb Charleen von Dingen für „unsere Wohnung“. Offizieller wird gemeinsamer Alltag kaum." }
    ]
  },
  projects: {
    kicker: "Nur kurz etwas erledigen",
    title: "Projekte",
    symbol: "⌁",
    color: "#d8cfc2",
    intro: "Eine Spülmaschine, Billyregale, ein Leon und sehr viele Fahrten zu IKEA oder Action: Gemeinsam planen heißt bei euch meistens, dass daraus direkt ein echtes Projekt wird.",
    fact: ["Euer Projektmodus", "Erst recherchieren. Dann messen. Dann nochmal zu IKEA. Danach fehlen Schwämme."],
    memories: [
      { date: "21. Juli 2025", title: "Es ist der Leon geworden", teaser: "Charleen war bereits Teil der Autosuche.", author: "Raoul · 15:31 Uhr", quote: "Hahaha offene Wunde 😂 es ist der Leon geworden 🥲 muss jetzt gleich noch alle Dokumente hochladen, das nervt mich unfassbar hahaha\n\nDie Farbe ist zwar blöd, Aber Tobi hatte bei dem 1er noch einen Punkt mit den Vorbesitzern und die Ausstattung ist doch schlechter als der Leon und dazu noch teurer. Jetzt hast du einen Freund mit hässlichem Auto 😜 aber ich bin glaube ich zufrieden.", note: "Davor hatte Charleen bereits Links zu mehreren Leon-Kombis geschickt. Entscheidungen wurden längst gemeinsam getroffen." },
      { date: "1. August 2025", title: "IKEA statt Schwimmen", teaser: "Die Küche gewinnt gegen den freien Tag.", author: "Charleen · 10:24 Uhr", quote: "Haha😂 also nachdem ich heute schon 3x nass geworden bin, wäre ich auch eher für Ikea. Hab so Lust, dass alles schon „steht“😻", note: "Am Vorabend war vorsorglich sogar schon ausgemessen worden, wie breit das neue Regal sein darf." },
      { date: "21. September 2025", title: "Spülmaschinen-Infrastruktur", teaser: "Leitungen, Fußleiste und Silikon.", author: "Raoul · 11:57 Uhr", quote: "Ich hab gerade die Spülmaschinen Leitungen neu verlegt, Fußleiste ist dran und Silikon gezogen 💪", note: "Die Spülmaschine entwickelte sich zu einem eigenen Kapitel mit Lieferung, Anschluss und Abdeckung." },
      { date: "8. Juni 2026", title: "Unser Ukraine-Projekt", teaser: "Gemeinsame Projekte reichen inzwischen weit über die Wohnung hinaus.", author: "Raoul · 12:55 Uhr", quote: "Habe 5kg Material für unser Ukraine Projekt gekauft 💪", note: "Und kurz danach fehlte natürlich trotzdem noch irgendetwas für die Spülmaschine." }
    ]
  },
  future: {
    kicker: "Noch nicht fertig eingerichtet",
    title: "Was vor uns liegt",
    symbol: "↗",
    color: "#c99a9f",
    intro: "Dieser Raum bleibt absichtlich offen. Einige Dinge sind schon gebucht, andere nur eine Idee, und manches wird später eine Erinnerung, von der heute noch niemand weiß.",
    fact: ["Kein Schlusskapitel", "Nur der aktuelle Stand einer Geschichte, die weitergeschrieben wird."],
    memories: [
      { date: "30. Dezember 2025", title: "Die Liste für 2026", teaser: "Große Pläne, kleine Rituale und sehr viel Persönlichkeit.", author: "Charleen · 19:34 Uhr", quote: "Urlaub in Spanien\nEinen Städtetrip\n…\n8 neue Döner testen\n…\n12 Fotos von uns\nEine Neue Tradition einführen\nHeißluftballonfahrt\nCandle-Light-Döner mit Oma und Opa", note: "Die vollständige Liste kannst du weiter unten im Raum abhaken." },
      { date: "2. März 2026", title: "Großes Vertrauen", teaser: "Zukunft wurde längst mehr als eine Reiseplanung.", author: "Charleen · 13:19 Uhr", quote: "Ich hätte ihm vermutlich gesagt, dass ich gerade meine Zukunft mit dir plane und in gewisser Weise sogar Existeniell/beruflich von dir abhängig mache, weil er - wie auch immer aus so jemanden sowas resultieren kann - vor 33 Jahren ausnahmsweise sehr sehr tolle und wertvolle Arbeit geleistet hat.\nUnd ich hab großes Vertrauen in uns. Wirklich.", note: "Zu dieser Zeit wurden aus Wohnungsanzeigen bereits ernsthafte gemeinsame Hauspläne." },
      { date: "2. April 2026", title: "Albanien-Überraschung", teaser: "Gleiche Route, getrennte Geheimnisse.", author: "Charleen · 18:02 Uhr", quote: "Wenn unsere Albanien-Route grob steht, buchen wir dann jeweils eine Unterkunft, ohne dass der andere davon weiß?😎 also Ort legen wir fest", note: "Raouls Antwort bestand aus einem einfachen, doppelten Deal." },
      { date: "9. Mai 2026", title: "Drei einfache Worte", teaser: "Ohne Inszenierung, mitten in einem normalen Tag.", author: "Charleen · 15:34 Uhr", quote: "Ich liebe dich!", note: "Raoul antwortete fünf Minuten später: „Ich dich auch!“" }
    ],
    goals: ["Urlaub in Spanien", "Einen Städtetrip", "2 Bücher lesen", "Gemeinsam Kochen", "Peking Ente essen gehen", "5 Filme durchgucken", "Too Good to Go - Bestellung", "Kulturveranstaltung besuchen", "8 neue Döner testen", "4 donnerstags-Dates", "Teilnahme bei Rudi rockt", "Trüffel finden mit Frida", "1x ins Kino gehen", "Nicht umziehen", "5x Neotaste nutzen", "1x Flaschenpost-Lieferung", "Eine Sportliche Aktivität", "Einen Altstadt-Abend", "Eine Paar-Massage", "Nicht schwanger werden", "MegaMarsch-Teilnahme", "12 Fotos von uns", "Eine Neue Tradition einführen", "Heißluftballonfahrt", "Candle-Light-Döner mit Oma und Opa"]
  }
};

function showChapter(target) {
  const index = typeof target === "number" ? target : chapters.indexOf(target);
  if (index < 0 || index >= chapters.length) return;

  current = index;
  if (chapters[current] !== "home") closeRoom(false);
  document.querySelectorAll(".chapter").forEach((chapter) => {
    chapter.classList.toggle("is-active", chapter.dataset.chapter === chapters[current]);
  });

  header.hidden = current === 0;
  progressLabel.textContent = `Kapitel ${Math.min(current, 6)} von 6`;
  progressSegments.forEach((segment, index) => {
    segment.classList.toggle("is-done", index < current - 1);
    segment.classList.toggle("is-active", index === current - 1);
  });
  if (chapters[current] === "coffee") {
    award("coffee", 20, "Kumpel-Kaffee angeboten");
  }
  window.scrollTo({ top: 0, behavior: "instant" });
  history.replaceState(null, "", current ? `#${chapters[current]}` : location.pathname);
}

document.querySelectorAll("[data-next]").forEach((button) => {
  button.addEventListener("click", () => showChapter(current + 1));
});

document.querySelectorAll("[data-go]").forEach((button) => {
  button.addEventListener("click", () => showChapter(button.dataset.go));
});

revealButton.addEventListener("click", () => {
  if (shownMessages >= chatMessages.length) return;
  const message = chatMessages[shownMessages];
  message.hidden = false;
  message.classList.add("is-visible");
  shownMessages += 1;

  if (shownMessages === chatMessages.length) {
    revealButton.hidden = true;
    firstDays.hidden = false;
    chapterAction.hidden = false;
    award("first-chat", 10, "Erstes Date verabredet");
  } else {
    message.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }
});

routeButton.addEventListener("click", () => {
  if (routeMap.classList.contains("is-riding")) return;
  routeMap.classList.add("is-riding");
  routeButton.disabled = true;
  routeButton.textContent = "S6 statt N85 …";

  window.setTimeout(() => {
    afterDate.hidden = false;
    award("altenberge", 15, "In Altenberge gestrandet");
    afterDate.scrollIntoView({ block: "start", behavior: "smooth" });
  }, window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 50 : 2300);
});

function readStoryProgress() {
  try {
    const saved = JSON.parse(localStorage.getItem("charleen-raoul-story-progress") || "{}");
    return {
      points: Number.isFinite(saved.points) ? saved.points : 0,
      awards: Array.isArray(saved.awards) ? saved.awards : []
    };
  } catch {
    return { points: 0, awards: [] };
  }
}

function saveStoryProgress() {
  try {
    localStorage.setItem("charleen-raoul-story-progress", JSON.stringify(storyProgress));
  } catch {
    // The story remains fully usable if browser storage is unavailable.
  }
}

function showStamp(label, detail) {
  window.clearTimeout(stampTimer);
  awardStamp.innerHTML = `${label}<b>${detail}</b>`;
  awardStamp.hidden = false;
  awardStamp.style.animation = "none";
  awardStamp.offsetHeight;
  awardStamp.style.animation = "";
  stampTimer = window.setTimeout(() => {
    awardStamp.hidden = true;
  }, window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 100 : 2000);
}

function renderPoints() {
  xpValue.textContent = storyProgress.points;
  xpPill.hidden = storyProgress.points === 0;
}

function award(id, points, label) {
  if (storyProgress.awards.includes(id)) return;
  storyProgress.awards.push(id);
  storyProgress.points += points;
  saveStoryProgress();
  renderPoints();

  showStamp(label, `+${points} XP`);
}

function createEmptyState(text) {
  const empty = document.createElement("p");
  empty.className = "tool-empty";
  empty.textContent = text;
  return empty;
}

async function apiRequest(url, options = {}) {
  const response = await fetch(url, {
    credentials: "same-origin",
    cache: "no-store",
    ...options,
    headers: options.body instanceof FormData
      ? options.headers
      : { "Content-Type": "application/json", ...(options.headers || {}) },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || "Das hat gerade nicht funktioniert.");
    error.status = response.status;
    throw error;
  }
  return data;
}

async function runHomeAction(action) {
  try {
    return await action();
  } catch (error) {
    showStamp("Das ging gerade nicht", error.message);
    return null;
  }
}

function setHomeState(home) {
  groceryItems = Array.isArray(home.grocery) ? home.grocery : [];
  householdItems = Array.isArray(home.household) ? home.household : [];
  galleryItems = Array.isArray(home.gallery) ? home.gallery : [];
  renderGroceryItems();
  renderHouseholdItems();
  renderGalleryItems();
  renderDailyMemory();
}

async function loadHome() {
  try {
    const home = await apiRequest("/api/home");
    setHomeState(home);
    connectHomeEvents();
    return true;
  } catch (error) {
    showStamp("Verbindung unterbrochen", "Wir versuchen es gleich erneut");
    return false;
  }
}

function connectHomeEvents() {
  if (location.hostname !== "localhost" && location.hostname !== "127.0.0.1") {
    window.clearTimeout(homeRetryTimer);
    homeRetryTimer = window.setTimeout(loadHome, 15000);
    return;
  }

  if (homeEvents) homeEvents.close();
  homeEvents = new EventSource("/api/home/events");
  homeEvents.addEventListener("homeUpdated", (event) => {
    setHomeState(JSON.parse(event.data));
  });
  homeEvents.addEventListener("error", () => {
    homeEvents.close();
    homeEvents = null;
    window.clearTimeout(homeRetryTimer);
    homeRetryTimer = window.setTimeout(loadHome, 5000);
  });
}

async function openTool(tool) {
  await loadHome();
  const dialog = {
    grocery: groceryDialog,
    household: householdDialog,
    gallery: galleryDialog,
  }[tool];
  if (!dialog) return;
  dialog.showModal();
  if (tool === "gallery" && galleryView === "map") {
    renderGalleryMap().catch((error) => showStamp("Karte gerade nicht verfügbar", error.message));
  }
}

async function migrateLocalItems() {
  let localGrocery = [];
  let localHousehold = [];
  try {
    localGrocery = JSON.parse(localStorage.getItem("charleen-raoul-grocery-items") || "[]");
    localHousehold = JSON.parse(localStorage.getItem("charleen-raoul-household-items") || "[]");
  } catch {
    return;
  }

  for (const item of localGrocery.filter((entry) => !entry.done)) {
    await apiRequest("/api/home/grocery", {
      method: "POST",
      body: JSON.stringify({ name: item.name, amount: item.amount, priority: item.priority }),
    });
  }
  for (const item of localHousehold.filter((entry) => !entry.done)) {
    const data = new FormData();
    data.set("task", item.task);
    data.set("room", item.room);
    data.set("tone", item.tone);
    if (item.photo?.startsWith("data:")) {
      const photoBlob = await fetch(item.photo).then((response) => response.blob());
      data.set("photo", photoBlob, "pinnwand-foto.jpg");
    }
    await apiRequest("/api/home/household", { method: "POST", body: data });
  }
  localStorage.removeItem("charleen-raoul-grocery-items");
  localStorage.removeItem("charleen-raoul-household-items");
}

function renderGroceryItems() {
  groceryList.replaceChildren();
  const openItems = groceryItems.filter((item) => !item.done);
  groceryCount.textContent = openItems.length;
  if (!groceryItems.length) {
    groceryList.append(createEmptyState("Die Liste ist leer. Das ist entweder sehr gut oder sehr verdächtig."));
    return;
  }

  groceryItems.forEach((item) => {
    const card = document.createElement("article");
    card.className = `tool-item grocery-item${item.done ? " is-done" : ""}`;

    const check = document.createElement("button");
    check.type = "button";
    check.className = "item-check";
    check.setAttribute("aria-label", item.done ? `${item.name} wieder öffnen` : `${item.name} als gekauft markieren`);
    check.textContent = item.done ? "✓" : "";
    check.addEventListener("click", () => runHomeAction(async () => {
      const nextDone = !item.done;
      const updated = await apiRequest(`/api/home/grocery/${encodeURIComponent(item.id)}`, {
        method: "PATCH",
        body: JSON.stringify({ done: nextDone, item }),
      });
      groceryItems = groceryItems.map((entry) => entry.id === updated.id ? updated : entry);
      renderGroceryItems();
      if (nextDone) showStamp("Im Hit gefunden", item.name);
    }));

    const copy = document.createElement("div");
    const priority = document.createElement("span");
    priority.className = `item-tag priority-${item.priority}`;
    priority.textContent = {
      wish: "Wäre schön",
      needed: "Wirklich nötig",
      kater: "Katerbauch"
    }[item.priority] || "Wunsch";
    const title = document.createElement("strong");
    title.textContent = item.name;
    const amount = document.createElement("small");
    amount.textContent = item.amount || "Menge nach Gefühl";
    copy.append(priority, title, amount);

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "item-remove";
    remove.setAttribute("aria-label", `${item.name} löschen`);
    remove.textContent = "×";
    remove.addEventListener("click", () => runHomeAction(async () => {
      await apiRequest(`/api/home/grocery/${encodeURIComponent(item.id)}`, {
        method: "DELETE",
        body: JSON.stringify({}),
      });
      groceryItems = groceryItems.filter((entry) => entry.id !== item.id);
      renderGroceryItems();
    }));

    card.append(check, copy, remove);
    groceryList.append(card);
  });
}

function renderHouseholdItems() {
  householdList.replaceChildren();
  const openItems = householdItems.filter((item) => !item.done);
  householdCount.textContent = openItems.length;
  if (!householdItems.length) {
    householdList.append(createEmptyState("Keine Fundstücke. Raoul ist entweder vorbildlich oder Charleen hat noch kein Foto gemacht."));
    return;
  }

  householdItems.forEach((item) => {
    const card = document.createElement("article");
    card.className = `tool-item household-item${item.done ? " is-done" : ""}`;
    if (item.photo) {
      const image = document.createElement("img");
      image.src = item.photo;
      image.alt = `Beweisfoto: ${item.task}`;
      card.append(image);
    }

    const copy = document.createElement("div");
    copy.className = "household-copy";
    const meta = document.createElement("span");
    meta.className = "item-tag";
    meta.textContent = `Tatort: ${item.room}`;
    const title = document.createElement("strong");
    title.textContent = item.task;
    const tone = document.createElement("blockquote");
    tone.textContent = `„${item.tone}“`;
    copy.append(meta, title, tone);

    const actions = document.createElement("div");
    actions.className = "item-actions";
    const solve = document.createElement("button");
    solve.type = "button";
    solve.className = "solve-button";
    solve.textContent = item.done ? "Wieder öffnen" : "Problem heldenhaft gelöst";
    solve.addEventListener("click", () => runHomeAction(async () => {
      const nextDone = !item.done;
      const updated = await apiRequest(`/api/home/household/${encodeURIComponent(item.id)}`, {
        method: "PATCH",
        body: JSON.stringify({ done: nextDone, item }),
      });
      householdItems = householdItems.map((entry) => entry.id === updated.id ? updated : entry);
      renderHouseholdItems();
      if (nextDone) showStamp("Haushaltsheld des Tages", "+10 gute Laune");
    }));
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "item-remove";
    remove.setAttribute("aria-label", `${item.task} löschen`);
    remove.textContent = "×";
    remove.addEventListener("click", () => runHomeAction(async () => {
      await apiRequest(`/api/home/household/${encodeURIComponent(item.id)}`, {
        method: "DELETE",
        body: JSON.stringify({ photo: item.photo }),
      });
      householdItems = householdItems.filter((entry) => entry.id !== item.id);
      renderHouseholdItems();
    }));
    actions.append(solve, remove);
    card.append(copy, actions);
    householdList.append(card);
  });
}

function galleryTimestamp(item, field) {
  const value = Date.parse(item[field] || "");
  return Number.isFinite(value) ? value : 0;
}

function toDateTimeLocal(value) {
  const date = new Date(value || "");
  if (Number.isNaN(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function renderGalleryItems() {
  if (galleryView === "map" && galleryDialog.open) {
    renderGalleryMap().catch(() => {});
  }
  galleryList.replaceChildren();
  galleryCount.textContent = galleryItems.length;

  if (!galleryItems.length) {
    galleryList.append(createEmptyState("Noch ist die Fotowand leer. Zeit für das erste Bild zwischen Kumpel-Kaffee und Rippchen."));
    return;
  }

  const items = [...galleryItems].sort((a, b) => {
    if (gallerySort.value === "oldest") return galleryTimestamp(a, "takenAt") - galleryTimestamp(b, "takenAt");
    if (gallerySort.value === "place") return String(a.location || "").localeCompare(String(b.location || ""), "de");
    if (gallerySort.value === "uploaded") return galleryTimestamp(b, "createdAt") - galleryTimestamp(a, "createdAt");
    return galleryTimestamp(b, "takenAt") - galleryTimestamp(a, "takenAt");
  });

  items.forEach((item) => {
    const card = document.createElement("article");
    card.className = "gallery-card";

    const image = document.createElement("img");
    image.src = item.photo;
    image.alt = item.caption || `Erinnerungsfoto${item.location ? ` aus ${item.location}` : ""}`;
    image.loading = "lazy";

    const fields = document.createElement("div");
    fields.className = "gallery-card-fields";
    const captionLabel = document.createElement("label");
    captionLabel.textContent = "Erlebnis";
    const caption = document.createElement("input");
    caption.maxLength = 140;
    caption.value = item.caption || "";
    caption.placeholder = "Was war das für ein Moment?";
    captionLabel.append(caption);

    const dateLabel = document.createElement("label");
    dateLabel.textContent = "Aufgenommen";
    const takenAt = document.createElement("input");
    takenAt.type = "datetime-local";
    takenAt.value = toDateTimeLocal(item.takenAt);
    dateLabel.append(takenAt);

    const placeLabel = document.createElement("label");
    placeLabel.textContent = "Ort";
    const location = document.createElement("input");
    location.maxLength = 100;
    location.value = item.location || "";
    location.placeholder = "Ort ergänzen";
    placeLabel.append(location);
    fields.append(captionLabel, dateLabel, placeLabel);

    const meta = document.createElement("div");
    meta.className = "gallery-card-meta";
    meta.textContent = item.metadataSource === "exif"
      ? "Datum und Ort aus den Fotodaten gelesen."
      : "Metadaten unvollständig – du kannst sie oben ergänzen.";

    const actions = document.createElement("div");
    actions.className = "gallery-card-actions";
    const save = document.createElement("button");
    save.type = "button";
    save.className = "gallery-save";
    save.textContent = "Angaben speichern";
    save.addEventListener("click", () => runHomeAction(async () => {
      const updated = await apiRequest(`/api/home/gallery/${encodeURIComponent(item.id)}`, {
        method: "PATCH",
        body: JSON.stringify({
          item,
          caption: caption.value.trim(),
          location: location.value.trim(),
          takenAt: takenAt.value ? new Date(takenAt.value).toISOString() : "",
        }),
      });
      galleryItems = galleryItems.map((entry) => entry.id === updated.id ? updated : entry);
      renderGalleryItems();
      showStamp("Fotowand aktualisiert", updated.location || "Moment gespeichert");
    }));

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "gallery-delete";
    remove.textContent = "Löschen";
    remove.addEventListener("click", () => runHomeAction(async () => {
      await apiRequest(`/api/home/gallery/${encodeURIComponent(item.id)}`, {
        method: "DELETE",
        body: JSON.stringify({ photo: item.photo }),
      });
      galleryItems = galleryItems.filter((entry) => entry.id !== item.id);
      renderGalleryItems();
    }));

    actions.append(save, remove);
    card.append(image, fields, meta, actions);
    galleryList.append(card);
  });
}

function loadLeaflet() {
  if (window.L) return Promise.resolve();
  if (!leafletPromise) {
    leafletPromise = new Promise((resolve, reject) => {
      const styles = document.createElement("link");
      styles.rel = "stylesheet";
      styles.href = "./vendor/leaflet/leaflet.css?v=1.9.4";
      document.head.append(styles);
      const script = document.createElement("script");
      script.src = "./vendor/leaflet/leaflet.js?v=1.9.4";
      script.addEventListener("load", () => resolve());
      script.addEventListener("error", () => {
        leafletPromise = null;
        reject(new Error("Die Karte lässt sich gerade nicht laden."));
      });
      document.head.append(script);
    });
  }
  return leafletPromise;
}

function formatMemoryDate(value) {
  const date = new Date(value || "");
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("de-DE", { day: "numeric", month: "long", year: "numeric" });
}

function galleryMapGroups() {
  const groups = new Map();
  galleryItems.forEach((item) => {
    const latitude = Number(item.latitude);
    const longitude = Number(item.longitude);
    if (item.latitude === null || item.latitude === undefined || item.latitude === "") return;
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;
    if (!latitude && !longitude) return;
    const key = `${latitude.toFixed(3)},${longitude.toFixed(3)}`;
    if (!groups.has(key)) groups.set(key, { latitude, longitude, items: [] });
    groups.get(key).items.push(item);
  });
  return [...groups.values()];
}

function buildMapPopup(group) {
  const wrap = document.createElement("div");
  wrap.className = "map-popup";
  const items = [...group.items].sort((a, b) => galleryTimestamp(b, "takenAt") - galleryTimestamp(a, "takenAt"));
  const place = document.createElement("strong");
  place.textContent = items.find((item) => item.location)?.location || "Ein gemeinsamer Ort";
  wrap.append(place);
  items.forEach((item) => {
    const figure = document.createElement("figure");
    const image = document.createElement("img");
    image.src = item.photo;
    image.alt = item.caption || "Erinnerungsfoto";
    image.loading = "lazy";
    const caption = document.createElement("figcaption");
    caption.textContent = [item.caption, formatMemoryDate(item.takenAt)].filter(Boolean).join(" · ");
    figure.append(image, caption);
    wrap.append(figure);
  });
  return wrap;
}

async function renderGalleryMap() {
  const groups = galleryMapGroups();
  const located = groups.reduce((sum, group) => sum + group.items.length, 0);
  const missing = galleryItems.length - located;
  if (!galleryItems.length) {
    galleryMapNote.textContent = "Noch hängt nichts an der Wand – und damit auch nichts auf der Karte.";
  } else if (!located) {
    galleryMapNote.textContent = "Noch verrät kein Foto seinen Ort. Original-Fotos statt Messenger-Versionen bringen die Pins gleich mit.";
  } else if (missing > 0) {
    galleryMapNote.textContent = `${located} von ${galleryItems.length} Fotos kennen ihren Ort – der Rest hängt nur an der Wand.`;
  } else {
    galleryMapNote.textContent = "Jeder Pin ein Ort, an dem wir es schön hatten.";
  }

  await loadLeaflet();
  if (!galleryMap) {
    galleryMap = L.map(galleryMapElement, { scrollWheelZoom: false, worldCopyJump: true });
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(galleryMap);
    galleryMapMarkers = L.layerGroup().addTo(galleryMap);
  }

  galleryMapMarkers.clearLayers();
  const bounds = [];
  groups.forEach((group) => {
    const items = [...group.items].sort((a, b) => galleryTimestamp(b, "takenAt") - galleryTimestamp(a, "takenAt"));
    const photoUrl = String(items[0].photo || "").replaceAll("'", "%27").replaceAll('"', "%22");
    const badge = items.length > 1 ? `<b>${items.length}</b>` : "";
    const icon = L.divIcon({
      className: "photo-pin-anchor",
      html: `<span class="photo-pin" style="background-image:url('${photoUrl}')">${badge}</span>`,
      iconSize: [52, 61],
      iconAnchor: [26, 61],
      popupAnchor: [0, -58],
    });
    L.marker([group.latitude, group.longitude], { icon })
      .bindPopup(buildMapPopup(group), { maxWidth: 230, className: "photo-popup" })
      .addTo(galleryMapMarkers);
    bounds.push([group.latitude, group.longitude]);
  });

  const signature = bounds.map(([lat, lng]) => `${lat.toFixed(3)},${lng.toFixed(3)}`).sort().join("|");
  const boundsChanged = signature !== galleryMapSignature;
  galleryMapSignature = signature;
  requestAnimationFrame(() => {
    galleryMap.invalidateSize();
    if (!boundsChanged) return;
    if (bounds.length) galleryMap.fitBounds(bounds, { padding: [38, 38], maxZoom: 12 });
    else galleryMap.setView([51.2277, 6.7735], 5);
  });
}

function setGalleryView(view) {
  galleryView = view;
  galleryViewButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.galleryView === view);
  });
  galleryMapWrap.hidden = view !== "map";
  galleryList.hidden = view === "map";
  gallerySortLabel.hidden = view === "map";
  if (view === "map") {
    renderGalleryMap().catch((error) => showStamp("Karte gerade nicht verfügbar", error.message));
  }
}

function openPhoto(item, label) {
  photoDialog.querySelector(".photo-dialog-label").textContent = label || "Erinnerung";
  const image = photoDialog.querySelector(".photo-dialog-image");
  image.src = item.photo;
  image.alt = item.caption || "Erinnerungsfoto";
  photoDialog.querySelector(".photo-dialog-caption").textContent = item.caption || "";
  photoDialog.querySelector(".photo-dialog-meta").textContent = [
    formatMemoryDate(item.takenAt),
    item.location ? `📍 ${item.location}` : "",
  ].filter(Boolean).join(" · ");
  photoDialog.showModal();
}

function dailyMemoryPick() {
  const today = new Date();
  const dated = galleryItems.filter((item) => galleryTimestamp(item, "takenAt"));
  if (!dated.length) return null;

  const anniversaries = dated.map((item) => {
    const taken = new Date(item.takenAt);
    if (taken.getDate() !== today.getDate()) return null;
    const months = (today.getFullYear() - taken.getFullYear()) * 12 + today.getMonth() - taken.getMonth();
    if (months < 1) return null;
    const label = months % 12 === 0
      ? `Heute vor ${months === 12 ? "einem Jahr" : `${months / 12} Jahren`}`
      : `Heute vor ${months === 1 ? "einem Monat" : `${months} Monaten`}`;
    return { item, label };
  }).filter(Boolean);
  if (anniversaries.length) {
    anniversaries.sort((a, b) => galleryTimestamp(a.item, "takenAt") - galleryTimestamp(b.item, "takenAt"));
    return anniversaries[0];
  }

  const throwbacks = dated
    .filter((item) => Date.now() - galleryTimestamp(item, "takenAt") >= 14 * 86400000)
    .sort((a, b) => String(a.id).localeCompare(String(b.id)));
  if (!throwbacks.length) return null;

  let seed = 0;
  for (const char of `rippchen-${today.toISOString().slice(0, 10)}`) {
    seed = (seed * 31 + char.charCodeAt(0)) % 2147483647;
  }
  const item = throwbacks[seed % throwbacks.length];
  const days = Math.round((Date.now() - galleryTimestamp(item, "takenAt")) / 86400000);
  return { item, label: `Schon ${days} Tage her` };
}

function renderDailyMemory() {
  dailyMemoryPickCurrent = dailyMemoryPick();
  dailyMemory.hidden = !dailyMemoryPickCurrent;
  if (!dailyMemoryPickCurrent) return;
  const { item, label } = dailyMemoryPickCurrent;
  dailyMemoryImage.src = item.photo;
  dailyMemoryImage.alt = item.caption || "Erinnerungsfoto";
  dailyMemoryTitle.textContent = item.caption || "Weißt du noch?";
  dailyMemoryMeta.textContent = [label, item.location ? `📍 ${item.location}` : ""].filter(Boolean).join(" · ");
}

galleryViewButtons.forEach((button) => {
  button.addEventListener("click", () => setGalleryView(button.dataset.galleryView));
});

dailyMemory.addEventListener("click", () => {
  if (!dailyMemoryPickCurrent) return;
  openPhoto(dailyMemoryPickCurrent.item, dailyMemoryPickCurrent.label);
});

photoDialog.querySelector(".photo-close").addEventListener("click", () => photoDialog.close());
photoDialog.addEventListener("click", (event) => {
  if (event.target === photoDialog) photoDialog.close();
});

document.querySelectorAll("[data-open-tool]").forEach((button) => {
  button.addEventListener("click", () => openTool(button.dataset.openTool));
});

document.querySelectorAll(".tool-dialog .tool-close").forEach((button) => {
  button.addEventListener("click", () => button.closest("dialog").close());
});

[groceryDialog, householdDialog, galleryDialog].forEach((dialog) => {
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
});

gallerySort.addEventListener("change", renderGalleryItems);

groceryForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = new FormData(groceryForm);
  const item = await runHomeAction(() => apiRequest("/api/home/grocery", {
    method: "POST",
    body: JSON.stringify({
      name: String(data.get("item")).trim(),
      amount: String(data.get("amount")).trim(),
      priority: String(data.get("priority")),
    }),
  }));
  if (!item) return;
  groceryForm.reset();
  showStamp("Auf der Hit-Liste", item.name);
});

photoInput.addEventListener("change", () => {
  const file = photoInput.files?.[0];
  if (!file) {
    photoPreview.removeAttribute("style");
    photoPreview.innerHTML = "<b>📷</b> Beweisfoto hinzufügen";
    return;
  }

  const reader = new FileReader();
  reader.addEventListener("load", () => {
    photoPreview.style.backgroundImage = `linear-gradient(rgba(20,18,16,.18), rgba(20,18,16,.18)), url("${String(reader.result)}")`;
    photoPreview.innerHTML = "<b>✓</b> Beweisfoto ausgewählt";
  });
  reader.readAsDataURL(file);
});

async function compressPhoto(file) {
  if (!file || file.size <= 1.5 * 1024 * 1024) return file;

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.78));
    if (!blob) throw new Error("Keine Bildausgabe");
    return new File([blob], "beweisfoto.jpg", { type: "image/jpeg" });
  } catch {
    if (file.size <= 3.8 * 1024 * 1024) return file;
    throw new Error("Dieses Foto ist zu groß. Bitte wähle eine kleinere Version.");
  }
}

async function readPhotoMetadata(file) {
  let metadata = {};
  try {
    metadata = await window.exifr.parse(file, {
      tiff: true,
      exif: true,
      gps: true,
      xmp: true,
      iptc: true,
    }) || {};
  } catch {
    // Messenger exports and edited images often contain no readable EXIF data.
  }

  const date = metadata.DateTimeOriginal || metadata.CreateDate || metadata.DateCreated || metadata.ModifyDate;
  const takenAt = date instanceof Date && !Number.isNaN(date.getTime())
    ? date.toISOString()
    : new Date(file.lastModified || Date.now()).toISOString();
  const latitude = Number(metadata.latitude);
  const longitude = Number(metadata.longitude);
  const locationHint = String(
    metadata.City || metadata.Location || metadata.SubLocation || metadata.Country || "",
  ).trim();

  return {
    takenAt,
    latitude: Number.isFinite(latitude) ? latitude : "",
    longitude: Number.isFinite(longitude) ? longitude : "",
    locationHint,
    metadataSource: date || Number.isFinite(latitude) || locationHint ? "exif" : "file",
  };
}

householdForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (householdSubmit.disabled) return;

  const data = new FormData(householdForm);
  householdSubmit.disabled = true;
  householdSubmit.firstChild.textContent = "Foto wird angeheftet ";
  householdFormStatus.textContent = "Einen kurzen Moment …";
  householdFormStatus.classList.remove("is-error");

  try {
    const photo = photoInput.files?.[0];
    if (photo) data.set("photo", await compressPhoto(photo));

    const item = await apiRequest("/api/home/household", { method: "POST", body: data });
    householdForm.reset();
    photoPreview.removeAttribute("style");
    photoPreview.innerHTML = "<b>📷</b> Beweisfoto hinzufügen";
    householdFormStatus.textContent = "Erfolgreich an die Pinnwand geheftet.";
    setHomeState({
      grocery: groceryItems,
      household: [item, ...householdItems.filter((entry) => entry.id !== item.id)],
    });
    showStamp("Fundstück dokumentiert", item.room);
  } catch (error) {
    householdFormStatus.textContent = error.message || "Das Foto konnte nicht angeheftet werden.";
    householdFormStatus.classList.add("is-error");
  } finally {
    householdSubmit.disabled = false;
    householdSubmit.firstChild.textContent = "Fundstück melden ";
  }
});

galleryInput.addEventListener("change", () => {
  const count = galleryInput.files?.length || 0;
  galleryPreview.innerHTML = count
    ? `<b>✓</b> ${count} Foto${count === 1 ? "" : "s"} ausgewählt`
    : "<b>＋</b> Fotos auswählen";
});

galleryForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (gallerySubmit.disabled) return;

  const files = [...(galleryInput.files || [])];
  if (!files.length) return;
  const caption = String(new FormData(galleryForm).get("caption") || "").trim();
  gallerySubmit.disabled = true;
  galleryFormStatus.classList.remove("is-error");

  try {
    for (let index = 0; index < files.length; index += 1) {
      galleryFormStatus.textContent = `Foto ${index + 1} von ${files.length} wird vorbereitet …`;
      const metadata = await readPhotoMetadata(files[index]);
      const photo = await compressPhoto(files[index]);
      const data = new FormData();
      data.set("photo", photo, photo.name || files[index].name);
      data.set("caption", caption);
      data.set("takenAt", metadata.takenAt);
      data.set("latitude", metadata.latitude);
      data.set("longitude", metadata.longitude);
      data.set("locationHint", metadata.locationHint);
      data.set("metadataSource", metadata.metadataSource);
      data.set("originalName", files[index].name);

      const item = await apiRequest("/api/home/gallery", { method: "POST", body: data });
      galleryItems = [item, ...galleryItems.filter((entry) => entry.id !== item.id)];
      renderGalleryItems();
    }

    galleryForm.reset();
    galleryPreview.innerHTML = "<b>＋</b> Fotos auswählen";
    galleryFormStatus.textContent = `${files.length} Foto${files.length === 1 ? "" : "s"} an die Wand gehängt.`;
    showStamp("Fotowand erweitert", `${files.length} neue Erinnerung${files.length === 1 ? "" : "en"}`);
  } catch (error) {
    galleryFormStatus.textContent = error.message || "Die Fotos konnten nicht hochgeladen werden.";
    galleryFormStatus.classList.add("is-error");
  } finally {
    gallerySubmit.disabled = false;
  }
});

function createRoomMemory(memory, index) {
  const button = document.createElement("button");
  button.className = "room-memory";
  button.type = "button";

  const number = document.createElement("span");
  number.className = "memory-number";
  number.textContent = String(index + 1).padStart(2, "0");

  const date = document.createElement("time");
  date.textContent = memory.date;

  const title = document.createElement("h4");
  title.textContent = memory.title;

  const teaser = document.createElement("p");
  teaser.textContent = memory.teaser;

  const arrow = document.createElement("i");
  arrow.className = "memory-arrow";
  arrow.setAttribute("aria-hidden", "true");
  arrow.textContent = "öffnen →";

  button.append(number, date, title, teaser, arrow);
  button.addEventListener("click", () => openMemory(memory));
  return button;
}

function renderGoals(goals) {
  const saved = readSavedGoals();
  const wrapper = document.createElement("section");
  wrapper.className = "goal-panel";

  const heading = document.createElement("div");
  heading.className = "goal-panel-head";
  const title = document.createElement("h4");
  title.textContent = "Unsere Liste für 2026";
  const count = document.createElement("span");
  count.className = "goal-count";
  heading.append(title, count);

  const list = document.createElement("div");
  list.className = "goal-list";

  const updateCount = () => {
    const completed = wrapper.querySelectorAll("input:checked").length;
    count.textContent = `${completed} von ${goals.length} erlebt`;
  };

  goals.forEach((goal, index) => {
    const label = document.createElement("label");
    label.className = "goal";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = saved.includes(index);
    const mark = document.createElement("span");
    mark.className = "goal-box";
    mark.setAttribute("aria-hidden", "true");
    const text = document.createElement("span");
    text.textContent = goal;
    checkbox.addEventListener("change", () => {
      const checked = [...wrapper.querySelectorAll("input")]
        .map((input, itemIndex) => input.checked ? itemIndex : null)
        .filter((itemIndex) => itemIndex !== null);
      saveGoals(checked);
      updateCount();
    });
    label.append(checkbox, mark, text);
    list.append(label);
  });

  wrapper.append(heading, list);
  roomExtra.append(wrapper);
  updateCount();
}

function readSavedGoals() {
  try {
    const value = JSON.parse(localStorage.getItem("charleen-raoul-goals-2026") || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function saveGoals(goals) {
  try {
    localStorage.setItem("charleen-raoul-goals-2026", JSON.stringify(goals));
  } catch {
    // The checklist still works for the current visit if storage is unavailable.
  }
}

function openRoom(roomId) {
  const data = roomData[roomId];
  if (!data) return;

  apartment.hidden = true;
  homeHeading.hidden = true;
  prototypeNote.hidden = true;
  roomDetail.hidden = false;
  roomDetail.style.setProperty("--room-color", data.color);
  roomDetail.querySelector(".room-kicker").textContent = data.kicker;
  roomDetail.querySelector(".room-title").textContent = data.title;
  roomDetail.querySelector(".room-intro").textContent = data.intro;
  roomDetail.querySelector(".room-symbol").textContent = data.symbol;

  roomMemoryGrid.replaceChildren();
  data.memories.forEach((memory, index) => {
    roomMemoryGrid.append(createRoomMemory(memory, index));
  });

  roomExtra.replaceChildren();
  const fact = document.createElement("aside");
  fact.className = "room-fact";
  const factTitle = document.createElement("strong");
  factTitle.textContent = data.fact[0];
  const factText = document.createElement("span");
  factText.textContent = data.fact[1];
  fact.append(factTitle, factText);
  roomExtra.append(fact);
  if (data.goals) renderGoals(data.goals);
  award(`room-${roomId}`, 5, `${data.title} entdeckt`);

  window.scrollTo({ top: 0, behavior: "instant" });
}

function closeRoom(shouldScroll = true) {
  apartment.hidden = false;
  homeHeading.hidden = false;
  prototypeNote.hidden = false;
  roomDetail.hidden = true;
  if (shouldScroll) window.scrollTo({ top: 0, behavior: "smooth" });
}

function openMemory(memory) {
  memoryDialog.querySelector(".dialog-date").textContent = memory.date;
  memoryDialog.querySelector(".dialog-title").textContent = memory.title;
  memoryDialog.querySelector(".dialog-quote").textContent = memory.quote;
  memoryDialog.querySelector(".dialog-note").textContent = memory.note;
  memoryDialog.querySelector(".dialog-author").textContent = memory.author;
  memoryDialog.showModal();
}

document.querySelectorAll(".room").forEach((room) => {
  room.addEventListener("click", () => openRoom(room.dataset.room));
});

document.querySelectorAll(".back-home, .back-home-bottom").forEach((button) => {
  button.addEventListener("click", () => closeRoom());
});

memoryDialog.querySelector(".dialog-close").addEventListener("click", () => {
  memoryDialog.close();
});

memoryDialog.addEventListener("click", (event) => {
  if (event.target === memoryDialog) memoryDialog.close();
});

const hashChapter = location.hash.slice(1);
renderPoints();
renderGroceryItems();
renderHouseholdItems();
renderGalleryItems();
migrateLocalItems().catch(() => {
  showStamp("Alte Pinnwand bleibt lokal", "Neue Einträge funktionieren trotzdem");
}).finally(loadHome);
if (chapters.includes(hashChapter)) showChapter(hashChapter);
else showChapter(0);
