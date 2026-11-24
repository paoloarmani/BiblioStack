import { useState } from "react";
import { Loader2, Plus, X } from "lucide-react";
import { Label } from "@/components/ui/label.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { Button } from "@/components/ui/button.jsx";
import {
    Command,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command.jsx";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover.jsx";
import api from "@/api/axios.js";
import { useDebouncedSearch } from "@/hooks/useDebouncedSearch.js";

const searchSubjects = async (term) =>
    (await api.get("/subjects/search", { params: { search: term, limit: 8 } })).data.data;

const normalize = (name) => name.trim().replace(/\s+/g, " ");

// Campo per i soggetti di un'opera: etichette rimovibili + suggerimenti dai soggetti esistenti.
// value/onChange lavorano con i NOMI: quelli nuovi vengono creati dal backend al salvataggio.
export default function SubjectsField({ value = [], onChange, error }) {
    const [open, setOpen] = useState(false);
    const { term, search, clear, results, loading } = useDebouncedSearch(searchSubjects);

    const has = (name) => value.some(v => v.toLowerCase() === normalize(name).toLowerCase());

    const add = (name) => {
        const clean = normalize(name);
        if (clean && !has(clean)) onChange([...value, clean]);
        clear(); // il popover resta aperto: si possono aggiungere più soggetti di seguito
    };

    const remove = (name) => onChange(value.filter(v => v !== name));

    const typed = normalize(term);
    const visible = results.filter(s => !has(s.name));
    const canCreate = !!typed && !has(typed) && !visible.some(s => s.name.toLowerCase() === typed.toLowerCase());

    return (
        <div className="space-y-1.5">
            <Label htmlFor="subjects-trigger">Soggetti</Label>
            <p className="text-xs text-muted-foreground">
                Argomenti trattati (es. Urbanistica, Trentino). I soggetti nuovi vengono creati al salvataggio.
            </p>

            <div className="flex flex-wrap items-center gap-2">
                {value.map(name => (
                    <Badge key={name} variant="secondary" className="h-7 gap-1 pr-1 text-sm font-normal">
                        {name}
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 rounded-full"
                            onClick={() => remove(name)}
                            aria-label={`Rimuovi ${name}`}
                        >
                            <X className="h-3 w-3" />
                        </Button>
                    </Badge>
                ))}

                <Popover open={open} onOpenChange={(isOpen) => { setOpen(isOpen); if (!isOpen) clear(); }}>
                    <PopoverTrigger asChild>
                        <Button
                            id="subjects-trigger"
                            type="button"
                            variant="outline"
                            size="sm"
                            role="combobox"
                            aria-expanded={open}
                            aria-invalid={!!error}
                            className="h-7"
                        >
                            <Plus className="h-3.5 w-3.5" />
                            Aggiungi soggetto
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-72 p-0" align="start">
                        {/* shouldFilter disattivato: il filtro lo fa il server */}
                        <Command shouldFilter={false}>
                            <CommandInput
                                placeholder="Cerca o crea un soggetto..."
                                value={term}
                                onValueChange={search}
                            />
                            <CommandList>
                                {loading && (
                                    <div className="flex justify-center py-3">
                                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                    </div>
                                )}
                                {!typed && (
                                    <p className="py-6 text-center text-sm text-muted-foreground">
                                        Digita per cercare tra i soggetti esistenti
                                    </p>
                                )}
                                {typed && (visible.length > 0 || canCreate) && (
                                    <CommandGroup>
                                        {visible.map(s => (
                                            <CommandItem key={s.id} value={`s-${s.id}`} onSelect={() => add(s.name)}>
                                                {s.name}
                                            </CommandItem>
                                        ))}
                                        {canCreate && (
                                            <CommandItem value="__create__" onSelect={() => add(typed)}
                                                         className="text-muted-foreground">
                                                <Plus />
                                                Crea «{typed}»
                                            </CommandItem>
                                        )}
                                    </CommandGroup>
                                )}
                            </CommandList>
                        </Command>
                    </PopoverContent>
                </Popover>
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
    );
}
