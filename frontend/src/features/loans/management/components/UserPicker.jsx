import { useState } from "react";
import { Loader2, QrCode, Search, User, X } from "lucide-react";
import { Button } from "@/components/ui/button.jsx";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command.jsx";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover.jsx";
import { Item, ItemActions, ItemContent, ItemDescription, ItemMedia, ItemTitle } from "@/components/ui/item.jsx";
import api from "@/api/axios.js";
import { useDebouncedSearch } from "@/hooks/useDebouncedSearch.js";
import { useCardVerification } from "@/features/qrCode/hooks/useCardVerification.js";
import CodeScannerDialog from "@/features/qrCode/CodeScannerDialog.jsx";

const searchUsers = async (term) =>
    (await api.get("/users/search", { params: { search: term, limit: 8 } })).data;

// Scelta dell'utente a cui prestare un libro: ricerca per nome, cognome, email o numero tessera,
// oppure scansione del QR della tessera. value = utente selezionato ({ id, firstName, lastName, email }) o null.
export default function UserPicker({ value, onChange, error }) {
    const [open, setOpen] = useState(false);
    const [scannerOpen, setScannerOpen] = useState(false);
    const { term, search, clear, results, loading } = useDebouncedSearch(searchUsers);
    const { verify } = useCardVerification();

    const select = (user) => {
        onChange(user);
        clear();
        setOpen(false);
    };

    const handleScan = async (rawToken) => {
        const result = await verify(rawToken);
        if (result?.valid && result?.userId) {
            try {
                const { data } = await api.get(`/users/${result.userId}`);
                select(data);
            } catch {
                select({ id: result.userId, firstName: "Tessera", lastName: `n. ${result.userId}`, email: "" });
            }
        }
    };

    if (value) {
        return (
            <Item variant="outline" size="sm" className="border-primary/30 bg-primary/5">
                <ItemMedia variant="icon" className="size-8 rounded-md bg-primary/10 text-primary">
                    <User />
                </ItemMedia>
                <ItemContent className="min-w-0">
                    <ItemTitle className="truncate">{value.firstName} {value.lastName}</ItemTitle>
                    <ItemDescription className="truncate text-xs">
                        {value.email}{value.email ? " · " : ""}tessera n. {value.id}
                    </ItemDescription>
                </ItemContent>
                <ItemActions>
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8"
                            onClick={() => onChange(null)} aria-label="Cambia utente">
                        <X className="h-4 w-4" />
                    </Button>
                </ItemActions>
            </Item>
        );
    }

    const hasTerm = !!term.trim();

    return (
        <div className="space-y-1">
            <div className="flex gap-2">
                <Popover open={open} onOpenChange={setOpen}>
                    <PopoverTrigger asChild>
                        <Button
                            type="button"
                            variant="outline"
                            role="combobox"
                            aria-expanded={open}
                            aria-invalid={!!error}
                            className="flex-1 justify-start font-normal text-muted-foreground"
                        >
                            <Search className="h-4 w-4" />
                            Cerca per nome, email o n. tessera
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-72 p-0" align="start">
                        {/* shouldFilter disattivato: il filtro lo fa il server */}
                        <Command shouldFilter={false}>
                            <CommandInput
                                placeholder="Nome, cognome, email o n. tessera"
                                value={term}
                                onValueChange={search}
                            />
                            <CommandList>
                                {loading && (
                                    <div className="flex justify-center py-4">
                                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                    </div>
                                )}
                                {!hasTerm && (
                                    <p className="py-6 text-center text-sm text-muted-foreground">
                                        Digita almeno una lettera o il numero di tessera
                                    </p>
                                )}
                                {hasTerm && !loading && <CommandEmpty>Nessun utente trovato</CommandEmpty>}
                                {hasTerm && results.length > 0 && (
                                    <CommandGroup>
                                        {results.map((u) => (
                                            <CommandItem key={u.id} value={String(u.id)} onSelect={() => select(u)}>
                                                <div className="min-w-0">
                                                    <p className="font-medium">{u.firstName} {u.lastName}</p>
                                                    <p className="truncate text-xs text-muted-foreground">
                                                        {u.email} · tessera n. {u.id}
                                                    </p>
                                                </div>
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                )}
                            </CommandList>
                        </Command>
                    </PopoverContent>
                </Popover>
                <Button type="button" variant="outline" size="icon" className="shrink-0"
                        onClick={() => setScannerOpen(true)} aria-label="Scansiona tessera">
                    <QrCode className="h-4 w-4" />
                </Button>
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <CodeScannerDialog open={scannerOpen} onClose={() => setScannerOpen(false)} onScan={handleScan} type="qr" />
        </div>
    );
}
