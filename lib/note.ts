interface NoteInput {
  content?: string
  images?: string[]
}

export function createNestedNote(note?: NoteInput) {
  if (!note || (!note.content && (!note.images || note.images.length === 0))) {
    return undefined
  }

  return {
    create: {
      content: note.content || "",
      images: note.images || [],
    },
  }
}

