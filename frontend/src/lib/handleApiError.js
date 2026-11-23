import { notify } from "@/lib/notify";

export function handleApiError(error, navigate) {
    const data = error.response?.data

    if (!data) {
        notify.error("Server non raggiungibile");
        return
    }

    switch (data.code) {

        case "VALIDATION_ERROR":
            notify.error(data.details?.[0]?.message || "Errore di validazione");
            break;

        case "INVALID_CREDENTIALS":
            notify.error("Email o password errata");
            break;

        case "NO_TOKEN":
        case "INVALID_TOKEN":
            notify.error("Sessione scaduta");
            navigate?.("/login");
            break;

        case "ALREADY_LOANED":
            notify.error("Hai già questo libro in prestito");
            break;

        case "ALREADY_RESERVED":
            notify.error("Hai già una prenotazione attiva per quest'opera");
            break;

        case "FORBIDDEN":
            notify.error("Non hai i permessi per eseguire questa operazione");
            break;

        case "ITEM_ID_TAKEN":
            notify.error("Esiste già una copia con questo codice inventario");
            break;

        case "SHELF_MARK_TAKEN":
            notify.error("Questa collocazione è già assegnata a un'altra copia");
            break;

        case "ITEM_NOT_LOANABLE":
            notify.error("Questa copia è solo per la consultazione in sede: il prestito non è consentito");
            break;

        case "ITEM_LOST":
            notify.error("La copia risulta smarrita e non può essere prestata");
            break;

        case "WORK_NOT_LOANABLE":
            notify.error("Quest'opera è disponibile solo per la consultazione in sede");
            break;

        case "SUBJECT_ALREADY_EXISTS":
            notify.error("Esiste già un soggetto con questo nome");
            break;

        case "ITEM_HAS_DIPENDENCIES":
            notify.error("Non puoi eliminare l'opera perché è associata a uno o più prestiti");
            break;

        default:
            notify.error(data.message || "Errore server");
    }
}