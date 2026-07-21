'use client'

import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Trash2, Plus, Type, AlignLeft, Image as ImageIcon, MousePointerClick, MoveVertical } from 'lucide-react'
import type { NewsletterBlock } from '@/lib/types/database'
import { createBlock, BLOCK_LABELS, BLOCK_TYPES } from '@/lib/newsletter/blocks'
import { TitleBlockEditor } from './blocks/TitleBlockEditor'
import { ParagraphBlockEditor } from './blocks/ParagraphBlockEditor'
import { ImageBlockEditor } from './blocks/ImageBlockEditor'
import { ButtonBlockEditor } from './blocks/ButtonBlockEditor'
import { SpacerBlockEditor } from './blocks/SpacerBlockEditor'

const BLOCK_ICONS: Record<NewsletterBlock['type'], typeof Type> = {
  title: Type,
  paragraph: AlignLeft,
  image: ImageIcon,
  button: MousePointerClick,
  spacer: MoveVertical,
}

interface BlockEditorProps {
  blocks: NewsletterBlock[]
  onChange: (blocks: NewsletterBlock[]) => void
  disabled?: boolean
}

export function BlockEditor({ blocks, onChange, disabled }: BlockEditorProps) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = blocks.findIndex(b => b.id === active.id)
    const newIndex = blocks.findIndex(b => b.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return
    onChange(arrayMove(blocks, oldIndex, newIndex))
  }

  function updateBlock(id: string, patch: Partial<NewsletterBlock>) {
    onChange(blocks.map(b => (b.id === id ? ({ ...b, ...patch } as NewsletterBlock) : b)))
  }

  function removeBlock(id: string) {
    onChange(blocks.filter(b => b.id !== id))
  }

  function addBlock(type: NewsletterBlock['type']) {
    onChange([...blocks, createBlock(type)])
  }

  return (
    <div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={blocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {blocks.map(block => (
              <SortableBlock key={block.id} block={block} onUpdate={updateBlock} onRemove={removeBlock} disabled={disabled} />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {blocks.length === 0 && (
        <div className="text-center text-sm text-gray-400 border border-dashed border-gray-200 rounded-xl py-10">
          Aucun bloc — ajoutez-en un ci-dessous.
        </div>
      )}

      {!disabled && (
        <div className="flex flex-wrap gap-2 mt-4">
          {BLOCK_TYPES.map(type => {
            const Icon = BLOCK_ICONS[type]
            return (
              <button
                key={type}
                type="button"
                onClick={() => addBlock(type)}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg px-3 py-2 hover:border-brand-orange hover:text-brand-orange transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <Icon className="w-3.5 h-3.5" />
                {BLOCK_LABELS[type]}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function SortableBlock({ block, onUpdate, onRemove, disabled }: {
  block: NewsletterBlock
  onUpdate: (id: string, patch: Partial<NewsletterBlock>) => void
  onRemove: (id: string) => void
  disabled?: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id, disabled })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }

  return (
    <div ref={setNodeRef} style={style} className="border border-gray-200 rounded-xl p-4 bg-white">
      <div className="flex items-center gap-2 mb-3">
        {!disabled && (
          <button type="button" {...attributes} {...listeners} className="cursor-grab text-gray-300 hover:text-gray-500 touch-none">
            <GripVertical className="w-4 h-4" />
          </button>
        )}
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{BLOCK_LABELS[block.type]}</span>
        {!disabled && (
          <button type="button" onClick={() => onRemove(block.id)} className="ml-auto text-gray-300 hover:text-red-500">
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
      <BlockBody block={block} onUpdate={onUpdate} disabled={disabled} />
    </div>
  )
}

function BlockBody({ block, onUpdate, disabled }: {
  block: NewsletterBlock
  onUpdate: (id: string, patch: Partial<NewsletterBlock>) => void
  disabled?: boolean
}) {
  switch (block.type) {
    case 'title':
      return <TitleBlockEditor block={block} onChange={patch => onUpdate(block.id, patch)} disabled={disabled} />
    case 'paragraph':
      return <ParagraphBlockEditor block={block} onChange={patch => onUpdate(block.id, patch)} disabled={disabled} />
    case 'image':
      return <ImageBlockEditor block={block} onChange={patch => onUpdate(block.id, patch)} disabled={disabled} />
    case 'button':
      return <ButtonBlockEditor block={block} onChange={patch => onUpdate(block.id, patch)} disabled={disabled} />
    case 'spacer':
      return <SpacerBlockEditor block={block} onChange={patch => onUpdate(block.id, patch)} disabled={disabled} />
    default:
      return null
  }
}
