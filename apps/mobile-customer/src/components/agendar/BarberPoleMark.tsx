import Svg, { Defs, Pattern, Rect, G } from 'react-native-svg';
import { colors } from '../../theme';

export function BarberPoleMark() {
  return (
    <Svg width={26} height={40} viewBox="0 0 26 40">
      <Defs>
        <Pattern
          id="p"
          width={12}
          height={12}
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <Rect width={12} height={12} fill={colors.papel} />
          <Rect width={12} height={3} fill={colors.vermelho} />
          <Rect y={6} width={12} height={3} fill={colors.navy} />
        </Pattern>
      </Defs>
      <Rect
        x={6}
        y={2}
        width={14}
        height={36}
        rx={7}
        fill="url(#p)"
        stroke={colors.dourado}
        strokeWidth={1.4}
      />
    </Svg>
  );
}
