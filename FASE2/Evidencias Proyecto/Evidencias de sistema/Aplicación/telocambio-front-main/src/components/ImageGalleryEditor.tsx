import React, { useRef } from "react";
import { Plus, X, GripVertical } from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import type { DropResult } from "@hello-pangea/dnd";

type ImageItem = {
  id?: number;
  url?: string;
  file?: File;
  preview?: string;
  posicion?: number;
};

type Props = {
  images: ImageItem[];
  max?: number;
  onChange: (imgs: ImageItem[]) => void;
};

export default function ImageGalleryEditor({ images, max = 4, onChange }: Props) {
  const fileInput = useRef<HTMLInputElement>(null);

  function handleAddFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    const mapped = files.map((f, idx) => ({
      file: f,
      preview: URL.createObjectURL(f),
      posicion: images.length + idx,
    }));
    onChange([...images, ...mapped].slice(0, max));
  }

  function handleDelete(i: number) {
    const clone = [...images];
    const removed = clone.splice(i, 1)[0];
    if (removed?.preview) URL.revokeObjectURL(removed.preview);
    onChange(clone.map((x, idx) => ({ ...x, posicion: idx })));
  }

  function handleReorder(result: DropResult) {
    if (!result.destination) return;
    const clone = Array.from(images);
    const [moved] = clone.splice(result.source.index, 1);
    clone.splice(result.destination.index, 0, moved);
    onChange(clone.map((x, idx) => ({ ...x, posicion: idx })));
  }

  return (
    <div className="relative w-full">
      <DragDropContext onDragEnd={handleReorder}>
        {/* IMPORTANTE: sin filtros/blur/transform en ancestros; área contenedora */}
        <div className="relative overflow-hidden w-full">
          <Droppable droppableId="images" direction="horizontal">
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="flex flex-wrap gap-3"
                style={{ width: "100%", minHeight: "9.5rem" }}
              >
                {images.map((img, i) => (
                  <Draggable key={`img-${i}`} draggableId={`img-${i}`} index={i}>
                    {(prov, snapshot) => (
                      <div
                        ref={prov.innerRef}
                        {...prov.draggableProps}
                        {...prov.dragHandleProps}
                        style={{
                          ...prov.draggableProps.style,
                          // mejora visual durante drag
                          zIndex: snapshot.isDragging ? 9999 : "auto",
                        }}
                        className={`relative group w-36 h-36 rounded-xl overflow-hidden border bg-white shadow-sm ${
                          snapshot.isDragging ? "ring-2 ring-blue-400 shadow-xl" : ""
                        }`}
                      >
                        <img
                          src={img.preview || img.url}
                          className="w-full h-full object-cover select-none"
                          alt={`imagen-${i}`}
                          draggable={false}
                        />
                        <button
                          type="button"
                          onClick={() => handleDelete(i)}
                          className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 hover:bg-black transition"
                          title="Eliminar"
                        >
                          <X size={16} />
                        </button>
                        <div className="absolute bottom-1 left-1 text-xs bg-black/50 text-white px-1.5 py-0.5 rounded">
                          #{i + 1}
                        </div>
                        <div className="absolute top-1 left-1 opacity-60 group-hover:opacity-100">
                          <GripVertical size={18} className="text-white" />
                        </div>
                      </div>
                    )}
                  </Draggable>
                ))}

                {images.length < max && (
                  <button
                    type="button"
                    onClick={() => fileInput.current?.click()}
                    className="flex items-center justify-center w-36 h-36 rounded-xl border-2 border-dashed border-gray-300 hover:border-blue-500 text-gray-400 hover:text-blue-500 transition bg-white"
                  >
                    <Plus size={28} />
                  </button>
                )}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </div>
      </DragDropContext>

      <input
        type="file"
        accept="image/*"
        multiple
        ref={fileInput}
        onChange={handleAddFiles}
        hidden
      />
      <p className="text-xs text-gray-500 mt-2">
        Arrastra para cambiar el orden • Máx {max} imágenes • JPG/PNG/WEBP (≤5 MB)
      </p>
    </div>
  );
}
