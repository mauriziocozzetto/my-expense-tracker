Istruzioni passo-passo per lo sviluppo (Fase di Esecuzione)Ora che i file .md sono posizionati nel tuo workspace, apri la chat di Antigravity e segui questa sequenza ordinata di istruzioni.1.

Fase 1: Generazione del Modello Dati:Chiedi ad Antigravity di creare lo schema del DB.Scrivi ad Antigravity: "In base al file database-design.md, generami lo schema SQLModel completo in un file models.py per il nostro Monthly Expense Manager."L'agente leggerà le direttive del file .md e ti fornirà il codice Python con tutte le relazioni (Account, Categorie, Transazioni, Tag e Ricorrenze) pronte all'uso.2.

Fase 2: Creazione del Backend (FastAPI):Fai implementare la logica delle API e dei filtri.Scrivi ad Antigravity: "Usa le regole definite in backend-api.md e i modelli generati nello step precedente. Crea gli endpoint in main.py per la gestione di transazioni, filtri avanzati, inserimento automatico delle ricorrenze e calcolo delle statistiche annuali."In questa fase, l'agente strutturerà anche i calcoli matematici per i totali di fine anno pronti per essere consumati dal frontend.3.

Fase 3: Sviluppo del Frontend Responsivo:Crea l'interfaccia utente interattiva.Scrivi ad Antigravity: "Seguendo le linee guida in frontend-ui.md, genera un'interfaccia utente responsiva in HTML/JS integrata con Tailwind CSS e Chart.js per visualizzare la dashboard, i grafici annuali e il modulo di inserimento delle transazioni."4.Fase 4: Simulazione e Debug:Testa e rifinisci le funzionalità.Esegui l'applicazione in locale. Se incontri un qualsiasi errore (es. un tag che non viene salvato correttamente o un problema con l'asincronia di FastAPI), copia l'errore e scrivi ad Antigravity:"Ho questo errore durante l'esecuzione: [incolla errore]. Correggi il codice basandoti sulle nostre regole nei file .md."

---

## 🚀 Come Avviare l'Applicazione (Promemoria)

Per avviare correttamente il **Monthly Expense Manager**, devi far partire due servizi separati (apri due finestre del terminale):

### 1. Avviare il Server Backend (FastAPI)
Questo servizio gestisce il database SQLite e le API (risponde sulla porta 8000).
Dal terminale, spostati nella cartella `backend` ed esegui il server:
```bash
cd backend
uvicorn main:app --reload
```

### 2. Avviare il Client Frontend (Interfaccia)
Questo servizio permette al browser di caricare l'HTML e il Javascript (risponde sulla porta 8080) evitando i blocchi di sicurezza (CORS).
Apri un *nuovo* terminale, spostati nella cartella `frontend` ed esegui un server HTTP:
```bash
cd frontend
python3 -m http.server 8080
```

Fatto! Ora ti basta aprire il browser e visitare l'indirizzo: **http://localhost:8080**
