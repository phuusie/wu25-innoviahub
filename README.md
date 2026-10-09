# Innovia Hub

## Förutsättningar

- .NET SDK 10
- Node.js och npm
- Docker Desktop
- OpenAI API-nyckel (för AI-assistenten)

## Starta projektet

Kör kommandona från projektets rotmapp.

### 1. Starta databasen

Skapa en .env-fil i projektets rotmapp med följande innehåll:

Ersätt `<container_name>`, `<database_name>`, `<username>` och `<password>` med dina egna värden.

```env
CONTAINER_NAME=<container_name>
DATABASE=<database_name>
DB_USERNAME=<username>
DB_PASSWORD=<password>
```

```powershell
docker compose up -d
```

### 2. Konfigurera API:t

API:t använder PostgreSQL på port `5433` och kräver en connection string. Sätt variablerna i samma terminalfönster som API:t ska startas i:

Ersätt `<database_name>`, `<username>` och `<password>` med dina värden från .env-filen i connection stringen.
`ADMIN_EMAIL` och `ADMIN_PASSWORD` är valfria och används för att skapa den första administratören.

`OPENAI_API_KEY` krävs för AI-assistenten. Utan den startar inte API:t.

```powershell
$env:SQL_ConnectionString = "Host=localhost;Port=5433;Database=<database_name>;Username=<username>;Password=<password>"
$env:ADMIN_EMAIL = '<din-admin-email>'
$env:ADMIN_PASSWORD = '<ditt-lösenord>'
$env:OPENAI_API_KEY = '<din-openai-nyckel>'
```

> **Krav på `ADMIN_PASSWORD`**
>
> Lösenordet måste innehålla:
> - minst 6 tecken
> - en stor bokstav (A–Z)
> - en liten bokstav (a–z)
> - en siffra (0–9)
> - ett specialtecken (t.ex. `!` eller `#`)
>
> Exempel: `Exempel1234!`
> 
> **Tips:** använd enkla citattecken (`'...'`) runt lösenord i PowerShell,
> så tolkas inte `$` som en variabel.

Kör migrationerna och starta API:t:

```powershell
dotnet ef database update --project InnoviaHub.DataAccess --startup-project InnoviaHub.Api
dotnet run --project InnoviaHub.Api --launch-profile http
```

API:t körs på `http://localhost:5193`. OpenAPI/Scalar finns på `http://localhost:5193/scalar` i utvecklingsläge.

### 3. Starta klienten

Skapa en `.env`-fil i `InnoviaHub.Client` med följande innehåll:

```env
VITE_API_URL=http://localhost:5193
```

Öppna ett nytt terminalfönster:

```powershell
Set-Location InnoviaHub.Client
npm install
npm run dev
```

Klienten körs normalt på `http://localhost:5173`.

## Vanliga kommandon

```powershell
# Stoppa databasen
docker compose down

# Bygg API:t
dotnet build InnoviaHub.slnx

# Bygg klienten
npm run build --prefix InnoviaHub.Client

# Kör lint på klienten
npm run lint --prefix InnoviaHub.Client
```

Om `dotnet ef` saknas, installera Entity Framework CLI

```powershell
dotnet tool install --global dotnet-ef
```

## Testa API:t

HTTP-anrop finns i `InnoviaHub.Api/Http`. De kan köras direkt från VS Code med REST Client-tillägget.
Eller så kan ni använda er av Scalar/OpenAPI som finns på `http://localhost:5193/scalar` i utvecklingsläge.

## AI-bokningsassistent

En AI-assistent som hjälper kunden med att hitta lediga tider och föreslå bokningar utan att behöva gå in på bokningssidan.

### Så fungerar det

1. Kunden skriver en fråga i chatten. Hela konversationen skickas till `POST /api/Assistant/chat`.
2. Backend lägger till en systemprompt med dagens datum, öppettider och regler för hur assistenten ska bete sig.
3. OpenAI gissar aldrig lediga tider själv. Den anropar två verktyg (*function calling*) som körs av backend:
    - `get_availability` – hämtar lediga tider från databasen.
    - `propose_booking` – kontrollerar en tid och skapar ett **förslag**. Ingen bokning görs här.
4. Förslaget visas i chatten med knapparna **Ja, boka** och **Annan tid**.
5. **Ja, boka** anropar `POST /api/Assistant/confirm/{proposalId}`, som skapar bokningen utan AI.

Assistenten kan bara föreslå tider. Själva bokningen görs först när kunden klickar på knappen,
och den går igenom samma kontroller som en vanlig bokning.

### Var koden finns

| Backend | Vad den gör |
|---|---|
| `Services/AssistantService.cs` | Pratar med OpenAI och kör verktygen |
| `Services/AvailabilityService.cs` | Räknar ut lediga tider |
| `Services/BookingService.cs` | Alla regler för bokningar |
| `Controllers/AssistantController.cs` | Endpoints för chatt och bekräftelse |

| Frontend | Vad den gör |
|---|---|
| `components/Chat/ChatWidget.tsx` | Chattbubblan och chatten |
| `components/Chat/ProposalCard.tsx` | Förslaget med knapparna |
| `services/assistantService.ts` | Anrop till API:t |

### Nya endpoints

Alla kräver inloggning.

| Metod | Endpoint | Beskrivning |
|---|---|---|
| `POST` | `/api/Assistant/chat` | Skickar konversationen och får svar + eventuellt förslag |
| `POST` | `/api/Assistant/confirm/{proposalId}` | Bekräftar ett förslag och skapar bokningen |
| `GET` | `/api/Availability?date=YYYY-MM-DD&minCapacity=&resourceTypeId=` | Lediga tider per resurs en viss dag |

### Säkerhet

- API-nyckeln finns bara i backend. Klienten pratar aldrig direkt med OpenAI.
- AI:n kan bara föreslå. Bokningen görs först när kunden klickar på knappen.
- Max 10 meddelanden per minut och användare.

