import { useState } from "react";
import { Link } from "react-router-dom";
import { IdCard, KeyRound, Mail, Phone, Shield } from "lucide-react";
import { roleLabels } from "@/features/users/management/table/usersTable.constants.js";
import { Avatar, AvatarFallback } from "@/components/ui/avatar.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { Button } from "@/components/ui/button.jsx";
import { useChangePassword } from "@/features/users/profile/hooks/useChangePassword.js";
import ConfirmDialog from "@/components/common/dialogs/ConfirmDialog.jsx";
import SuspensionAlert from "@/features/users/profile/components/SuspensionAlert.jsx";

// Intestazione compatta del profilo: chi sono, contatti e azioni rapide
export default function ProfileHero({ user }) {
    const [confirmOpen, setConfirmOpen] = useState(false);
    const { sendChangePasswordLink } = useChangePassword();

    const initials = `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`.toUpperCase();

    const handleConfirmPasswordReset = async () => {
        const success = await sendChangePasswordLink(user.email);
        if (success) setConfirmOpen(false);
    };

    return (
        <>
            <section className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                    <Avatar className="h-16 w-16 shrink-0 rounded-2xl">
                        <AvatarFallback className="rounded-2xl bg-primary/10 text-xl font-semibold text-primary">
                            {initials}
                        </AvatarFallback>
                    </Avatar>

                    <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                            <h1 className="text-2xl font-semibold tracking-tight">
                                {user.firstName} {user.lastName}
                            </h1>
                            <Badge variant="secondary" className="gap-1">
                                <Shield className="h-3 w-3" />
                                {roleLabels[user.role] ?? user.role}
                            </Badge>
                        </div>
                        <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
                            {user.email && (
                                <span className="flex min-w-0 items-center gap-1.5">
                                    <Mail className="h-4 w-4 shrink-0" />
                                    <span className="truncate">{user.email}</span>
                                </span>
                            )}
                            {user.phone && (
                                <span className="flex items-center gap-1.5">
                                    <Phone className="h-4 w-4 shrink-0" />
                                    {user.phone}
                                </span>
                            )}
                            <span className="flex items-center gap-1.5">
                                <IdCard className="h-4 w-4 shrink-0" />
                                Tessera n. {user.id}
                            </span>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2 sm:flex-col sm:items-stretch lg:flex-row">
                        <Button asChild variant="default" size="sm" className="gap-2">
                            <Link to="/card">
                                <IdCard className="h-4 w-4" />
                                La mia tessera
                            </Link>
                        </Button>
                        <Button variant="outline" size="sm" className="gap-2" onClick={() => setConfirmOpen(true)}>
                            <KeyRound className="h-4 w-4" />
                            Cambia password
                        </Button>
                    </div>
                </div>

                <SuspensionAlert suspension={user.suspension} />
            </section>

            <ConfirmDialog
                open={confirmOpen}
                onClose={() => setConfirmOpen(false)}
                onConfirm={handleConfirmPasswordReset}
                title="Richiedi cambio password"
                description={`Vuoi inviare un'email all'indirizzo ${user.email} con le istruzioni per cambiare la password?`}
                confirmLabel="Invia richiesta"
                cancelLabel="Annulla"
            />
        </>
    );
}
