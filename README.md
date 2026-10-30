# Innovia Hub

Innovia Hub är en bokningsplattform för ett coworking-space. Medlemmar kan boka skrivbord,
mötesrum och andra resurser, få hjälp av en AI-assistent att hitta lediga tider och se
bokningar uppdateras i realtid. Administratörer hanterar resurser och medlemmar och kan se
sensordata (temperatur och CO₂) från lokalens IoT-enheter.

## Live-demo

**Länk:** https://innoviahub-api-dkun8.ondigitalocean.app

- Inloggningsuppgifter för admin skickas som kommentar vid inlämning.

### Så testar du

1. **Bokning:** logga in som medlem → *Boka* → välj resurs, datum och tid.
2. **Realtid (SignalR):** öppna appen i två fönster och gör en bokning i det ena. Tiden blir upptagen i det andra direkt.
3. **AI-assistent:** öppna chattbubblan och skriv t.ex. *"Finns det ett mötesrum för 4 personer i morgon eftermiddag?"*. Assistenten föreslår en tid som du bekräftar med **Ja, boka**.
4. **Admin:** logga in som admin → *Adminpanel* → hantera resurser och medlemmar.
5. **IoT:** *Adminpanel → Sensorer*. IoT-servern är inte driftsatt, så sidan visar att sensorerna är **offline**, utan att resten av appen påverkas.

## Funktioner jag har vidareutvecklat

Efter gruppfasen har jag själv byggt:

- **AI-bokningsassistent:** chatt som använder OpenAI med *function calling* för att söka lediga tider och föreslå bokningar.
- **Tillgänglighets-API:** räknar ut lediga tider per resurs och dag (`/api/Availability`).
- **IoT-integration:** adminpanelens sensorflik hämtar riktiga enheter från Innovia IoT och visar live-värden via SignalR.
- **Offline-hantering:** tydligt meddelande när IoT-tjänsten inte svarar.
- **Driftsättning:** hela applikationen körs på DigitalOcean App Platform med en managed PostgreSQL-databas.
- **Refaktorering:** systemprompt och AI-verktyg är utbrutna till egna filer, plus städning av koden.

## Tekniker

| Del           | Teknik                                                     |
|---------------|------------------------------------------------------------|
| Frontend      | React 19, TypeScript, Vite, Tailwind CSS                   |
| Backend       | ASP.NET Core (.NET 10), Web API med controllers            |
| Databas       | PostgreSQL med Entity Framework Core (Npgsql)              |
| Inloggning    | ASP.NET Core Identity (cookie-baserad), roller Admin/Medlem |
| Realtid       | SignalR (bokningsnotiser + IoT-telemetri)                  |
| AI            | OpenAI (`gpt-4o-mini`) med function calling                |
| Driftsättning | DigitalOcean App Platform + Managed PostgreSQL             |
| Lokalt        | Docker (PostgreSQL)                                        |

## Projektstruktur

```
InnoviaHub.Api          Controllers, services, SignalR-hub, AI-assistent
InnoviaHub.DataAccess   Entiteter, DbContext, migrationer, repositories
InnoviaHub.Shared       DTO:er som delas mellan lagren
InnoviaHub.Client       React-frontend
```

## Köra lokalt

### Förutsättningar

- .NET SDK 10
- Node.js och npm
- Docker Desktop
- OpenAI API-nyckel

### 1. Miljövariabler och databas

Kopiera `.env.example` till `.env` i **rotmappen** och fyll i dina värden:

```env
CONTAINER_NAME=<container_name>
DATABASE=<database_name>
DB_USERNAME=<username>
DB_PASSWORD=<password>

VITE_API_URL=http://localhost:5193
VITE_IOT_HUB_URL=http://localhost:5103/hub/telemetry
```

Starta databasen (port `5433`):

```powershell
docker compose up -d
```

### 2. Starta API:t

Sätt variablerna i samma terminal som API:t startas i:

```powershell
$env:SQL_ConnectionString = "Host=localhost;Port=5433;Database=<database_name>;Username=<username>;Password=<password>"
$env:OPENAI_API_KEY = '<din-openai-nyckel>'
$env:ADMIN_EMAIL = '<din-admin-email>'
$env:ADMIN_PASSWORD = '<ditt-lösenord>'
```

> `ADMIN_PASSWORD` måste ha minst 6 tecken, stor och liten bokstav, en siffra och ett specialtecken.
> Använd enkla citattecken i PowerShell så att `$` inte tolkas som en variabel.

```powershell
dotnet run --project InnoviaHub.Api --launch-profile http
```

Migrationerna körs automatiskt vid start. API:t körs på `http://localhost:5193` och Scalar finns på `/scalar`.

### 3. Starta klienten

```powershell
cd InnoviaHub.Client
npm install
npm run dev
```

Klienten körs på `http://localhost:5173`.

### 4. (Valfritt) IoT

För live-sensordata startar du Innovia IoT lokalt. Se `https://github.com/phuusie/wu25-innovia-iot.git`.
Utan IoT fungerar allt annat, och sensorfliken visar att enheterna är offline.

## IoT-integrationen i korthet

1. API:t hämtar enheterna från IoT:s DeviceRegistry via `GET /api/Iot/devices` (endast admin).
2. Frontenden ansluter direkt till IoT:s SignalR-hub (`VITE_IOT_HUB_URL`) och tar emot temperatur och CO₂ live.
3. Svarar inte IoT-tjänsten visar sensorfliken *"Sensorerna är offline just nu"*. Resten av appen påverkas inte.

I den driftsatta versionen körs inte IoT-servern, så sensorfliken visar alltid offline-läget.

## AI-assistenten i korthet

1. Kunden skriver i chatten. Konversationen skickas till `POST /api/Assistant/chat`.
2. Backend lägger till en systemprompt med datum, öppettider och regler.
3. OpenAI gissar aldrig tider. Den anropar verktygen `get_availability` och `propose_booking`, som körs mot databasen.
4. Förslaget visas med knapparna **Ja, boka** / **Annan tid**.
5. **Ja, boka** anropar `POST /api/Assistant/confirm/{proposalId}`, som skapar bokningen med samma regler som en vanlig bokning.

API-nyckeln finns bara i backend, AI:n kan bara *föreslå*, och varje användare får skicka max 10 meddelanden per minut.

## Testa API:t

HTTP-filer finns i `InnoviaHub.Api/Http`. I utvecklingsläge finns Scalar på `http://localhost:5193/scalar`.

## Funktioner jag har vidareutvecklat

- **Lediga tider och öppettider:** API som räknar ut lediga tider per resurs, och bokningsregler som följer konfigurerbara öppettider.
- **AI-bokningsassistent:** chatt med OpenAI och function calling som söker lediga tider och föreslår bokningar som användaren bekräftar.
- **Ny design av frontenden:** omgjord startsida, inloggning, bokningsflöde och adminpanel. Designen togs fram med hjälp av AI, som jag styrde och anpassade till projektet.
- **IoT-integration:** sensorfliken visar riktiga enheter från Innovia IoT med live-värden via SignalR, och ett tydligt offline-läge när tjänsten inte svarar.
- **Driftsättning:** DigitalOcean App Platform med Managed PostgreSQL.
