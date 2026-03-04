/**
 * Centralized user-facing copy (Romanian)
 */
export const copy = {
  // Auth
  login: "Autentificare",
  logout: "Deconectare",
  signingIn: "Se conectează...",
  loginSuccess: "Autentificare reușită!",
  sessionExpired: "Sesiune expirată. Autentificați-vă din nou.",
  pleaseLogin: "Autentificați-vă",
  signOut: "Deconectare",
  loggedOut: "Ați fost deconectat.",
  checkingPermissions: "Se verifică permisiunile...",
  accessDenied: "Acces interzis. Necesare drepturi SuperAdmin.",

  // Login errors
  invalidCredentials: "Email sau parolă incorectă.",
  serverError: "Eroare de server. Încercați din nou.",
  serviceUnavailable: "Serviciul indisponibil. Încercați din nou.",
  completeEmailPassword: "Completați email și parola.",
  somethingWrong: "Ceva nu a mers bine.",

  // Login validation
  invalidEmail: "Adresă de email invalidă",
  emailRequired: "Emailul este obligatoriu",
  passwordMinLength: "Parola trebuie să aibă cel puțin 6 caractere",
  passwordRequired: "Parola este obligatorie",

  // Nav
  dashboard: "Dashboard",
  superAdmin: "SuperAdmin",
  doctors: "Medici",

  // Notes
  enterContent: "Introduceți conținut.",
} as const;
