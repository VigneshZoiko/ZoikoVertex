declare module "emoji-picker-react" {
  import { ReactNode, CSSProperties } from "react";

  export type SuggestionMode = "recent" | "frequent";
  export type EmojiStyle = "apple" | "google" | "twitter" | "native" | "facebook";
  export type Theme = "light" | "dark" | "auto";
  export type SkinTones =
    | "neutral"
    | "1f3fb"
    | "1f3fc"
    | "1f3fd"
    | "1f3fe"
    | "1f3ff";
  export type Categories =
    | "smileys_people"
    | "animals_nature"
    | "food_drink"
    | "travel_places"
    | "activities"
    | "objects"
    | "symbols"
    | "flags";
  export type SkinTonePickerLocation = "SEARCH" | "PREVIEW";

  export interface PickerProps {
    onEmojiClick?: (emojiData: EmojiClickData, event?: MouseEvent) => void;
    onReactionClick?: (emojiData: EmojiClickData, event?: MouseEvent) => void;
    onSkinToneChange?: (skinTone: SkinTones) => void;
    emojiStyle?: EmojiStyle;
    theme?: Theme;
    suggestedEmojisMode?: SuggestionMode;
    skinTonesDisabled?: boolean;
    searchPlaceholder?: string;
    searchPlaceHolder?: string;
    defaultSkinTone?: SkinTones;
    skinTonePickerLocation?: SkinTonePickerLocation;
    autoFocusSearch?: boolean;
    width?: number | string;
    height?: number | string;
    lazyLoadEmojis?: boolean;
    previewConfig?: {
      defaultCaption?: string;
      showPreview?: boolean;
    };
    open?: boolean;
    className?: string;
    style?: CSSProperties;
    reactionsDefaultOpen?: boolean;
    allowExpandReactions?: boolean;
  }

  export interface EmojiClickData {
    activeSkinTone: SkinTones;
    unified: string;
    unifiedWithoutSkinTone: string;
    emoji: string;
    names: string[];
    getImageUrl: (emojiStyle?: EmojiStyle) => string;
  }

  declare const EmojiPicker: (props: PickerProps) => ReactNode;
  export default EmojiPicker;

  export function emojiByUnified(unified: string): string | undefined;
  export const Emoji: (props: {
    unified: string;
    emojiStyle?: EmojiStyle;
    size?: number;
    lazyLoad?: boolean;
  }) => ReactNode;
}
