import { createContext } from "react";

// Contesto dell'utente autenticato: fornito da AuthProvider (AuthContext.jsx), letto con useAuth()
export const AuthContext = createContext();
