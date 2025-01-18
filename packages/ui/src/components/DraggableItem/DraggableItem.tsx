import React from "react"
import { useDrag, useDrop } from "react-dnd"

interface DraggableItemProps {
  children: React.ReactNode
  index: number
  moveItem: (dragIndex: number, hoverIndex: number) => void
}

const ItemTypes = {
  CARD: "card",
}
const DraggableItem: React.FC<DraggableItemProps> = ({
  children,
  index,
  moveItem,
}) => {
  const ref = React.useRef<HTMLDivElement>(null)

  const [, drop] = useDrop({
    accept: ItemTypes.CARD,
    hover(item: any) {
      if (!ref.current) {
        return
      }
      const dragIndex = item.index
      const hoverIndex = index

      // Don't replace items with themselves
      if (dragIndex === hoverIndex) {
        return
      }

      // Move the item
      moveItem(dragIndex, hoverIndex)

      // Note: we're mutating the monitor item here!
      // Generally it's better to avoid mutations,
      // but it's good here for the sake of performance
      // to avoid expensive index searches.
      item.index = hoverIndex
    },
  })

  const [{ isDragging }, drag] = useDrag({
    type: ItemTypes.CARD,
    item: { type: ItemTypes.CARD, index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  })

  const opacity = isDragging ? 0 : 1
  drag(drop(ref))

  return (
    <div
      ref={ref}
      style={{
        opacity,
        cursor: "move",
      }}
    >
      {children}
    </div>
  )
}

export default DraggableItem
