import { Extension, type AnyExtension } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { Underline } from '@tiptap/extension-underline'
import { TextStyle, Color, FontSize } from '@tiptap/extension-text-style'

export { RICH_TEXT_COLORS, RICH_TEXT_SIZES } from './richTextConstants'

// Le schéma reste à un seul paragraphe (le HTML restreint compatible email n'a pas de
// notion de bloc) — Entrée insère un <br> (autorisé par le sanitizer) plutôt que de
// scinder en un nouveau paragraphe.
const EnterAsBreak = Extension.create({
  name: 'enterAsBreak',
  addKeyboardShortcuts() {
    return { Enter: () => this.editor.commands.setHardBreak() }
  },
})

export function createRichTextExtensions(): AnyExtension[] {
  return [
    StarterKit.configure({
      heading: false,
      bulletList: false,
      orderedList: false,
      listItem: false,
      blockquote: false,
      codeBlock: false,
      horizontalRule: false,
      strike: false,
      code: false,
      dropcursor: false,
      gapcursor: false,
    }),
    Underline,
    TextStyle,
    Color,
    FontSize,
    EnterAsBreak,
  ]
}
