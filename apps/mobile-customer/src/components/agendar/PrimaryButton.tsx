import { Pressable, Text, StyleSheet } from 'react-native';
import { colors, fonts, radius, space } from '../../theme';

export function PrimaryButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      style={[s.btn, disabled ? s.btnDisabled : s.btnActive]}
    >
      <Text style={[s.label, disabled && s.labelDisabled]}>{label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  btn: {
    height: 56,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnActive: {
    backgroundColor: colors.navy,
    shadowColor: colors.navy,
    shadowOpacity: 0.22,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  btnDisabled: { backgroundColor: colors.tint },
  label: { fontFamily: fonts.uiBold, fontSize: 16, color: '#fff' },
  labelDisabled: { color: colors.muted },
});
