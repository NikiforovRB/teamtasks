import { useEffect, useRef } from 'react'
import { CSS } from '@dnd-kit/utilities'
import { useSortable } from '@dnd-kit/sortable'
import { cn } from '../../utils/cn'
import type { TaskCardModel } from './TaskCard'
import { TaskCard } from './TaskCard'

export function SortableTaskItem({
  task,
  containerId,
  showInsertLine,
  onOpen,
}: {
  task: TaskCardModel
  containerId: string
  showInsertLine: boolean
  onOpen: (taskId: string) => void
}) {
  const justDraggedRef = useRef(false)
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({
      id: task.id,
      data: { containerId },
    })

  useEffect(() => {
    if (isDragging) justDraggedRef.current = true
    else {
      const t = setTimeout(() => {
        justDraggedRef.current = false
      }, 150)
      return () => clearTimeout(t)
    }
  }, [isDragging])

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'relative',
        isDragging && 'z-10 opacity-80',
        showInsertLine && 'before:absolute before:left-0 before:top-0 before:h-[2px] before:w-full before:bg-[#5A86EE] before:z-[1]',
      )}
      {...attributes}
      {...listeners}
      onClick={() => {
        if (!justDraggedRef.current) onOpen(task.id)
      }}
    >
      <TaskCard task={task} />
    </div>
  )
}

