# Known Warnings

## expo-notifications SDK 53 Deprecation

- **Status:** Known, will address in future migration
- **Reason:** expo-notifications foi deprecated no Expo SDK 53, mas é necessário para push notifications (ADR-017 §6)
- **Impact:** Warning no console durante dev, não afeta funcionalidade
- **Plan:** Migrar para nova API quando Expo completar a transição (SDK 54+)
- **Files:** apps/mobile-business/src/lib/push.ts
