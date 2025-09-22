# API — Context

Questa pagina documenta il contesto utente `UserContext` e l’istanza HTTP `api`.

Percorso: `src/context/UserContext.jsx`

## Panoramica
- `api`: istanza Axios preconfigurata con `baseURL` da `VITE_SERVER_URL` e intercettori per JWT.
- `UserContext`: React Context che espone stato autenticazione e API di dominio.
- `UserProvider`: provider che inizializza token/utente da `localStorage`, gestisce refresh token, e rende disponibili le funzioni.
- `useUser()`: hook helper per accedere al contesto.

## Stato esposto
- `userData: object | null`
- `token: string | null`
- `loading: boolean`
- `isAuthenticated: boolean`

## Metodi esposti
- `login(email: string, password: string): Promise<User>`
- `forgotPassword(email: string): Promise<any>`
- `resetPassword(password: string, token: string): Promise<any>`
- `register(userData: object): Promise<void>`
- `fetchUserProfile(): Promise<User|null>`
- `logout(): void`
- `refreshToken(): Promise<boolean>`
- `checkTokenExpiration(): boolean` — controlla e se necessario invoca refresh a < 5 min dalla scadenza
- `updateUserData(data: object): void`
- `clearUserData(): void`
- Dominio punti luce e report:
  - `loadSelectedTownhalls(selectedCity: string): Promise<AxiosResponse>`
  - `downloadReport(json: object): Promise<AxiosResponse>`
  - `getActiveReports(city: string, lightPointId: string): Promise<AxiosResponse>`
  - `updateLightPoint(lightPointId: string, data: object): Promise<AxiosResponse>`
  - `addLightPoint(data: object): Promise<AxiosResponse>`
  - `deleteLightPoint(lightPointId: string): Promise<AxiosResponse>`
  - `getAverageResponseTime(townhallName: string): Promise<AxiosResponse>`
  - `getTownhallGeojson(selectedCity: string): Promise<AxiosResponse>`
  - `getTownhallLightpointsCount(): Promise<AxiosResponse<{ [city: string]: number }>>`
  - `getLightpoint(id: string): Promise<AxiosResponse>`
  - `addReport(data: object): Promise<AxiosResponse>`
  - `confirmEmail(params: object): Promise<AxiosResponse>`
  - `getOrganizationByUserId(id: string): Promise<AxiosResponse>`

## Intercettori Axios
- Richieste: aggiunge `Authorization: Bearer <token>` se presente.
- Risposte 401: tenta `/refresh-token`; se fallisce, esegue `logout()`.

## Persistenza
- `localStorage`: `token`, `userData`.

## Esempio d’uso
```jsx
import { useUser } from "../context/UserContext";

function Example() {
  const { isAuthenticated, userData, login, logout } = useUser();
  // ...
}
```
