import { Bell } from 'lucide-react-native';
import { Text, View } from 'react-native';

interface HeaderProps {
  caption: string;
  title: string;
  /** Letra (ou par) pra mostrar no avatar circular. Ex: 'J' ou 'JR'. */
  avatarInitial: string;
}

/**
 * Header padrão das telas autenticadas (Figma):
 * [Avatar circular] | Caption (cinza pequeno)             [ Sino ]
 *                   | Título (preto médio, **Nome!** bold)
 *
 * Avatar usa iniciais (Employee.displayName não tem photo_url ainda).
 */
export function Header({ caption, title, avatarInitial }: HeaderProps) {
  return (
    <View className="flex-row items-center justify-between bg-background-muted px-6 pb-4 pt-12">
      <View className="flex-1 flex-row items-center gap-3">
        <View className="h-11 w-11 items-center justify-center rounded-full border border-border bg-background">
          <Text className="text-base font-semibold text-foreground">{avatarInitial}</Text>
        </View>
        <View className="flex-1">
          <Text className="text-xs text-foreground-muted">{caption}</Text>
          <Text className="text-base font-medium text-foreground" numberOfLines={1}>
            {title}
          </Text>
        </View>
      </View>
      <View className="h-9 w-9 items-center justify-center rounded-full">
        <Bell size={20} color="#3f3a33" />
      </View>
    </View>
  );
}

/** Helper pra extrair iniciais de um displayName. */
export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  const first = parts[0].charAt(0);
  const last = parts[parts.length - 1]?.charAt(0) ?? '';
  return (first + last).toUpperCase();
}
