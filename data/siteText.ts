type TextPart = {
  text: string;
  href?: string;
};

type InfoPanelTextBlock =
  | {
      kind: "paragraph" | "emphasis";
      parts: TextPart[];
    }
  | {
      kind: "section";
      heading: string;
      parts: TextPart[];
    };

export const introPopupText = {
  firstParagraph:
    "Mate Alert toont plekken waar er Club Mate is gespot. Klik op een pin voor adres, openingsuren en voorraadmeldingen.",
  secondParagraph:
    "Zie je ergens Club Mate staan? Gebruik de grote Mate Alert knop onderaan om die spot toe te voegen. Klopt een locatie niet meer, meld dan dat Club Mate niet meer aanwezig is.",
  buttonLabel: "Starten",
};

export const infoPanelText = {
  eyebrow: "Info",
  logoLabel: "Mate Alert",
  closeLabel: "Sluit info",
  blocks: [
    {
      kind: "paragraph",
      parts: [
        { text: "Heb je zin in die koude, overheerlijke en verslavende " },
        { text: "Club Mate", href: "https://www.club-mate.de/en/" },
        { text: "? Of heb jij de drang om alle spots met " },
        { text: "Club Mate", href: "https://www.clubmate.de/en/" },
        { text: " mee aan te vullen op de kaart? Dan is dit de juiste plek." },
      ],
    },
    {
      kind: "paragraph",
      parts: [
        {
          text: "Deze website is een verzameling van verschillende verkooppunten van het drankje. Van cafés, koffiebars en restaurants tot supermarkten, nachtwinkels en andere random plekken waar iemand ooit plots oog in oog stond met een flesje ",
        },
        { text: "Club Mate", href: "https://www.clubmate.de/en/" },
        { text: "." },
      ],
    },
    {
      kind: "paragraph",
      parts: [
        {
          text: "Deze website is volledig community based. Daardoor kan het zijn dat sommige locaties niet meer kloppen, tijdelijk uitverkocht zijn of gestopt zijn met verkopen. In dat geval kan je dit melden bij de locatie zelf zodat de kaart een beetje proper blijft voor de volgende wanhopige zoeker.",
        },
      ],
    },
    {
      kind: "section",
      heading: "Hoe werkt het?",
      parts: [
        {
          text: "Zelf een mate gespot in het wild? Gebruik dan de Mate Alert knop onderaan het scherm en geef de locatie in. Na het toevoegen verschijnt deze automatisch op de kaart zodat anderen die plek ook kunnen terugvinden.",
        },
      ],
    },
    {
      kind: "paragraph",
      parts: [
        {
          text: "Je kan op locaties klikken om meer info te bekijken zoals de naam van de plek, het adres en soms extra info die werd toegevoegd door andere gebruikers. Sommige spots zijn hidden gems. Andere zijn letterlijk gewoon een tankstation ergens in de middle of nowhere. Alles telt.",
        },
      ],
    },
    {
      kind: "paragraph",
      parts: [
        { text: "Dus: zie je ergens " },
        { text: "Club Mate", href: "https://www.club-mate.de/en/" },
        { text: " staan? Voeg het toe. Zie je een fout? Meld het. En vooral: ga op ontdekking." },
      ],
    },
    {
      kind: "emphasis",
      parts: [{ text: "Veel succes met uw zoektocht naar cafeïne en innerlijke vrede." }],
    },
  ] satisfies InfoPanelTextBlock[],
};
