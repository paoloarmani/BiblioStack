import { Link } from "react-router-dom";
import { BookOpen, Clock, ExternalLink, Mail, MapPin, Phone } from "lucide-react";
import { Separator } from "@/components/ui/separator.jsx";
import { useLibraryInfo } from "@/features/config/useLibraryInfo.js";
import { useAuth } from "@/context/useAuth.js";

function FooterHeading({ children }) {
    return <h2 className="text-sm font-semibold">{children}</h2>;
}

function ExternalFooterLink({ href, children }) {
    return (
        <a href={href} target="_blank" rel="noopener noreferrer"
           className="inline-flex items-center gap-1 hover:text-foreground hover:underline underline-offset-4">
            {children}
            <ExternalLink className="h-3 w-3" aria-hidden="true" />
        </a>
    );
}

// Footer delle pagine pubbliche e utente: chi è la biblioteca, come contattarla, quando è aperta,
// link utili e informativa privacy. I dati vengono da LIBRARY_* nella configurazione del server.
export default function Footer() {
    const library = useLibraryInfo();
    const { isAuthenticated } = useAuth() ?? {};
    const name = library?.name ?? "Biblioteca";
    const hasContacts = library && (library.address || library.email || library.phone);

    return (
        <footer className="border-t border-border bg-muted/30">
            <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-2 lg:grid-cols-4 lg:px-8">
                {/* Chi siamo */}
                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary">
                            <BookOpen className="h-4 w-4 text-primary-foreground" />
                        </div>
                        <span className="font-semibold leading-tight">{name}</span>
                    </div>
                    {library?.institution && (
                        <p className="text-sm text-muted-foreground">{library.institution}</p>
                    )}
                </div>

                {/* Contatti */}
                {hasContacts && (
                    <div className="space-y-3">
                        <FooterHeading>Contatti</FooterHeading>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            {library.address && (
                                <li className="flex gap-2">
                                    <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                                    <span>{library.address}</span>
                                </li>
                            )}
                            {library.email && (
                                <li className="flex gap-2">
                                    <Mail className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                                    <a href={`mailto:${library.email}`} className="break-all hover:text-foreground hover:underline underline-offset-4">
                                        {library.email}
                                    </a>
                                </li>
                            )}
                            {library.phone && (
                                <li className="flex gap-2">
                                    <Phone className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                                    <a href={`tel:${library.phone.replace(/[^\d+]/g, "")}`} className="hover:text-foreground hover:underline underline-offset-4">
                                        {library.phone}
                                    </a>
                                </li>
                            )}
                        </ul>
                    </div>
                )}

                {/* Orari */}
                {library?.hours?.length > 0 && (
                    <div className="space-y-3">
                        <FooterHeading>Orari di apertura</FooterHeading>
                        <ul className="space-y-1.5 text-sm text-muted-foreground">
                            {library.hours.map((line) => (
                                <li key={line} className="flex gap-2">
                                    <Clock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                                    <span>{line}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Link utili */}
                <nav className="space-y-3" aria-label="Link utili">
                    <FooterHeading>Link utili</FooterHeading>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                        <li><Link to="/catalog" className="hover:text-foreground hover:underline underline-offset-4">Catalogo</Link></li>
                        {isAuthenticated
                            ? <li><Link to="/card" className="hover:text-foreground hover:underline underline-offset-4">La mia tessera</Link></li>
                            : <li><Link to="/login" className="hover:text-foreground hover:underline underline-offset-4">Accedi</Link></li>}
                        {library?.rulesUrl && <li><ExternalFooterLink href={library.rulesUrl}>Regolamento dei prestiti</ExternalFooterLink></li>}
                        {library?.websiteUrl && <li><ExternalFooterLink href={library.websiteUrl}>Sito della scuola</ExternalFooterLink></li>}
                    </ul>
                </nav>
            </div>

            <Separator />

            <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 px-4 py-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
                <p>© {new Date().getFullYear()} {name}</p>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                    {library?.privacyUrl && <ExternalFooterLink href={library.privacyUrl}>Informativa privacy</ExternalFooterLink>}
                    <span>Realizzato con BiblioStack</span>
                </div>
            </div>
        </footer>
    );
}
