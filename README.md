# Ruota dei sapori del miele

Web app responsive simile a [flavorwheel.app](https://flavorwheel.app/), dedicata al **miele**, con dati in **italiano** dalla ruota dei sapori gerarchica (`data/flavor_wheel_it2_hierarchical.json`).

## Funzionalità

- **Tre anelli**: categorie (Vegetale, Animale, Floreale, …), sottocategorie e descrittori
- **Trascina per ruotare**: funziona con mouse e touch su tutti i dispositivi
- **Clic su un settore**: mostra nome e descrizione in un riquadro sotto la ruota
- **Layout responsive**: un solo SVG con `viewBox`, adattabile a smartphone, tablet e desktop

## Avvio

```bash
npm install
npm run dev
```

Ora apri [http://localhost:5173](http://localhost:5173).

## Build

```bash
npm run build
npm run preview
```

## Stack

- **Vite** + **React** + **TypeScript**
- SVG per la ruota (archi e etichette)
- Pointer events per trascinamento e touch
- Nessuna dipendenza pesante (nessun D3)

## Struttura dati

Il file `data/flavor_wheel_it2_hierarchical.json` è una gerarchia a 3 livelli: categoria → sottocategoria → descrittore. Ogni nodo ha `name` e `description`; le proporzioni degli archi sono calcolate in modo uniforme per livello.

---

## Pubblicare la pagina (GitHub Pages)

1. **Crea un repository su GitHub** (se non ce l’hai già) e pusha il codice:
   ```bash
   git init
   git add .
   git commit -m "Ruota sapori miele"
   git branch -M main
   git remote add origin https://github.com/TUO-USERNAME/TUO-REPO.git
   git push -u origin main
   ```

2. **Attiva GitHub Pages** nel repo:
   - Vai su **Settings** → **Pages**
   - In **Source** scegli **GitHub Actions**

3. **Deploy automatico**: a ogni push su `main` il workflow `.github/workflows/deploy-pages.yml` esegue la build e pubblica il sito.

4. **URL pubblico**: dopo qualche minuto il sito sarà disponibile su:
   - `https://TUO-USERNAME.github.io/TUO-REPO/`

**Alternative gratuite** (senza configurare Pages):
- **Netlify**: trascina la cartella `dist` (dopo `npm run build`) su [app.netlify.com/drop](https://app.netlify.com/drop), oppure collega il repo GitHub per deploy automatico.
- **Vercel**: collega il repo su [vercel.com](https://vercel.com); rileva Vite e fa build + deploy da solo.
