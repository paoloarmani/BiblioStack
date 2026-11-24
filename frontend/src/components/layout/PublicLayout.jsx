import { Outlet } from "react-router-dom";
import Footer from "@/components/layout/footer/Footer.jsx";

// Layout delle pagine pubbliche e utente: contenuto + footer in fondo alla pagina.
// Molte pagine hanno la radice con min-h-screen: qui la radice si limita a riempire lo spazio libero,
// così il footer resta in fondo senza costringere a scorrere sulle pagine corte.
export default function PublicLayout() {
    return (
        <div className="flex min-h-screen flex-col [&>:first-child]:min-h-0 [&>:first-child]:flex-1">
            <Outlet />
            <Footer />
        </div>
    );
}
