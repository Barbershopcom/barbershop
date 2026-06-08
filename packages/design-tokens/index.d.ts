export interface StatusColor {
  readonly base: string;
  readonly ink: string;
}

export declare const brand: {
  readonly navy: string;
  readonly vermelho: string;
  readonly dourado: string;
  readonly papel: string;
  readonly tinta: string;
};

export interface ThemeColors {
  readonly bg: string;
  readonly card: string;
  readonly tint: string;
  readonly ink: string;
  readonly muted: string;
  readonly green: string;
  readonly vermelhoInk: string;
  readonly hairline: string;
  readonly hairlineStrong: string;
  readonly frame?: string;
  readonly douradoInk?: string;
  readonly navyInk?: string;
}

export declare const themes: {
  readonly light: ThemeColors;
  readonly dark: ThemeColors;
  readonly admin: ThemeColors;
};

export declare const status: {
  readonly pendente: StatusColor;
  readonly confirmado: StatusColor;
  readonly concluido: StatusColor;
  readonly cancelado: StatusColor;
  readonly expirado: StatusColor;
  readonly noShow: StatusColor;
};

export declare const colors: {
  readonly background: string;
  readonly backgroundMuted: string;
  readonly card: string;
  readonly foreground: string;
  readonly foregroundSecondary: string;
  readonly foregroundMuted: string;
  readonly border: string;
  readonly brandBlue: string;
  readonly brandBlueForeground: string;
  readonly brandOrange: string;
  readonly brandOrangeForeground: string;
  readonly brandOrangeSoft: string;
  readonly navy: string;
  readonly vermelho: string;
  readonly dourado: string;
  readonly papel: string;
  readonly tinta: string;
  readonly 'navy-ink': string;
  readonly 'vermelho-ink': string;
  readonly 'dourado-ink': string;
  readonly destructive: string;
  readonly destructiveForeground: string;
  readonly success: string;
  readonly warning: string;
  readonly 'status-pendente': string;
  readonly 'status-confirmado': string;
  readonly 'status-concluido': string;
  readonly 'status-cancelado': string;
  readonly 'status-expirado': string;
  readonly 'status-no-show': string;
};

export declare const fontFamily: {
  readonly sans: string;
  readonly display: string;
  readonly serif: string;
};

export declare const fontWeight: {
  readonly regular: string;
  readonly medium: string;
  readonly semibold: string;
  readonly bold: string;
  readonly extrabold: string;
};

export declare const fontSize: {
  readonly xs: number;
  readonly sm: number;
  readonly base: number;
  readonly lg: number;
  readonly xl: number;
  readonly '2xl': number;
  readonly '3xl': number;
  readonly '4xl': number;
};

export declare const spacing: {
  readonly 1: number;
  readonly 2: number;
  readonly 3: number;
  readonly 4: number;
  readonly 6: number;
  readonly 8: number;
};

export declare const radius: {
  readonly sm: number;
  readonly md: number;
  readonly lg: number;
  readonly xl: number;
  readonly '2xl': number;
  readonly '3xl': number;
  readonly full: number;
};

export declare const shadows: {
  readonly sm: string;
  readonly md: string;
  readonly lg: string;
  readonly ring: string;
};
