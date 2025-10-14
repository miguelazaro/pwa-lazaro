type NotificationPermissionName = 'notifications';

type NotificationPermissionDescriptor = {
    name: NotificationPermissionName;
};

type MinimalPermissions = {
    query(
        descriptor: NotificationPermissionDescriptor
    ): Promise<PermissionStatus>;
};

type NavigatorWithMinimalPermissions = Navigator & {
    permissions?: MinimalPermissions;
};

/**
 * Observa cambios del permiso de notificaciones y ejecuta `onChange`
 */
export function watchNotificationPermission(
    onChange: (perm: NotificationPermission) => void
): void {
    try {
        const nav = navigator as NavigatorWithMinimalPermissions;
        const perms = nav.permissions;
        if (!perms || typeof perms.query !== 'function') return;

        perms
            .query({ name: 'notifications' })
            .then((status) => {
                status.onchange = () => onChange(Notification.permission);
            })
            .catch(() => {
            });
    } catch {
        // Ignorar navegadores raros o contextos sin permisos
    }
}
