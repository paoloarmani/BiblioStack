import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { notify } from "@/lib/notify.js";
import { editItemSchema } from "@/features/items/management/schemas/editItem.schema.js";
import { handleApiError } from "@/lib/handleApiError.js";
import api from "@/api/axios.js";


export function useEditItem(item, open, onSuccess) {
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const form = useForm({
        resolver: zodResolver(editItemSchema),
        defaultValues: {
            locationId: null,
            shelfMark: "",
            notLoanable: false,
            currencyCode: null,
            acquisitionDate: null,
            price: null,
            status: null
        },
    });

    // Ripopola il form ogni volta che il dialog si apre su un item diverso
    useEffect(() => {
        if (!item || !open) return;
        form.reset({
            locationId: item.location?.id ?? null,
            shelfMark: item.shelfMark ?? "",
            notLoanable: item.loanable === false,
            currencyCode: item.currencyCode ?? null,
            acquisitionDate: item.acquisitionDate
                ? new Date(item.acquisitionDate).toISOString().split("T")[0]
                : null,
            price: item.price ?? null,
            status: item.status
        });
    }, [item, open, form]);

    const submit = async () => {
        const values = form.getValues();
        setLoading(true);
        try {
            const { notLoanable, ...rest } = values;
            await api.patch(`/items/${encodeURIComponent(item.id)}`, {
                ...rest,
                loanable: !notLoanable,
                shelfMark: values.shelfMark?.trim() || null,
                price: values.price ? parseFloat(values.price) : null,
            });

            notify.success("Copia aggiornata con successo!");
            onSuccess?.();
            return true;
        } catch (err) {
            handleApiError(err, navigate);
            return false;
        } finally {
            setLoading(false);
        }
    };

    return { form, loading, submit };
}