<?php
require_once __DIR__ . '/helpers.php';

$user = require_login();
$pdo = db();

$userId = (int)$user['user_id'];
$method = $_SERVER['REQUEST_METHOD'];

function backup_code(): string
{
    $chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    $chunks = [];
    for ($i = 0; $i < 3; $i++) {
        $chunk = '';
        for ($j = 0; $j < 4; $j++) {
            $chunk .= $chars[random_int(0, strlen($chars) - 1)];
        }
        $chunks[] = $chunk;
    }
    return implode('-', $chunks);
}

function store_backup_codes(PDO $pdo, int $userId, array $codes): void
{
    $pdo->prepare('UPDATE security_settings SET backup_codes = ?, backup_codes_used = 0 WHERE user_id = ?')
        ->execute([implode(',', $codes), $userId]);
}

if ($method === 'POST') {
    $data = body_json();
    $action = trim((string)($data['action'] ?? ''));

    if ($action === 'toggle_2fa') {
        $enabled = (bool)($data['enabled'] ?? false);
        $pdo->prepare(
            'UPDATE security_settings
             SET two_factor_enabled = ?, last_security_check = CURDATE()
             WHERE user_id = ?'
        )->execute([$enabled ? 1 : 0, $userId]);
        log_action($pdo, $userId, '2FA', $enabled ? 'Enabled two-factor authentication' : 'Disabled two-factor authentication');
        json_out(['ok' => true, 'twoFactorEnabled' => $enabled]);
    }

    if ($action === 'toggle_login_notifications') {
        $enabled = (bool)($data['enabled'] ?? false);
        $pdo->prepare('UPDATE security_settings SET login_notifications_enabled = ? WHERE user_id = ?')
            ->execute([$enabled ? 1 : 0, $userId]);
        log_action($pdo, $userId, 'LOGIN_NOTIFICATIONS', $enabled ? 'Enabled login notifications' : 'Disabled login notifications');
        json_out(['ok' => true, 'loginNotifications' => $enabled]);
    }

    if ($action === 'view_backup_codes') {
        $row = $pdo->prepare('SELECT backup_codes FROM security_settings WHERE user_id = ?');
        $row->execute([$userId]);
        $stored = (string)$row->fetchColumn();
        $codes = $stored !== '' ? explode(',', $stored) : [];
        if (count($codes) < 10) {
            $codes = [];
            for ($i = 0; $i < 10; $i++) {
                $codes[] = backup_code();
            }
            store_backup_codes($pdo, $userId, $codes);
        }
        log_action($pdo, $userId, 'BACKUP_CODES', 'Viewed backup codes');
        json_out(['ok' => true, 'codes' => $codes]);
    }

    if ($action === 'regenerate_backup_codes') {
        $codes = [];
        for ($i = 0; $i < 10; $i++) {
            $codes[] = backup_code();
        }
        store_backup_codes($pdo, $userId, $codes);
        log_action($pdo, $userId, 'BACKUP_CODES', 'Regenerated backup codes');
        json_out(['ok' => true, 'codes' => $codes]);
    }

    json_error('Action must be one of: toggle_2fa, toggle_login_notifications, view_backup_codes, regenerate_backup_codes.', 422);
}

if ($method !== 'GET') {
    json_error('Method not allowed.', 405);
}

json_out([
    'settings' => security_settings_for($pdo, $userId),
    'sessions' => login_sessions_for($pdo, $userId),
    'activity' => user_activity_for($pdo, $userId),
    'preferences' => preferences_for($pdo, $userId),
]);